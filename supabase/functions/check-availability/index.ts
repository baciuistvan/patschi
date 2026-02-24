import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { reservation_date, reservation_time, party_size, room_id } = body;
    console.log('[check-availability] Received request:', JSON.stringify({ reservation_date, reservation_time, party_size, room_id }));

    if (!reservation_date || !reservation_time || !party_size || !room_id) {
      return new Response(
        JSON.stringify({
          available: false,
          message: 'Fehlende erforderliche Felder',
          reason: 'invalid_request'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Server-side same-day cutoff: online reservations for today are only allowed before 12:00
    const nowUtc = new Date();
    const viennaOffset = 60; // Europe/Vienna is UTC+1 (winter) — using fixed offset; DST handled below
    const viennaTime = new Date(nowUtc.getTime() + viennaOffset * 60000);
    // More accurate: use Intl to get current Vienna time
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
          available: false,
          message: 'Reservierungen für heute sind nur bis 12:00 Uhr möglich. Bitte wählen Sie ein Datum ab morgen.',
          reason: 'closed_today'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[check-availability] Querying tables for room_id:', room_id);
    const { data: allTables, error: tablesError } = await supabase
      .from('tables')
      .select('id, table_number, capacity, room_id')
      .eq('room_id', room_id)
      .eq('is_active', true)
      .eq('is_bookable', true)
      .gt('capacity', 0)
      .order('capacity', { ascending: false });

    console.log('[check-availability] Found tables:', JSON.stringify(allTables?.map(t => ({ id: t.id, num: t.table_number, cap: t.capacity, room: t.room_id }))));

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return new Response(
        JSON.stringify({
          available: false,
          message: 'Fehler beim Abrufen der Tische',
          reason: 'database_error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!allTables || allTables.length === 0) {
      return new Response(
        JSON.stringify({
          available: false,
          message: `Leider haben wir keine verfügbaren Tische für ${party_size} Personen. Bitte kontaktieren Sie uns direkt.`,
          reason: 'capacity_exceeded'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate time window for the new reservation (2 hours)
    const requestedStart = new Date(`${reservation_date}T${reservation_time}`);
    const requestedEnd = new Date(requestedStart.getTime() + 120 * 60000);

    // Check which tables are free at the requested time
    const freeTables: typeof allTables = [];
    for (const table of allTables) {
      const { data: conflicts, error: conflictsError } = await supabase
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

      if (conflictsError) {
        console.error('Error checking conflicts for table', table.id, conflictsError);
        continue;
      }

      let isAvailable = true;

      if (conflicts && conflicts.length > 0) {
        for (const conflict of conflicts) {
          const res = conflict.reservations as any;
          const existingStart = new Date(`${res.reservation_date}T${res.reservation_time}`);
          const existingEnd = new Date(existingStart.getTime() + (res.duration_minutes || 120) * 60000);

          if (
            (requestedStart >= existingStart && requestedStart < existingEnd) ||
            (requestedEnd > existingStart && requestedEnd <= existingEnd) ||
            (requestedStart <= existingStart && requestedEnd >= existingEnd)
          ) {
            isAvailable = false;
            break;
          }
        }
      }

      if (isAvailable) {
        freeTables.push(table);
      }
    }

    if (freeTables.length === 0) {
      return new Response(
        JSON.stringify({
          available: false,
          message: 'An diesem Datum und dieser Uhrzeit sind alle Tische bereits gebucht. Bitte wählen Sie ein anderes Datum.',
          reason: 'fully_booked'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prefer smallest table that fits the party; if none fits exactly, use the largest available
    const exactFit = [...freeTables].sort((a, b) => a.capacity - b.capacity).find(t => t.capacity >= party_size);
    const bestTable = exactFit || freeTables[0];

    return new Response(
      JSON.stringify({
        available: true,
        selected_tables: [bestTable.id],
        tables_needed: 1,
        table_info: {
          id: bestTable.id,
          name: bestTable.table_number,
          capacity: bestTable.capacity
        },
        message: 'Tisch verfügbar'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error('Error in check-availability:', err);
    return new Response(
      JSON.stringify({
        available: false,
        message: 'Ein Fehler ist aufgetreten',
        reason: 'server_error',
        error: err instanceof Error ? err.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
