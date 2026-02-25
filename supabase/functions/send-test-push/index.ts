import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function b64urlToBytes(s: string): Uint8Array {
  const str = s.trim().replace(/-/g, "+").replace(/_/g, "/");
  const bytes: number[] = [];
  let buf = 0, bits = 0;
  for (const ch of str) {
    if (ch === "=") break;
    const val = B64.indexOf(ch);
    if (val < 0) continue;
    buf = (buf << 6) | val;
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 0xff); }
  }
  return new Uint8Array(bytes);
}

function bytesToB64url(b: Uint8Array): string {
  let out = "";
  for (let i = 0; i < b.length; i += 3) {
    const b0 = b[i], b1 = b[i + 1] ?? 0, b2 = b[i + 2] ?? 0;
    const n = (b0 << 16) | (b1 << 8) | b2;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += (i + 1 < b.length) ? B64[(n >> 6) & 63] : "=";
    out += (i + 2 < b.length) ? B64[n & 63] : "=";
  }
  return out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

function writeUint32BE(n: number): Uint8Array {
  return new Uint8Array([(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
}

async function importECDSAKey(pubB64url: string, privB64url: string): Promise<CryptoKey> {
  const pub = b64urlToBytes(pubB64url);
  if (pub.length !== 65 || pub[0] !== 0x04) throw new Error(`Bad pubkey len=${pub.length}`);
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC", crv: "P-256",
      x: bytesToB64url(pub.slice(1, 33)),
      y: bytesToB64url(pub.slice(33, 65)),
      d: bytesToB64url(b64urlToBytes(privB64url)),
      ext: true,
    } as JsonWebKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const ikmKey = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    ikmKey,
    length * 8
  );
  return new Uint8Array(bits);
}

async function encryptPayloadAes128gcm(
  payload: string,
  p256dhB64url: string,
  authB64url: string
): Promise<Uint8Array> {
  const recipientPub = b64urlToBytes(p256dhB64url);
  const authSecret = b64urlToBytes(authB64url);
  const plaintext = new TextEncoder().encode(payload);

  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const ephPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const recipKey = await crypto.subtle.importKey("raw", recipientPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhBits = await crypto.subtle.deriveBits({ name: "ECDH", public: recipKey }, ephemeral.privateKey, 256);
  const ecdhSecret = new Uint8Array(ecdhBits);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const prk = await hkdf(
    ecdhSecret,
    authSecret,
    concatBytes(
      new TextEncoder().encode("WebPush: info\0"),
      recipientPub,
      ephPubRaw
    ),
    32
  );

  const cek = await hkdf(prk, salt, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(prk, salt, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  const encKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const padded = concatBytes(plaintext, new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, encKey, padded));

  const rs = 4096;
  const header = concatBytes(
    salt,
    writeUint32BE(rs),
    new Uint8Array([ephPubRaw.length]),
    ephPubRaw
  );

  return concatBytes(header, ciphertext);
}

async function buildVapidJwt(origin: string, pubB64url: string, privB64url: string): Promise<string> {
  const key = await importECDSAKey(pubB64url, privB64url);
  const now = Math.floor(Date.now() / 1000);
  const encObj = (o: object) => {
    const json = JSON.stringify(o);
    let bin = "";
    for (let i = 0; i < json.length; i++) bin += String.fromCharCode(json.charCodeAt(i) & 0xff);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const hdr = encObj({ typ: "JWT", alg: "ES256" });
  const pay = encObj({ aud: origin, exp: now + 12 * 3600, sub: "mailto:push@restaurant.com" });
  const msg = `${hdr}.${pay}`;
  const sig = bytesToB64url(new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(msg))
  ));
  return `${msg}.${sig}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "BEE8-9TNYoyfhNZwH1fKUz5AmyBFvGKkhYnlnrqL4fIfvX4cCowHP-_lSGkEjsDtoq8m_IWTabtV34PkJvxNPSk";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "-QjjcVKAWxtwxZjfqlovkdD0apI4sUZl-WmIJc6_AOs";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscriptions, error } = await supabase
      .from("admin_push_subscriptions")
      .select("*")
      .eq("is_active", true);

    if (error) throw new Error(error.message);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active push subscriptions found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: "Test-Benachrichtigung",
      body: "Push-Benachrichtigungen funktionieren korrekt!",
      icon: "/crew-icon-180.png",
      badge: "/crew-icon-180.png",
    });

    const results: { endpoint: string; status: string; httpStatus?: number }[] = [];

    for (const sub of subscriptions) {
      try {
        const { origin } = new URL(sub.endpoint);
        const jwt = await buildVapidJwt(origin, vapidPublicKey, vapidPrivateKey);
        const body = await encryptPayloadAes128gcm(payload, sub.p256dh_key, sub.auth_key);

        const isApple = sub.endpoint.includes("web.push.apple.com");
        const pushHeaders: Record<string, string> = {
          Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
          "Content-Type": "application/octet-stream",
          "Content-Encoding": "aes128gcm",
          TTL: "86400",
        };
        if (isApple) {
          pushHeaders["apns-push-type"] = "alert";
          pushHeaders["apns-priority"] = "10";
        }

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: pushHeaders,
          body,
        });

        const responseText = await response.text().catch(() => "");
        const ok = response.ok || response.status === 201;
        results.push({
          endpoint: sub.endpoint.substring(0, 60) + "...",
          status: ok ? "sent" : `failed (${response.status}): ${responseText}`,
          httpStatus: response.status,
        });

        if (response.status === 410 || response.status === 404) {
          await supabase.from("admin_push_subscriptions").update({ is_active: false }).eq("endpoint", sub.endpoint);
        }
      } catch (subErr: unknown) {
        results.push({ endpoint: sub.endpoint.substring(0, 60) + "...", status: "error: " + String(subErr), httpStatus: 0 });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status !== "sent").length;

    return new Response(
      JSON.stringify({ success: sent > 0, sent, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
