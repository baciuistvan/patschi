import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function buildThankYouHtml(): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vielen Dank</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in {
      animation: fadeIn 0.6s ease-out;
    }
    @keyframes checkmark {
      0% { transform: scale(0) rotate(45deg); }
      50% { transform: scale(1.2) rotate(45deg); }
      100% { transform: scale(1) rotate(45deg); }
    }
    .checkmark {
      animation: checkmark 0.6s ease-out 0.3s both;
    }
  </style>
</head>
<body class="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-lg w-full">
    <div class="bg-white rounded-3xl shadow-2xl overflow-hidden fade-in">

      <!-- Header -->
      <div class="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center relative overflow-hidden">
        <div class="absolute inset-0 bg-white opacity-10"></div>
        <div class="relative z-10">
          <div class="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <svg class="w-10 h-10 text-green-600 checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">Vielen Dank!</h1>
          <p class="text-green-100">Ihre Zahlung war erfolgreich</p>
        </div>
      </div>

      <!-- Content -->
      <div class="p-8">

        <!-- Main Message -->
        <div class="text-center mb-6">
          <p class="text-lg text-gray-700 mb-4">
            Wir haben Ihnen eine E-Mail mit allen Details zu Ihrer Reservierung gesendet.
          </p>
          <p class="text-sm text-gray-600">
            Bitte überprüfen Sie auch Ihren Spam-Ordner, falls Sie die E-Mail nicht finden.
          </p>
        </div>

        <!-- Email Info -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <div>
              <p class="text-sm font-medium text-blue-900 mb-1">Bestätigungs-E-Mail</p>
              <p class="text-sm text-blue-700">In der E-Mail finden Sie Ihren Buchungscode und alle wichtigen Informationen zu Ihrer Reservierung.</p>
            </div>
          </div>
        </div>

        <!-- Important Note -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <div>
              <p class="text-sm font-medium text-yellow-900 mb-1">Wichtig</p>
              <p class="text-sm text-yellow-700">Bitte bewahren Sie Ihren Buchungscode auf. Sie benötigen ihn bei Ihrer Ankunft.</p>
            </div>
          </div>
        </div>

        <!-- Close Message -->
        <div class="text-center pt-6 border-t border-gray-200">
          <p class="text-sm text-gray-600 mb-2">Sie können dieses Fenster jetzt schließen.</p>
          <p class="text-sm font-medium text-gray-800">Wir freuen uns auf Ihren Besuch!</p>
        </div>

      </div>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "text/html; charset=utf-8");

    return new Response(buildThankYouHtml(), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('Error:', err);
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "text/html; charset=utf-8");

    return new Response(buildThankYouHtml(), {
      status: 200,
      headers,
    });
  }
});
