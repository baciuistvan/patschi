import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import Stripe from "npm:stripe@14.21.0";

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Stripe settings
    const { data: settings } = await supabase
      .from("settings")
      .select("stripe_live_secret_key, stripe_test_secret_key, stripe_mode")
      .single();

    if (!settings) {
      throw new Error("Stripe settings not configured");
    }

    const stripeKey = settings.stripe_mode === "test"
      ? settings.stripe_test_secret_key
      : settings.stripe_live_secret_key;

    if (!stripeKey) {
      throw new Error("Stripe key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
    });

    const { amount, recipientName, recipientEmail, buyerName, buyerEmail, message } = await req.json();

    // Validate amount
    if (!amount || amount < 10) {
      throw new Error("Invalid amount. Minimum is €10");
    }

    // Generate unique gift card code and barcode
    const code = `GS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const barcode = Math.floor(Math.random() * 9e18).toString();

    // Calculate expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Create gift card in database
    const { data: giftCard, error: dbError } = await supabase
      .from("gift_cards")
      .insert({
        code,
        barcode,
        original_amount: amount,
        current_balance: amount,
        recipient_name: recipientName || null,
        recipient_email: recipientEmail || null,
        purchaser_name: buyerName,
        purchaser_email: buyerEmail,
        message: message || null,
        status: "pending",
        expiry_date: expiryDate.toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to create gift card");
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "paypal"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Geschenkgutschein",
              description: recipientName
                ? `Geschenkgutschein für ${recipientName}`
                : "Geschenkgutschein",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/gift-card-widget.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/gift-card-widget.html?cancelled=true`,
      metadata: {
        gift_card_id: giftCard.id,
        type: "gift_card",
      },
    });

    // Update gift card with session ID
    await supabase
      .from("gift_cards")
      .update({ stripe_session_id: session.id })
      .eq("id", giftCard.id);

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: session.url,
        giftCardId: giftCard.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating gift card checkout:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create gift card checkout",
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
