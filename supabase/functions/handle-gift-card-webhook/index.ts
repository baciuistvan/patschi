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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["stripe_mode", "stripe_live_secret_key", "stripe_test_secret_key", "stripe_live_webhook_secret", "stripe_test_webhook_secret"]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });

    const stripeMode = settingsMap["stripe_mode"] || "test";
    const stripeKey = stripeMode === "live"
      ? settingsMap["stripe_live_secret_key"]
      : settingsMap["stripe_test_secret_key"];
    const webhookSecret = stripeMode === "live"
      ? settingsMap["stripe_live_webhook_secret"]
      : settingsMap["stripe_test_webhook_secret"];

    if (!stripeKey || !webhookSecret) {
      throw new Error("Stripe configuration incomplete");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log("Gift card webhook event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.type === "gift_card" && session.metadata?.gift_card_id) {
        const giftCardId = session.metadata.gift_card_id;

        console.log("Processing gift card payment for:", giftCardId);

        const { error: updateError } = await supabase
          .from("gift_cards")
          .update({
            status: "active",
            payment_status: "paid",
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", giftCardId)
          .eq("status", "pending");

        if (updateError) {
          console.error("Failed to activate gift card:", updateError);
          throw updateError;
        }

        console.log("Gift card activated:", giftCardId);

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
            const pdfError = await pdfResponse.text();
            console.error("PDF generation failed:", pdfError);
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
            const emailError = await emailResponse.text();
            console.error("Email sending failed:", emailError);
          } else {
            console.log("Gift card email sent successfully");
          }
        } catch (emailErr) {
          console.error("Error sending email:", emailErr);
        }
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.type === "gift_card" && session.metadata?.gift_card_id) {
        await supabase
          .from("gift_cards")
          .update({ status: "cancelled", payment_status: "failed" })
          .eq("id", session.metadata.gift_card_id)
          .eq("status", "pending");
        console.log("Cancelled expired pending gift card:", session.metadata.gift_card_id);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Webhook processing failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
