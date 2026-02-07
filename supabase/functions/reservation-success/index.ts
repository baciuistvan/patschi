import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FALLBACK_SUCCESS_URL = "https://playful-travesseiro-8cccaa.netlify.app/zahlung-erfolgreich.html";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const bookingCode = url.searchParams.get('booking_code') || '';

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: setting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'success_page_url')
      .maybeSingle();

    const baseUrl = setting?.value || FALLBACK_SUCCESS_URL;
    const separator = baseUrl.includes('?') ? '&' : '?';
    const redirectUrl = bookingCode
      ? `${baseUrl}${separator}booking_code=${encodeURIComponent(bookingCode)}`
      : baseUrl;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": redirectUrl,
      },
    });
  } catch (err: any) {
    const fallbackRedirect = `${FALLBACK_SUCCESS_URL}`;
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": fallbackRedirect,
      },
    });
  }
});
