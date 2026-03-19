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
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const body = await req.text();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["stripe_mode", "stripe_live_secret_key", "stripe_test_secret_key", "stripe_live_webhook_secret", "stripe_test_webhook_secret", "stripe_webhook_secret"]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });

    const stripeMode = settingsMap["stripe_mode"] || "test";
    const stripeKey = stripeMode === "live"
      ? settingsMap["stripe_live_secret_key"]
      : settingsMap["stripe_test_secret_key"];
    const webhookSecret = stripeMode === "live"
      ? (settingsMap["stripe_live_webhook_secret"] || settingsMap["stripe_webhook_secret"])
      : (settingsMap["stripe_test_webhook_secret"] || settingsMap["stripe_webhook_secret"]);

    if (!stripeKey) {
      console.error("Stripe secret key not configured for mode:", stripeMode);
      return new Response(JSON.stringify({ received: true, warning: "Stripe key not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("No Stripe signature found");
      return new Response(JSON.stringify({ received: true, warning: "No signature" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      console.warn("No webhook secret configured — skipping signature verification");
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log("Gift card webhook event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.type === "gift_card") {
        const meta = session.metadata;
        const code = meta.gift_card_code;
        const barcode = meta.gift_card_barcode;
        const amount = parseFloat(meta.gift_card_amount);
        const expiryDate = meta.gift_card_expiry;

        console.log("Processing gift card payment, code:", code);

        const { data: existing } = await supabase
          .from("gift_cards")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (existing) {
          console.log("Gift card already exists for session:", session.id);
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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
          console.error("Failed to create gift card:", insertError);
          return new Response(
            JSON.stringify({ received: true, error: "Failed to create gift card" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const giftCardId = giftCard.id;
        console.log("Gift card created and activated:", giftCardId);

        try {
          await supabase.from('notifications').insert({
            type: 'gift_card_purchased',
            title: 'Gutschein gekauft',
            message: `${meta.buyer_name} kaufte einen Gutschein über €${amount.toFixed(2)}${meta.recipient_name ? ` für ${meta.recipient_name}` : ''}`,
            related_id: giftCardId,
          });
        } catch (_notifErr) { /* non-blocking */ }

        try {
          const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/generate-gift-card-pdf`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ giftCardId }),
          });

          if (!pdfResponse.ok) {
            console.error("PDF generation failed:", await pdfResponse.text());
          } else {
            console.log("PDF generated successfully");
          }
        } catch (pdfErr) {
          console.error("Error generating PDF:", pdfErr);
        }

        try {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-gift-card-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ giftCardId }),
          });

          if (!emailResponse.ok) {
            console.error("Email sending failed:", await emailResponse.text());
          } else {
            console.log("Gift card email sent successfully");
          }
        } catch (emailErr) {
          console.error("Error sending email:", emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ received: true, error: error instanceof Error ? error.message : "Webhook processing failed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
