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

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      reservation_id,
      status,
      customer_name,
      customer_email,
      customer_phone,
      party_size,
      reservation_time,
      reservation_date,
      special_requests,
      payment_status,
      payment_amount,
      payment_method,
      booking_method
    } = await req.json();

    if (!reservation_id) {
      return new Response(
        JSON.stringify({ error: "Reservation ID required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};

    if (status !== undefined) {
      const validStatuses = ['pending', 'confirmed', 'seated', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: "Invalid status" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      updateData.status = status;
    }

    if (customer_name !== undefined) updateData.customer_name = customer_name;
    if (customer_email !== undefined) updateData.customer_email = customer_email;
    if (customer_phone !== undefined) updateData.customer_phone = customer_phone;
    if (party_size !== undefined) updateData.party_size = party_size;
    if (reservation_time !== undefined) updateData.reservation_time = reservation_time;
    if (reservation_date !== undefined) updateData.reservation_date = reservation_date;
    if (special_requests !== undefined) updateData.special_requests = special_requests;
    if (payment_status !== undefined) updateData.payment_status = payment_status;
    if (payment_amount !== undefined) updateData.payment_amount = payment_amount;
    if (payment_method !== undefined) updateData.payment_method = payment_method;
    if (booking_method !== undefined) updateData.booking_method = booking_method;

    const { data, error } = await supabase
      .from("reservations")
      .update(updateData)
      .eq("id", reservation_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, reservation: data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
