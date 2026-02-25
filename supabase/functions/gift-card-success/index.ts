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
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Missing session ID");
    }

    const { data: existing } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, giftCard: existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["stripe_mode", "stripe_live_secret_key", "stripe_test_secret_key"]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });

    const stripeMode = settingsMap["stripe_mode"] || "test";
    const stripeKey = stripeMode === "live"
      ? settingsMap["stripe_live_secret_key"]
      : settingsMap["stripe_test_secret_key"];

    if (!stripeKey) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, error: "Payment not completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.metadata?.type !== "gift_card") {
      throw new Error("Not a gift card session");
    }

    const meta = session.metadata;
    const code = meta.gift_card_code;
    const barcode = meta.gift_card_barcode;
    const amount = parseFloat(meta.gift_card_amount);
    const expiryDate = meta.gift_card_expiry;

    const { data: giftCard, error: insertError } = await supabase
      .from("gift_cards")
      .insert({
        code,
        barcode,
        original_amount: amount,
        current_balance: amount,
        recipient_name: meta.recipient_name || null,
        recipient_email: meta.recipient_email || null,
        purchaser_name: meta.buyer_name,
        purchaser_email: meta.buyer_email,
        message: meta.message || null,
        status: "active",
        payment_status: "paid",
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        purchase_date: new Date().toISOString(),
        expiry_date: expiryDate,
      })
      .select()
      .single();

    if (insertError || !giftCard) {
      const { data: raceCard } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (raceCard) {
        return new Response(
          JSON.stringify({ success: true, giftCard: raceCard }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw insertError || new Error("Failed to create gift card");
    }

    try {
      await fetch(`${supabaseUrl}/functions/v1/send-gift-card-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ giftCardId: giftCard.id }),
      });
    } catch (emailErr) {
      console.error("Error sending email:", emailErr);
    }

    return new Response(
      JSON.stringify({ success: true, giftCard }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Gift card success error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Processing failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
