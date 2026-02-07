import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

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
      room_id,
      special_requests,
      duration_minutes,
      table_ids,
      success_url
    } = await req.json();

    if (!customer_name || !customer_email || !reservation_date || !reservation_time || !party_size) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Stripe settings
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const stripeMode = settings?.stripe_mode || 'test';
    const stripeKey = stripeMode === 'live'
      ? (settings?.stripe_live_secret_key || Deno.env.get("STRIPE_SECRET_KEY"))
      : (settings?.stripe_test_secret_key || Deno.env.get("STRIPE_SECRET_KEY"));

    // Get success URL from settings or use default HTML page
    // Default to the static HTML page which will be served from your domain
    const defaultSuccessUrl = settings?.success_page_url ||
      `https://playful-travesseiro-8cccaa.netlify.app/zahlung-erfolgreich.html`;

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

    const booking_code = generateBookingCode();

    // Create reservation first
    const reservationData: any = {
      customer_name,
      customer_email,
      customer_phone: customer_phone || '',
      party_size,
      reservation_date,
      reservation_time,
      duration_minutes: duration_minutes || 120,
      status: 'pending',
      special_requests: special_requests || '',
      payment_status: 'unpaid',
      payment_amount: 0,
      payment_method: 'stripe',
      booking_method: 'online',
      booking_code
    };

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .insert(reservationData)
      .select('*')
      .single();

    if (reservationError) {
      throw reservationError;
    }

    // Link tables if provided
    if (table_ids && Array.isArray(table_ids) && table_ids.length > 0) {
      const tableLinks = table_ids.map((tableId: string) => ({
        reservation_id: reservation.id,
        table_id: tableId
      }));

      const { error: tablesError } = await supabase
        .from("reservation_tables")
        .insert(tableLinks);

      if (tablesError) {
        console.error('Error linking tables:', tablesError);
      }
    }

    // Create Stripe payment link
    const amount = Math.round((party_size * 10) * 100); // €10 per person in cents

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Reservierung für ${party_size} Personen`,
              description: `${reservation_date} um ${reservation_time} Uhr - ${customer_name}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        reservation_id: reservation.id,
        booking_code: booking_code,
        customer_name,
        customer_email,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: success_url || `${defaultSuccessUrl}?booking_code=${booking_code}`,
        },
      },
    });

    // Update reservation with payment link info
    await supabase
      .from("reservations")
      .update({
        payment_link_id: paymentLink.id,
        payment_link_url: paymentLink.url,
        payment_amount: amount / 100
      })
      .eq('id', reservation.id);

    // Send email with payment link
    let email_sent = false;
    let email_error = null;

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
          payment_amount: amount / 100,
          booking_code,
          payment_link_url: paymentLink.url
        }),
      });

      if (emailResponse.ok) {
        email_sent = true;
      } else {
        email_error = await emailResponse.text();
      }
    } catch (err: any) {
      console.error('Error sending email:', err);
      email_error = err.message;
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking_code,
        payment_link_url: paymentLink.url,
        payment_link_id: paymentLink.id,
        reservation_id: reservation.id,
        email_sent,
        email_error
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error('Error creating payment link:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create payment link' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
