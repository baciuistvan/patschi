import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const bookingCode = url.searchParams.get('booking_code');

    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'frontend_url')
      .maybeSingle();

    let redirectUrl = settings?.value || 'https://qwwerwkekvmaswusvgxy.supabase.co';
    redirectUrl = redirectUrl.replace(/\/$/, '');
    redirectUrl = `${redirectUrl}/reservation-success.html${bookingCode ? `?booking_code=${bookingCode}` : ''}`;

    return new Response(null, {
      status: 303,
      headers: {
        "Location": redirectUrl,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
