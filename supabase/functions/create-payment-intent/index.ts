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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Stripe mode from settings
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["stripe_mode", "stripe_enabled"]);

    if (settingsError) {
      throw new Error(`Failed to fetch settings: ${settingsError.message}`);
    }

    const stripeMode = settings?.find(s => s.key === "stripe_mode")?.value || "test";
    const stripeEnabled = settings?.find(s => s.key === "stripe_enabled")?.value === "true";

    if (!stripeEnabled) {
      return new Response(
        JSON.stringify({ error: "Stripe is not enabled" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the appropriate Stripe secret key based on mode
    const stripeSecretKey = stripeMode === "live"
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");

    if (!stripeSecretKey) {
      throw new Error(`Stripe ${stripeMode} mode secret key not configured`);
    }

    // Parse request body
    const { amount, currency = "eur", metadata = {} } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create payment intent with Stripe
    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: currency,
        "automatic_payment_methods[enabled]": "true",
        ...Object.entries(metadata).reduce((acc, [key, value]) => {
          acc[`metadata[${key}]`] = String(value);
          return acc;
        }, {} as Record<string, string>)
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Stripe API error: ${errorData.error?.message || "Unknown error"}`);
    }

    const paymentIntent = await response.json();

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        mode: stripeMode
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create payment intent"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
