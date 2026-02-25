import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function importVapidKeys(publicKeyB64: string, privateKeyB64: string): Promise<CryptoKeyPair> {
  const pubKeyBytes = urlBase64ToUint8Array(publicKeyB64);
  const privKeyBytes = urlBase64ToUint8Array(privateKeyB64);

  const publicKey = await crypto.subtle.importKey(
    "raw",
    pubKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  return { publicKey, privateKey };
}

async function signVapidJwt(
  audience: string,
  subject: string,
  publicKeyB64: string,
  privateKeyB64: string
): Promise<{ authorization: string; vapidPublicKey: string }> {
  const privKeyBytes = urlBase64ToUint8Array(privateKeyB64);

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsigned = `${encode(header)}.${encode(payload)}`;
  const sigBytes = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsigned)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsigned}.${sig}`;

  return {
    authorization: `vapid t=${jwt}, k=${publicKeyB64}`,
    vapidPublicKey: publicKeyB64,
  };
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const { authorization } = await signVapidJwt(
      audience,
      "mailto:admin@restaurant.com",
      vapidPublicKey,
      vapidPrivateKey
    );

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        Authorization: authorization,
        TTL: "86400",
        Urgency: "high",
      },
      body: new TextEncoder().encode(payload),
    });

    return response.ok || response.status === 201;
  } catch (err) {
    console.error("Failed to send push to endpoint:", subscription.endpoint, err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { reservation } = await req.json();

    if (!reservation) {
      return new Response(
        JSON.stringify({ error: "Missing reservation data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: subscriptions, error: subError } = await supabase
      .from("admin_push_subscriptions")
      .select("*")
      .eq("is_active", true);

    if (subError) {
      throw new Error(`Failed to load subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationPayload = JSON.stringify({
      title: "Neue Reservierung",
      body: `${reservation.customer_name} – ${reservation.party_size} Personen um ${reservation.reservation_time}`,
      icon: "/crew-icon-180.png",
      badge: "/crew-icon-180.png",
      data: {
        reservationId: reservation.id,
        url: "/",
      },
    });

    let sent = 0;
    let failed = 0;
    const staleEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const success = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh_key: sub.p256dh_key, auth_key: sub.auth_key },
        notificationPayload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (success) {
        sent++;
      } else {
        failed++;
        staleEndpoints.push(sub.endpoint);
      }
    }

    if (staleEndpoints.length > 0) {
      await supabase
        .from("admin_push_subscriptions")
        .update({ is_active: false })
        .in("endpoint", staleEndpoints);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("notify-admins-new-reservation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
