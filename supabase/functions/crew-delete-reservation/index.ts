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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate crew session token
    const { data: session, error: sessionError } = await supabase
      .from("crew_sessions")
      .select("crew_user_id, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (sessionError) {
      console.error("Session validation error:", sessionError);
      return new Response(
        JSON.stringify({ error: "Session validation failed: " + sessionError.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!session) {
      console.error("No session found for token");
      return new Response(
        JSON.stringify({ error: "Invalid token - no active session found" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      console.error("Session expired");
      return new Response(
        JSON.stringify({ error: "Session expired. Please login again." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { reservation_id } = await req.json();

    if (!reservation_id) {
      console.error("No reservation ID provided");
      return new Response(
        JSON.stringify({ error: "Reservation ID required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Attempting to delete reservation:", reservation_id);

    // Check if reservation exists and is not a paid Stripe reservation
    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", reservation_id)
      .single();

    if (fetchError) {
      console.error("Error fetching reservation:", fetchError);
      return new Response(
        JSON.stringify({ error: "Error fetching reservation: " + fetchError.message }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!reservation) {
      console.error("Reservation not found:", reservation_id);
      return new Response(
        JSON.stringify({ error: "Reservation not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Found reservation:", {
      id: reservation.id,
      booking_method: reservation.booking_method,
      payment_method: reservation.payment_method,
      stripe_payment_intent_id: reservation.stripe_payment_intent_id
    });

    // Prevent deletion of Stripe paid reservations
    if (
      reservation.booking_method === "stripe" ||
      reservation.payment_method === "stripe" ||
      reservation.stripe_payment_intent_id
    ) {
      console.error("Attempted to delete paid online reservation");
      return new Response(
        JSON.stringify({ error: "Cannot delete paid online reservations" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Delete the reservation
    console.log("Deleting reservation from database");
    const { error: deleteError } = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservation_id);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      throw deleteError;
    }

    // Write activity log
    try {
      await supabase.from('activity_logs').insert({
        event_type:  'reservation_deleted',
        actor_type:  'crew',
        actor_id:    session.crew_user_id,
        actor_name:  null,
        entity_type: 'reservation',
        entity_id:   reservation_id,
        description: `Crew hat Reservierung gelöscht: ${reservation.customer_name} (${reservation.party_size} Gäste) am ${reservation.reservation_date}`,
        metadata: {
          customer_name:    reservation.customer_name,
          customer_email:   reservation.customer_email,
          party_size:       reservation.party_size,
          reservation_date: reservation.reservation_date,
          reservation_time: reservation.reservation_time,
          status:           reservation.status,
        },
      });
    } catch (_logErr) { /* non-blocking */ }

    console.log("Reservation deleted successfully");
    return new Response(
      JSON.stringify({ success: true, message: "Reservation deleted" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
