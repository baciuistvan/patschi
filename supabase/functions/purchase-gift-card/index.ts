import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

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

    const { amount, recipientName, recipientEmail, buyerName, buyerEmail, message } = await req.json();

    if (!amount || amount < 10) {
      throw new Error("Ungültiger Betrag. Mindestbetrag ist €10");
    }

    if (!buyerName || !buyerEmail) {
      throw new Error("Käufername und E-Mail sind erforderlich");
    }

    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["stripe_mode", "stripe_enabled", "stripe_live_secret_key", "stripe_test_secret_key"]);

    if (settingsError) {
      throw new Error("Stripe-Einstellungen konnten nicht geladen werden");
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });

    const stripeEnabled = settingsMap["stripe_enabled"] === "true";
    if (!stripeEnabled) {
      throw new Error("Online-Zahlung ist derzeit nicht aktiviert. Bitte kontaktieren Sie uns direkt.");
    }

    const stripeMode = settingsMap["stripe_mode"] || "test";
    const stripeSecretKey = stripeMode === "live"
      ? settingsMap["stripe_live_secret_key"]
      : settingsMap["stripe_test_secret_key"];

    if (!stripeSecretKey) {
      throw new Error(`Stripe ${stripeMode} Modus ist nicht konfiguriert`);
    }

    const code = `GS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const barcode = Math.floor(Math.random() * 9e18).toString();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

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
        payment_status: "pending",
        purchase_date: new Date().toISOString(),
        expiry_date: expiryDate.toISOString(),
      })
      .select()
      .single();

    if (dbError || !giftCard) {
      throw new Error(`Gutschein konnte nicht erstellt werden: ${dbError?.message}`);
    }

    const origin = req.headers.get("origin")
      || req.headers.get("referer")?.split("/").slice(0, 3).join("/")
      || supabaseUrl;

    const successUrl = `${origin}/gift-card-widget.html?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/gift-card-widget.html?cancelled=true`;

    const amountInCents = Math.round(amount * 100);

    const stripeBody = new URLSearchParams({
      "payment_method_types[0]": "card",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": amountInCents.toString(),
      "line_items[0][price_data][product_data][name]": `Gutschein – ${recipientName || "Wertgutschein"}`,
      "line_items[0][price_data][product_data][description]": `Gutschein im Wert von €${amount.toFixed(2)}`,
      "line_items[0][quantity]": "1",
      "mode": "payment",
      "success_url": successUrl,
      "cancel_url": cancelUrl,
      "customer_email": buyerEmail,
      "metadata[type]": "gift_card",
      "metadata[gift_card_id]": giftCard.id,
      "metadata[gift_card_code]": code,
      "metadata[buyer_name]": buyerName,
      "metadata[buyer_email]": buyerEmail,
      "metadata[recipient_name]": recipientName || "",
      "metadata[recipient_email]": recipientEmail || "",
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: stripeBody.toString(),
    });

    if (!stripeResponse.ok) {
      const stripeError = await stripeResponse.json();
      await supabase.from("gift_cards").delete().eq("id", giftCard.id);
      throw new Error(`Stripe Fehler: ${stripeError.error?.message || "Unbekannter Fehler"}`);
    }

    const session = await stripeResponse.json();

    const { error: updateError } = await supabase
      .from("gift_cards")
      .update({ stripe_session_id: session.id })
      .eq("id", giftCard.id);

    if (updateError) {
      console.error("Failed to store stripe_session_id:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, checkoutUrl: session.url, giftCardId: giftCard.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating gift card checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Zahlung konnte nicht verarbeitet werden" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
