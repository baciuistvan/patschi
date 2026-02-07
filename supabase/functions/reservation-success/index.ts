import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const bookingCode = url.searchParams.get('booking_code');

    // Get the frontend URL from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'frontend_url')
      .maybeSingle();

    // Use settings frontend URL or fallback to a default
    let redirectUrl = settings?.value || 'https://qwwerwkekvmaswusvgxy.supabase.co';

    // Remove trailing slash if present
    redirectUrl = redirectUrl.replace(/\/$/, '');

    // Redirect to the static HTML page with booking code
    redirectUrl = `${redirectUrl}/reservation-success.html${bookingCode ? `?booking_code=${bookingCode}` : ''}`;

    return new Response(null, {
      status: 303,
      headers: {
        "Location": redirectUrl,
      },
    });
  } catch (error) {
    console.error("Error:", error);

    // Fallback HTML if redirect fails
    return new Response(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zahlung erfolgreich</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
      <div class="mb-6">
        <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
      </div>
      <h1 class="text-3xl font-bold text-gray-900 mb-3">Zahlung erfolgreich!</h1>
      <p class="text-gray-600 mb-6">Ihre Reservierung wurde bestätigt.</p>
      <div class="bg-green-50 rounded-xl p-6 mb-6">
        <p class="text-sm text-gray-600 mb-2">Buchungscode</p>
        <p class="text-2xl font-bold text-green-700" id="bookingCode">-</p>
      </div>
    </div>
  </div>
  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const bookingCode = urlParams.get('booking_code');
    if (bookingCode) {
      document.getElementById('bookingCode').textContent = bookingCode;
    }
  </script>
</body>
</html>`, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
});
