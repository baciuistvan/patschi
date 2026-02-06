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

    // Final availability check to prevent overbooking
    if (selected_tables && Array.isArray(selected_tables) && selected_tables.length > 0) {
      // Calculate time window for the reservation
      const requestedStartTime = new Date(`${reservation_date}T${reservation_time}`);
      const requestedEndTime = new Date(requestedStartTime.getTime() + (duration_minutes || 120) * 60000);

      // Check each table for conflicts
      for (const tableId of selected_tables) {
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

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .insert(reservationData)
      .select()
      .single();

    if (reservationError) {
      throw reservationError;
    }

    // Link tables if provided
    if (selected_tables && Array.isArray(selected_tables) && selected_tables.length > 0) {
      const tableLinks = selected_tables.map(tableId => ({
        reservation_id: reservation.id,
        table_id: tableId
      }));

      const { error: tablesError } = await supabase
        .from("reservation_tables")
        .insert(tableLinks);

      if (tablesError) {
        console.error('Error linking tables:', tablesError);
        // Don't throw - reservation is already created
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
