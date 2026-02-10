import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate crew session token
    const { data: session, error: sessionError } = await supabase
      .from("crew_sessions")
      .select("crew_user_id, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Session expired. Please login again." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { code, redeemed_by } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Gift card code is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // First, verify the gift card exists and is valid
    const { data: giftCard, error: fetchError } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: "Database error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!giftCard) {
      return new Response(
        JSON.stringify({ success: false, message: "Gutschein nicht gefunden" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if already redeemed
    if (giftCard.is_redeemed || giftCard.status === 'used') {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Gutschein wurde bereits eingelöst",
          redeemed_at: giftCard.redeemed_at,
          redeemed_by: giftCard.redeemed_by,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if expired
    const now = new Date();
    const expiryDate = new Date(giftCard.expiry_date);
    if (expiryDate < now) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Gutschein ist abgelaufen",
          expiry_date: giftCard.expiry_date,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if cancelled
    if (giftCard.status === 'cancelled') {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Gutschein wurde storniert",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Redeem the gift card
    const { data: updatedGiftCard, error: updateError } = await supabase
      .from("gift_cards")
      .update({
        is_redeemed: true,
        redeemed_at: new Date().toISOString(),
        redeemed_by: redeemed_by || "Crew",
        status: 'used',
        current_balance: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("code", normalizedCode)
      .eq("is_redeemed", false) // Extra safety check
      .select()
      .maybeSingle();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to redeem gift card", details: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!updatedGiftCard) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Gutschein wurde bereits von jemand anderem eingelöst",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Gutschein erfolgreich eingelöst",
        giftCard: {
          code: updatedGiftCard.code,
          recipient_name: updatedGiftCard.recipient_name,
          original_amount: updatedGiftCard.original_amount,
          redeemed_at: updatedGiftCard.redeemed_at,
          redeemed_by: updatedGiftCard.redeemed_by,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
