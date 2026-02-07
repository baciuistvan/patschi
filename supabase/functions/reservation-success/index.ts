import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const successPageHTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservierung erfolgreich</title>
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

      <div class="bg-green-50 rounded-xl p-6 mb-6" id="bookingInfo">
        <p class="text-sm text-gray-600 mb-2">Buchungscode</p>
        <p class="text-2xl font-bold text-green-700" id="bookingCode">-</p>
      </div>

      <div class="text-sm text-gray-600 space-y-2">
        <p>Sie erhalten in Kürze eine Bestätigungs-E-Mail mit allen Details Ihrer Reservierung.</p>
        <p class="font-medium text-gray-800">Bitte bewahren Sie Ihren Buchungscode auf.</p>
      </div>

      <div class="mt-8 pt-6 border-t border-gray-200">
        <p class="text-xs text-gray-500">
          Bei Fragen zu Ihrer Reservierung kontaktieren Sie uns bitte direkt.
        </p>
      </div>
    </div>
  </div>

  <script>
    // Get booking code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const bookingCode = urlParams.get('booking_code');

    if (bookingCode) {
      document.getElementById('bookingCode').textContent = bookingCode;
    }
  </script>
</body>
</html>`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    return new Response(successPageHTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
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
