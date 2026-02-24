import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateBookingCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      customer_name,
      customer_email,
      customer_phone,
      party_size,
      reservation_date,
      reservation_time,
      duration_minutes,
      status,
      special_requests,
      payment_status,
      payment_amount,
      payment_method,
      stripe_payment_intent_id,
      booking_method,
      selected_tables,
      room_id
    } = await req.json();

    // Validation
    if (!customer_name || !customer_email || !reservation_date || !reservation_time || !party_size) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Server-side same-day cutoff check
    const nowUtc = new Date();
    const viennaFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Vienna',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
    const viennaParts = viennaFormatter.formatToParts(nowUtc);
    const viennaDateStr = `${viennaParts.find(p => p.type === 'year')!.value}-${viennaParts.find(p => p.type === 'month')!.value}-${viennaParts.find(p => p.type === 'day')!.value}`;
    const viennaHour = parseInt(viennaParts.find(p => p.type === 'hour')!.value, 10);
    const viennaMinute = parseInt(viennaParts.find(p => p.type === 'minute')!.value, 10);
    const viennaTimeInMinutes = viennaHour * 60 + viennaMinute;

    if (reservation_date === viennaDateStr && viennaTimeInMinutes >= 12 * 60) {
      return new Response(
        JSON.stringify({
          error: 'Reservierungen für heute sind nur bis 12:00 Uhr möglich. Bitte wählen Sie ein Datum ab morgen.',
          reason: 'closed_today'
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let finalSelectedTables = selected_tables;

    if (!finalSelectedTables || !Array.isArray(finalSelectedTables) || finalSelectedTables.length === 0) {
      console.log('[create-reservation] No tables provided, auto-selecting...');
      const { data: candidateTables, error: candidateError } = await supabase
        .from('tables')
        .select('id, table_number, capacity')
        .eq('room_id', room_id)
        .eq('is_active', true)
        .eq('is_bookable', true)
        .gt('capacity', 0)
        .order('capacity', { ascending: false });

      if (candidateError || !candidateTables || candidateTables.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'Keine passenden Tische verfügbar. Bitte prüfen Sie die Verfügbarkeit erneut.',
            reason: 'no_tables'
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const requestedStartAuto = new Date(`${reservation_date}T${reservation_time}`);
      const requestedEndAuto = new Date(requestedStartAuto.getTime() + (duration_minutes || 120) * 60000);

      const freeTables: { id: string; capacity: number }[] = [];
      for (const table of candidateTables) {
        const { data: conflicts } = await supabase
          .from('reservation_tables')
          .select(`
            reservation_id,
            reservations!inner (
              reservation_time,
              reservation_date,
              duration_minutes,
              status
            )
          `)
          .eq('table_id', table.id)
          .eq('reservations.reservation_date', reservation_date)
          .in('reservations.status', ['confirmed', 'pending']);

        let isFree = true;
        if (conflicts && conflicts.length > 0) {
          for (const c of conflicts) {
            const res = c.reservations as any;
            const eStart = new Date(`${res.reservation_date}T${res.reservation_time}`);
            const eEnd = new Date(eStart.getTime() + (res.duration_minutes || 120) * 60000);
            if (
              (requestedStartAuto >= eStart && requestedStartAuto < eEnd) ||
              (requestedEndAuto > eStart && requestedEndAuto <= eEnd) ||
              (requestedStartAuto <= eStart && requestedEndAuto >= eEnd)
            ) {
              isFree = false;
              break;
            }
          }
        }
        if (isFree) {
          freeTables.push({ id: table.id, capacity: table.capacity });
        }
      }

      if (freeTables.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'Alle passenden Tische sind bereits belegt. Bitte wählen Sie ein anderes Datum.',
            reason: 'fully_booked'
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const exactFit = [...freeTables].sort((a, b) => a.capacity - b.capacity).find(t => t.capacity >= party_size);
      const bestTable = exactFit || freeTables[0];
      finalSelectedTables = [bestTable.id];
      console.log('[create-reservation] Auto-selected table:', bestTable.id);
    }

    // Validate selected tables belong to the correct room
    if (room_id && finalSelectedTables && Array.isArray(finalSelectedTables) && finalSelectedTables.length > 0) {
      const { data: validTables, error: validError } = await supabase
        .from('tables')
        .select('id')
        .eq('room_id', room_id)
        .in('id', finalSelectedTables);

      if (validError) {
        console.error('[create-reservation] Error validating table room:', validError);
      } else if (!validTables || validTables.length !== finalSelectedTables.length) {
        console.log('[create-reservation] Table-room mismatch detected, re-selecting...');
        const { data: candidateTables } = await supabase
          .from('tables')
          .select('id, table_number, capacity')
          .eq('room_id', room_id)
          .eq('is_active', true)
          .eq('is_bookable', true)
          .gt('capacity', 0)
          .order('capacity', { ascending: false });

        if (candidateTables && candidateTables.length > 0) {
          const requestedStartFix = new Date(`${reservation_date}T${reservation_time}`);
          const requestedEndFix = new Date(requestedStartFix.getTime() + (duration_minutes || 120) * 60000);

          const freeTablesForRoom: { id: string; capacity: number }[] = [];
          for (const table of candidateTables) {
            const { data: conflicts } = await supabase
              .from('reservation_tables')
              .select(`reservation_id, reservations!inner (reservation_time, reservation_date, duration_minutes, status)`)
              .eq('table_id', table.id)
              .eq('reservations.reservation_date', reservation_date)
              .in('reservations.status', ['confirmed', 'pending']);

            let isFree = true;
            if (conflicts && conflicts.length > 0) {
              for (const c of conflicts) {
                const res = c.reservations as any;
                const eStart = new Date(`${res.reservation_date}T${res.reservation_time}`);
                const eEnd = new Date(eStart.getTime() + (res.duration_minutes || 120) * 60000);
                if (
                  (requestedStartFix >= eStart && requestedStartFix < eEnd) ||
                  (requestedEndFix > eStart && requestedEndFix <= eEnd) ||
                  (requestedStartFix <= eStart && requestedEndFix >= eEnd)
                ) { isFree = false; break; }
              }
            }
            if (isFree) freeTablesForRoom.push({ id: table.id, capacity: table.capacity });
          }

          if (freeTablesForRoom.length > 0) {
            const fit = [...freeTablesForRoom].sort((a, b) => a.capacity - b.capacity).find(t => t.capacity >= party_size);
            finalSelectedTables = [(fit || freeTablesForRoom[0]).id];
          } else {
            return new Response(
              JSON.stringify({ error: 'Alle Tische im gewählten Raum sind bereits belegt.', reason: 'fully_booked' }),
              { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    // Final availability check to prevent overbooking
    if (finalSelectedTables && Array.isArray(finalSelectedTables) && finalSelectedTables.length > 0) {
      const requestedStartTime = new Date(`${reservation_date}T${reservation_time}`);
      const requestedEndTime = new Date(requestedStartTime.getTime() + (duration_minutes || 120) * 60000);

      for (const tableId of finalSelectedTables) {
        const { data: existingReservations, error: checkError } = await supabase
          .from('reservation_tables')
          .select(`
            reservation_id,
            reservations!inner (
              reservation_time,
              reservation_date,
              duration_minutes,
              status
            )
          `)
          .eq('table_id', tableId)
          .eq('reservations.reservation_date', reservation_date)
          .in('reservations.status', ['confirmed', 'pending']);

        if (checkError) {
          console.error('Error checking for conflicts:', checkError);
          throw new Error('Failed to verify table availability');
        }

        // Check for time overlaps
        if (existingReservations && existingReservations.length > 0) {
          for (const existing of existingReservations) {
            const res = existing.reservations as any;
            const existingStartTime = new Date(`${res.reservation_date}T${res.reservation_time}`);
            const existingEndTime = new Date(existingStartTime.getTime() + (res.duration_minutes || 120) * 60000);

            // Check for time overlap
            if (
              (requestedStartTime >= existingStartTime && requestedStartTime < existingEndTime) ||
              (requestedEndTime > existingStartTime && requestedEndTime <= existingEndTime) ||
              (requestedStartTime <= existingStartTime && requestedEndTime >= existingEndTime)
            ) {
              return new Response(
                JSON.stringify({
                  error: 'Dieser Tisch ist für die gewählte Zeit bereits gebucht. Bitte wählen Sie ein anderes Datum oder kontaktieren Sie uns direkt.',
                  reason: 'table_conflict'
                }),
                {
                  status: 409,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
              );
            }
          }
        }
      }
    }

    // Generate unique booking code
    const booking_code = generateBookingCode();

    // Create reservation
    const reservationData: any = {
      customer_name,
      customer_email,
      customer_phone: customer_phone || '',
      party_size,
      reservation_date,
      reservation_time,
      duration_minutes: duration_minutes || 120,
      status: status || 'confirmed',
      special_requests: special_requests || '',
      payment_status: payment_status || 'unpaid',
      payment_amount: payment_amount || 0,
      payment_method: payment_method || 'none',
      booking_method: booking_method || 'manual',
      booking_code
    };

    // Add optional fields if provided
    if (stripe_payment_intent_id) {
      reservationData.stripe_payment_intent_id = stripe_payment_intent_id;
    }
    if (room_id) {
      reservationData.room_id = room_id;
    }

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .insert(reservationData)
      .select('*')
      .single();

    if (reservationError) {
      throw reservationError;
    }

    // Link tables — required, throw on failure so the reservation is not left without a table
    const tableLinks = finalSelectedTables.map((tableId: string) => ({
      reservation_id: reservation.id,
      table_id: tableId
    }));

    const { error: tablesError } = await supabase
      .from("reservation_tables")
      .insert(tableLinks);

    if (tablesError) {
      console.error('Error linking tables:', tablesError);
      // Roll back the reservation so there are no orphaned records
      await supabase.from("reservations").delete().eq("id", reservation.id);
      throw new Error('Tischzuweisung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    }

    // Update Stripe PaymentIntent metadata with booking code
    if (stripe_payment_intent_id) {
      try {
        const { data: stripeSettings } = await supabase
          .from("settings")
          .select("key, value")
          .in("key", ["stripe_mode", "stripe_live_secret_key", "stripe_test_secret_key"]);

        const stripeSettingsMap: Record<string, string> = {};
        stripeSettings?.forEach((s: any) => stripeSettingsMap[s.key] = s.value);

        const stripeMode = stripeSettingsMap["stripe_mode"] || "test";
        const stripeSecretKey = stripeMode === "live"
          ? stripeSettingsMap["stripe_live_secret_key"]
          : stripeSettingsMap["stripe_test_secret_key"];

        if (stripeSecretKey) {
          // Look up table numbers for the assigned tables
          let tableNumbers = '';
          if (finalSelectedTables && finalSelectedTables.length > 0) {
            const { data: tableRows } = await supabase
              .from('tables')
              .select('table_number')
              .in('id', finalSelectedTables);
            if (tableRows && tableRows.length > 0) {
              tableNumbers = tableRows.map((t: any) => t.table_number).filter(Boolean).join(', ');
            }
          }

          const metadataParams: Record<string, string> = {
            "metadata[booking_code]": booking_code,
            "metadata[reservation_id]": reservation.id,
          };
          if (tableNumbers) {
            metadataParams["metadata[table_numbers]"] = tableNumbers;
          }

          await fetch(`https://api.stripe.com/v1/payment_intents/${stripe_payment_intent_id}`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(metadataParams).toString(),
          });
        }
      } catch (stripeUpdateError) {
        console.error("Failed to update Stripe PaymentIntent metadata:", stripeUpdateError);
      }
    }

    // Send confirmation email
    try {
      const emailApiUrl = `${supabaseUrl}/functions/v1/send-reservation-confirmation-email`;
      const emailResponse = await fetch(emailApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name,
          customer_email,
          reservation_date,
          reservation_time,
          party_size,
          special_requests: special_requests || '',
          payment_amount: payment_amount || 0,
          booking_code
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send confirmation email:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't throw - reservation is already created
    }

    return new Response(
      JSON.stringify({
        success: true,
        reservation,
        booking_code
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error creating reservation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create reservation' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
