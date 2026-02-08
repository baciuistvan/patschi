import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Stripe settings
    const { data: settings } = await supabase
      .from("settings")
      .select("stripe_live_secret_key, stripe_test_secret_key, stripe_live_webhook_secret, stripe_test_webhook_secret, stripe_mode")
      .single();

    if (!settings) {
      throw new Error("Stripe settings not configured");
    }

    const stripeKey = settings.stripe_mode === "test"
      ? settings.stripe_test_secret_key
      : settings.stripe_live_secret_key;

    const webhookSecret = settings.stripe_mode === "test"
      ? settings.stripe_test_webhook_secret
      : settings.stripe_live_webhook_secret;

    if (!stripeKey || !webhookSecret) {
      throw new Error("Stripe configuration incomplete");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log("Gift card webhook event:", event.type);

    // Handle checkout.session.completed for gift cards
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Check if this is a gift card purchase
      if (session.metadata?.type === "gift_card" && session.metadata?.gift_card_id) {
        const giftCardId = session.metadata.gift_card_id;

        console.log("Processing gift card payment for:", giftCardId);

        // Update gift card status to active
        const { error: updateError } = await supabase
          .from("gift_cards")
          .update({
            status: "active",
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", giftCardId);

        if (updateError) {
          console.error("Failed to update gift card:", updateError);
          throw updateError;
        }

        console.log("Gift card activated successfully");

        // Trigger PDF generation and email sending
        // This will be handled by the frontend after redirect
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Webhook processing failed",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
