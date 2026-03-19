import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const body = await req.text();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["stripe_mode", "stripe_live_secret_key", "stripe_test_secret_key", "stripe_live_webhook_secret", "stripe_test_webhook_secret", "stripe_webhook_secret"]);

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
      return new Response(JSON.stringify({ error: "No signature provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!webhookSecret) {
      console.error("Webhook secret not configured for mode:", stripeMode);
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log("Webhook signature verified. Event:", event.type);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Signature verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentIntentId = session.payment_intent as string;
      const customerEmail = session.customer_details?.email;
      const metadata = session.metadata || {};

      console.log("Payment completed for:", customerEmail);
      console.log("Payment intent:", paymentIntentId);
      console.log("Session payment_link:", session.payment_link);
      console.log("Session metadata:", metadata);

      let reservation = null;
      let findError = null;

      if (metadata.booking_code) {
        console.log("Looking for reservation by booking_code:", metadata.booking_code);
        const { data, error } = await supabase
          .from("reservations")
          .select("*")
          .eq("booking_code", metadata.booking_code)
          .eq("payment_status", "unpaid")
          .maybeSingle();
        reservation = data;
        findError = error;
      }

      if (!reservation && metadata.reservation_id) {
        console.log("Looking for reservation by reservation_id:", metadata.reservation_id);
        const { data, error } = await supabase
          .from("reservations")
          .select("*")
          .eq("id", metadata.reservation_id)
          .eq("payment_status", "unpaid")
          .maybeSingle();
        reservation = data;
        findError = error;
      }

      if (!reservation && session.payment_link) {
        console.log("Looking for reservation by payment_link_id:", session.payment_link);
        const { data, error } = await supabase
          .from("reservations")
          .select("*")
          .eq("payment_link_id", session.payment_link)
          .eq("payment_status", "unpaid")
          .maybeSingle();
        reservation = data;
        findError = error;
      }

      if (!reservation && (paymentIntentId || customerEmail)) {
        console.log("Looking for reservation by payment_intent or email");
        const orFilter = [
          paymentIntentId ? `stripe_payment_intent_id.eq.${paymentIntentId}` : null,
          customerEmail ? `customer_email.eq.${customerEmail}` : null,
        ].filter(Boolean).join(',');

        const { data: reservations, error } = await supabase
          .from("reservations")
          .select("*")
          .or(orFilter)
          .eq("payment_status", "unpaid")
          .order("created_at", { ascending: false })
          .limit(1);
        reservation = reservations && reservations.length > 0 ? reservations[0] : null;
        findError = error;
      }

      if (findError) {
        console.error("Error finding reservation:", findError);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (reservation) {
        const { error: updateError } = await supabase
          .from("reservations")
          .update({
            payment_status: "paid",
            status: "confirmed",
            booking_method: "payment_link",
            stripe_payment_intent_id: paymentIntentId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", reservation.id);

        if (updateError) {
          console.error("Error updating reservation:", updateError);
          return new Response(JSON.stringify({ error: "Failed to update reservation" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Reservation updated successfully:", reservation.id);

        try {
          await supabase.from('notifications').insert({
            type: 'payment_paid',
            title: 'Zahlungslink bezahlt',
            message: `${reservation.customer_name} – ${reservation.party_size} Gäste, ${reservation.reservation_date} um ${reservation.reservation_time} Uhr`,
            related_id: reservation.id,
          });
        } catch (_notifErr) { /* non-blocking */ }

        try {
          await fetch(`${supabaseUrl}/functions/v1/notify-admins-new-reservation`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({ reservation }),
          });
        } catch (notifyError) {
          console.error("[WEBHOOK] Error sending push notification:", notifyError);
        }

        try {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-reservation-confirmation-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({ reservationId: reservation.id, is_payment_confirmation: true }),
          });
          if (!emailResponse.ok) {
            console.error("[WEBHOOK] Failed to send confirmation email, status:", emailResponse.status);
          } else {
            console.log("[WEBHOOK] Confirmation email sent successfully");
          }
        } catch (emailError) {
          console.error("[WEBHOOK] Error calling email function:", emailError);
        }

        return new Response(
          JSON.stringify({ success: true, message: "Payment processed successfully", reservationId: reservation.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        console.log("No matching reservation found for payment");
        return new Response(
          JSON.stringify({ success: true, message: "No reservation found to update" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const paymentIntentId = paymentIntent.id;
      const metadata = paymentIntent.metadata || {};

      console.log("[WEBHOOK] payment_intent.succeeded:", paymentIntentId);
      console.log("[WEBHOOK] Metadata:", metadata);

      const { data: existing } = await supabase
        .from("reservations")
        .select("id, booking_code")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();

      if (existing) {
        console.log("[WEBHOOK] Reservation already exists:", existing.id, "— skipping");
        return new Response(
          JSON.stringify({ success: true, message: "Reservation already exists", reservationId: existing.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { customer_name, customer_email, reservation_date, reservation_time, party_size } = metadata;

      if (!customer_name || !customer_email || !reservation_date || !reservation_time || !party_size) {
        console.log("[WEBHOOK] Insufficient metadata to auto-create reservation");
        console.log("[WEBHOOK] Available metadata keys:", Object.keys(metadata));
        return new Response(
          JSON.stringify({ success: true, message: "Insufficient metadata for auto-creation" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let booking_code = '';
      for (let i = 0; i < 8; i++) {
        booking_code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const amountPaid = paymentIntent.amount ? paymentIntent.amount / 100 : 0;

      const { data: reservation, error: createError } = await supabase
        .from("reservations")
        .insert({
          customer_name,
          customer_email,
          customer_phone: metadata.customer_phone || '',
          party_size: parseInt(party_size, 10),
          reservation_date,
          reservation_time,
          duration_minutes: 120,
          status: 'confirmed',
          special_requests: metadata.special_requests || '',
          payment_status: 'paid',
          payment_amount: amountPaid,
          amount_paid: amountPaid,
          payment_method: 'stripe',
          stripe_payment_intent_id: paymentIntentId,
          booking_method: 'online',
          booking_code,
          room_id: metadata.room_id || null,
        })
        .select('*')
        .single();

      if (createError) {
        console.error("[WEBHOOK] Failed to auto-create reservation:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to auto-create reservation" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[WEBHOOK] Auto-created reservation:", reservation.id, "booking_code:", booking_code);

      try {
        await supabase.from('activity_logs').insert({
          event_type: 'reservation_created',
          actor_type: 'system',
          actor_id: null,
          actor_name: 'Webhook Auto-Recovery',
          entity_type: 'reservation',
          entity_id: reservation.id,
          description: `Auto-created via payment_intent.succeeded webhook: ${customer_name} am ${reservation_date} um ${reservation_time}`,
          metadata: { booking_code, payment_intent_id: paymentIntentId, auto_recovery: true },
        });
      } catch (_logErr) { /* non-blocking */ }

      try {
        await fetch(`${supabaseUrl}/functions/v1/send-reservation-confirmation-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ reservationId: reservation.id, is_payment_confirmation: true }),
        });
      } catch (emailError) {
        console.error("[WEBHOOK] Error sending confirmation email:", emailError);
      }

      try {
        await fetch(`${supabaseUrl}/functions/v1/notify-admins-new-reservation`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ reservation }),
        });
      } catch (notifyError) {
        console.error("[WEBHOOK] Error sending push notification:", notifyError);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Reservation auto-created", reservationId: reservation.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook received" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
