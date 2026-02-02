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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { code } = await req.json();

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

    const { data: giftCard, error } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (error) {
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
        JSON.stringify({ valid: false, message: "Gutschein nicht gefunden" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date();
    const expiryDate = new Date(giftCard.expiry_date);
    const isExpired = expiryDate < now;

    if (isExpired) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Gutschein abgelaufen",
          giftCard: {
            code: giftCard.code,
            recipient_name: giftCard.recipient_name,
            original_amount: giftCard.original_amount,
            current_balance: giftCard.current_balance,
            status: giftCard.status,
            expiry_date: giftCard.expiry_date,
            is_redeemed: giftCard.is_redeemed,
            redeemed_at: giftCard.redeemed_at,
            redeemed_by: giftCard.redeemed_by,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (giftCard.is_redeemed || giftCard.status === 'used') {
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Gutschein bereits eingelöst",
          giftCard: {
            code: giftCard.code,
            recipient_name: giftCard.recipient_name,
            original_amount: giftCard.original_amount,
            current_balance: giftCard.current_balance,
            status: giftCard.status,
            expiry_date: giftCard.expiry_date,
            is_redeemed: giftCard.is_redeemed,
            redeemed_at: giftCard.redeemed_at,
            redeemed_by: giftCard.redeemed_by,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (giftCard.status === 'cancelled') {
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Gutschein wurde storniert",
          giftCard: {
            code: giftCard.code,
            recipient_name: giftCard.recipient_name,
            original_amount: giftCard.original_amount,
            current_balance: giftCard.current_balance,
            status: giftCard.status,
            expiry_date: giftCard.expiry_date,
            is_redeemed: giftCard.is_redeemed,
            redeemed_at: giftCard.redeemed_at,
            redeemed_by: giftCard.redeemed_by,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        message: "Gutschein gültig",
        giftCard: {
          code: giftCard.code,
          recipient_name: giftCard.recipient_name,
          original_amount: giftCard.original_amount,
          current_balance: giftCard.current_balance,
          status: giftCard.status,
          expiry_date: giftCard.expiry_date,
          is_redeemed: giftCard.is_redeemed,
          redeemed_at: giftCard.redeemed_at,
          redeemed_by: giftCard.redeemed_by,
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
