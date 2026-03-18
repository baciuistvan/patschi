import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature, stripe-signature",
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
      .in("key", [
        "stripe_mode",
        "stripe_live_secret_key",
        "stripe_test_secret_key",
        "stripe_live_webhook_secret",
        "stripe_test_webhook_secret",
        "stripe_webhook_secret",
      ]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => { settingsMap[s.key] = s.value; });

    const stripeMode = settingsMap["stripe_mode"] || "live";
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
      console.error("No stripe-signature header");
      return new Response(JSON.stringify({ received: true, warning: "No signature" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    if (webhookSecret) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response(JSON.stringify({ error: "Signature verification failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("No webhook secret configured — skipping signature verification");
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log("stripe-webhook event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      if (metadata.type === "gift_card") {
        return await handleGiftCard(session, metadata, supabase, supabaseUrl, supabaseKey, corsHeaders);
      } else {
        return await handleReservationCheckout(session, metadata, supabase, supabaseUrl, supabaseKey, corsHeaders);
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return await handlePaymentIntentSucceeded(paymentIntent, supabase, supabaseUrl, supabaseKey, corsHeaders);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("stripe-webhook error:", error);
    return new Response(
      JSON.stringify({ received: true, error: error instanceof Error ? error.message : "Webhook processing failed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleGiftCard(
  session: Stripe.Checkout.Session,
  meta: Record<string, string>,
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseKey: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
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

  console.log("Gift card created and activated:", giftCard.id);

  try {
    const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/generate-gift-card-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({ giftCardId: giftCard.id }),
    });
    if (!pdfResponse.ok) console.error("PDF generation failed:", await pdfResponse.text());
    else console.log("PDF generated successfully");
  } catch (pdfErr) {
    console.error("Error generating PDF:", pdfErr);
  }

  try {
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-gift-card-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({ giftCardId: giftCard.id }),
    });
    if (!emailResponse.ok) console.error("Email sending failed:", await emailResponse.text());
    else console.log("Gift card email sent successfully");
  } catch (emailErr) {
    console.error("Error sending email:", emailErr);
  }

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleReservationCheckout(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string>,
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseKey: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const paymentIntentId = session.payment_intent as string;
  const customerEmail = session.customer_details?.email;

  console.log("Processing reservation payment for:", customerEmail);

  let reservation = null;

  if (metadata.booking_code) {
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("booking_code", metadata.booking_code)
      .eq("payment_status", "unpaid")
      .maybeSingle();
    reservation = data;
  }

  if (!reservation && metadata.reservation_id) {
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", metadata.reservation_id)
      .eq("payment_status", "unpaid")
      .maybeSingle();
    reservation = data;
  }

  if (!reservation && session.payment_link) {
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("payment_link_id", session.payment_link)
      .eq("payment_status", "unpaid")
      .maybeSingle();
    reservation = data;
  }

  if (!reservation && (paymentIntentId || customerEmail)) {
    const orFilter = [
      paymentIntentId ? `stripe_payment_intent_id.eq.${paymentIntentId}` : null,
      customerEmail ? `customer_email.eq.${customerEmail}` : null,
    ].filter(Boolean).join(",");

    const { data: rows } = await supabase
      .from("reservations")
      .select("*")
      .or(orFilter)
      .eq("payment_status", "unpaid")
      .order("created_at", { ascending: false })
      .limit(1);
    reservation = rows && rows.length > 0 ? rows[0] : null;
  }

  if (!reservation) {
    console.log("No matching reservation found for payment");
    return new Response(
      JSON.stringify({ received: true, message: "No reservation found to update" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  await supabase
    .from("reservations")
    .update({
      payment_status: "paid",
      status: "confirmed",
      booking_method: "payment_link",
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservation.id);

  console.log("Reservation updated successfully:", reservation.id);

  try {
    await fetch(`${supabaseUrl}/functions/v1/notify-admins-new-reservation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
      body: JSON.stringify({ reservation }),
    });
  } catch (e) { console.error("Error sending push notification:", e); }

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-reservation-confirmation-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
      body: JSON.stringify({ reservationId: reservation.id, is_payment_confirmation: true }),
    });
  } catch (e) { console.error("Error sending confirmation email:", e); }

  return new Response(
    JSON.stringify({ received: true, reservationId: reservation.id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseKey: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const paymentIntentId = paymentIntent.id;
  const metadata = paymentIntent.metadata || {};

  console.log("[WEBHOOK] payment_intent.succeeded:", paymentIntentId);

  const { data: existing } = await supabase
    .from("reservations")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (existing) {
    console.log("[WEBHOOK] Reservation already exists:", existing.id);
    return new Response(
      JSON.stringify({ received: true, reservationId: existing.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { customer_name, customer_email, reservation_date, reservation_time, party_size } = metadata;

  if (!customer_name || !customer_email || !reservation_date || !reservation_time || !party_size) {
    console.log("[WEBHOOK] Insufficient metadata to auto-create reservation");
    return new Response(
      JSON.stringify({ received: true, message: "Insufficient metadata for auto-creation" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let booking_code = "";
  for (let i = 0; i < 8; i++) {
    booking_code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const amountPaid = paymentIntent.amount ? paymentIntent.amount / 100 : 0;

  const { data: reservation, error: createError } = await supabase
    .from("reservations")
    .insert({
      customer_name,
      customer_email,
      customer_phone: metadata.customer_phone || "",
      party_size: parseInt(party_size, 10),
      reservation_date,
      reservation_time,
      duration_minutes: 120,
      status: "confirmed",
      special_requests: metadata.special_requests || "",
      payment_status: "paid",
      payment_amount: amountPaid,
      amount_paid: amountPaid,
      payment_method: "stripe",
      stripe_payment_intent_id: paymentIntentId,
      booking_method: "online",
      booking_code,
      room_id: metadata.room_id || null,
    })
    .select("*")
    .single();

  if (createError) {
    console.error("[WEBHOOK] Failed to auto-create reservation:", createError);
    return new Response(
      JSON.stringify({ received: true, error: "Failed to auto-create reservation" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[WEBHOOK] Auto-created reservation:", reservation.id, "booking_code:", booking_code);

  try {
    await supabase.from("activity_logs").insert({
      event_type: "reservation_created",
      actor_type: "system",
      actor_id: null,
      actor_name: "Webhook Auto-Recovery",
      entity_type: "reservation",
      entity_id: reservation.id,
      description: `Auto-created via payment_intent.succeeded webhook: ${customer_name} am ${reservation_date} um ${reservation_time}`,
      metadata: { booking_code, payment_intent_id: paymentIntentId, auto_recovery: true },
    });
  } catch (_logErr) { /* non-blocking */ }

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-reservation-confirmation-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
      body: JSON.stringify({ reservationId: reservation.id, is_payment_confirmation: true }),
    });
  } catch (e) { console.error("[WEBHOOK] Error sending confirmation email:", e); }

  try {
    await fetch(`${supabaseUrl}/functions/v1/notify-admins-new-reservation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
      body: JSON.stringify({ reservation }),
    });
  } catch (e) { console.error("[WEBHOOK] Error sending push notification:", e); }

  return new Response(
    JSON.stringify({ received: true, reservationId: reservation.id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
