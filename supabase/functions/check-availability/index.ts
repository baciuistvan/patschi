import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { reservation_date, reservation_time, party_size, room_id } = await req.json();

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

    // Get all tables for the room, ordered by capacity (smallest first)
    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('*')
      .eq('room_id', room_id)
      .eq('is_active', true)
      .gte('capacity', party_size) // Only get tables that can fit the party
      .order('capacity', { ascending: true }); // Sort by capacity ascending

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

    // If no tables can accommodate the party size
    if (!tables || tables.length === 0) {
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

    // Calculate time window for the reservation (2 hours)
    const requestedStartTime = new Date(`${reservation_date}T${reservation_time}`);
    const requestedEndTime = new Date(requestedStartTime.getTime() + 120 * 60000); // 2 hours

    // Check each table (smallest first) for availability
    for (const table of tables) {
      // Get existing reservations for this table on this date
      const { data: existingReservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('reservation_time, duration_minutes')
        .eq('reservation_date', reservation_date)
        .contains('selected_tables', [table.id])
        .in('status', ['confirmed', 'pending']);

      if (reservationsError) {
        console.error('Error checking reservations:', reservationsError);
        continue; // Skip this table and try the next one
      }

      // Check if table is available
      let isAvailable = true;

      if (existingReservations && existingReservations.length > 0) {
        for (const reservation of existingReservations) {
          const existingStartTime = new Date(`${reservation_date}T${reservation.reservation_time}`);
          const existingEndTime = new Date(existingStartTime.getTime() + (reservation.duration_minutes || 120) * 60000);

          // Check for time overlap
          if (
            (requestedStartTime >= existingStartTime && requestedStartTime < existingEndTime) ||
            (requestedEndTime > existingStartTime && requestedEndTime <= existingEndTime) ||
            (requestedStartTime <= existingStartTime && requestedEndTime >= existingEndTime)
          ) {
            isAvailable = false;
            break;
          }
        }
      }

      // If this table is available, return it
      if (isAvailable) {
        return new Response(
          JSON.stringify({
            available: true,
            selected_tables: [table.id],
            tables_needed: 1,
            table_info: {
              id: table.id,
              name: table.name,
              capacity: table.capacity
            },
            message: 'Tisch verfügbar'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // No available tables found
    return new Response(
      JSON.stringify({
        available: false,
        message: 'An diesem Datum und dieser Uhrzeit sind alle passenden Tische bereits gebucht. Bitte wählen Sie ein anderes Datum.',
        reason: 'fully_booked'
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
