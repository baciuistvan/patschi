import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { reservationId } = await req.json();

    if (!reservationId) {
      return new Response(
        JSON.stringify({ error: "Missing reservation ID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get reservation details
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      return new Response(
        JSON.stringify({ error: "Reservation not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get settings from database
    const { data: settingsArray } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['stripe_mode', 'stripe_live_secret_key', 'stripe_test_secret_key']);

    const settings: Record<string, string> = {};
    settingsArray?.forEach((s: any) => {
      settings[s.key] = s.value;
    });

    const stripeMode = settings['stripe_mode'] || 'test';
    const stripeKey = stripeMode === 'live'
      ? (settings['stripe_live_secret_key'] || Deno.env.get("STRIPE_SECRET_KEY"))
      : (settings['stripe_test_secret_key'] || Deno.env.get("STRIPE_SECRET_KEY"));

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // If there's an existing payment link, try to deactivate it (only works in test mode)
    if (reservation.payment_link_id && stripeMode === 'test') {
      try {
        await stripe.paymentLinks.update(reservation.payment_link_id, {
          active: false,
        });
      } catch (err) {
        console.log('Could not deactivate old payment link:', err);
      }
    }

    // Create new Stripe payment link using the existing payment amount
    const amount = Math.round(reservation.payment_amount * 100); // Convert to cents

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Reservierung für ${reservation.party_size} Personen`,
              description: `${reservation.reservation_date} um ${reservation.reservation_time} Uhr - ${reservation.customer_name}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        reservation_id: reservation.id,
        booking_code: reservation.booking_code,
        customer_name: reservation.customer_name,
        customer_email: reservation.customer_email,
      },
    });

    // Update reservation with new payment link
    await supabase
      .from("reservations")
      .update({
        payment_link_id: paymentLink.id,
        payment_link_url: paymentLink.url,
      })
      .eq('id', reservation.id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_link_url: paymentLink.url,
        payment_link_id: paymentLink.id,
        stripe_mode: stripeMode,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error('Error regenerating payment link:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to regenerate payment link' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
