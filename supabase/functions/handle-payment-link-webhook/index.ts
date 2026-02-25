import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    // Get webhook secret from settings
    const { data: webhookSecretData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "stripe_webhook_secret")
      .maybeSingle();

    const webhookSecret = webhookSecretData?.value;

    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!signature) {
      console.error("No stripe-signature header");
      return new Response(
        JSON.stringify({ error: "No signature provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify webhook signature
    let event;
    try {
      // Manual signature verification since we can't use Stripe SDK in Deno edge functions
      const crypto = globalThis.crypto.subtle;
      const encoder = new TextEncoder();

      // Extract timestamp and signatures from header
      const signatureParts = signature.split(',');
      let timestamp = '';
      const signatures: string[] = [];

      for (const part of signatureParts) {
        const [key, value] = part.split('=');
        if (key === 't') timestamp = value;
        if (key === 'v1') signatures.push(value);
      }

      if (!timestamp || signatures.length === 0) {
        throw new Error("Invalid signature format");
      }

      // Check timestamp tolerance (5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      const timestampNum = parseInt(timestamp, 10);
      if (currentTime - timestampNum > 300) {
        throw new Error("Timestamp too old");
      }

      // Construct signed payload
      const signedPayload = `${timestamp}.${body}`;

      // Compute expected signature
      // Stripe webhook secrets are "whsec_" + base64, so decode the base64 part
      const base64Part = webhookSecret.startsWith('whsec_') ? webhookSecret.slice(6) : webhookSecret;
      const keyBytes = Uint8Array.from(atob(base64Part), c => c.charCodeAt(0));
      const keyData = keyBytes;
      const messageData = encoder.encode(signedPayload);

      const cryptoKey = await crypto.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.sign('HMAC', cryptoKey, messageData);
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const expectedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Compare with provided signatures
      const signatureValid = signatures.some(sig => sig === expectedSignature);

      if (!signatureValid) {
        console.error("Signature verification failed");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("✓ Webhook signature verified");
      event = JSON.parse(body);
    } catch (err) {
      console.error("Signature verification error:", err);
      return new Response(
        JSON.stringify({ error: "Signature verification failed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Webhook event received:", event.type);

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentIntentId = session.payment_intent;
      const customerEmail = session.customer_details?.email;
      const metadata = session.metadata || {};

      console.log("Payment completed for:", customerEmail);
      console.log("Payment intent:", paymentIntentId);
      console.log("Session metadata:", metadata);

      let reservation = null;
      let findError = null;

      // First try to find by booking_code from metadata (most reliable for payment links)
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

      // If not found by booking code, try by reservation_id from metadata
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

      // If still not found, try by payment intent or customer email
      if (!reservation && (paymentIntentId || customerEmail)) {
        console.log("Looking for reservation by payment_intent or email");
        const { data: reservations, error } = await supabase
          .from("reservations")
          .select("*")
          .or(`stripe_payment_intent_id.eq.${paymentIntentId},customer_email.eq.${customerEmail}`)
          .eq("payment_status", "unpaid")
          .order("created_at", { ascending: false })
          .limit(1);

        reservation = reservations && reservations.length > 0 ? reservations[0] : null;
        findError = error;
      }

      if (findError) {
        console.error("Error finding reservation:", findError);
        return new Response(
          JSON.stringify({ error: "Database error" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (reservation) {

        // Update the reservation to mark as paid and confirmed
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
          return new Response(
            JSON.stringify({ error: "Failed to update reservation" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log("Reservation updated successfully:", reservation.id);

        // Notify admins via push notification
        try {
          await fetch(`${supabaseUrl}/functions/v1/notify-admins-new-reservation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ reservation }),
          });
        } catch (notifyError) {
          console.error("[WEBHOOK] Error sending push notification:", notifyError);
        }

        // Send payment confirmation email
        try {
          const emailUrl = `${supabaseUrl}/functions/v1/send-reservation-confirmation-email`;
          console.log('[WEBHOOK] Calling email function:', emailUrl);
          console.log('[WEBHOOK] Reservation ID:', reservation.id);

          const emailResponse = await fetch(emailUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              reservationId: reservation.id,
              is_payment_confirmation: true,
            }),
          });

          const emailResponseText = await emailResponse.text();
          console.log('[WEBHOOK] Email function status:', emailResponse.status);
          console.log('[WEBHOOK] Email function response:', emailResponseText);

          if (!emailResponse.ok) {
            console.error("[WEBHOOK] Failed to send payment confirmation email - Status:", emailResponse.status, "Response:", emailResponseText);
          } else {
            console.log("[WEBHOOK] Payment confirmation email sent successfully");
          }
        } catch (emailError) {
          console.error("[WEBHOOK] Error calling email function:", emailError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment processed successfully",
            reservationId: reservation.id
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        console.log("No matching reservation found for payment");
        return new Response(
          JSON.stringify({
            success: true,
            message: "No reservation found to update"
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Return success for other event types
    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook received"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
