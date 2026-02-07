import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const url = new URL(req.url);
  const bookingCode = url.searchParams.get('booking_code') || '';

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  let reservation = null;
  let error = null;

  if (bookingCode) {
    const result = await supabase
      .from('reservations')
      .select(`
        *,
        rooms (
          name
        )
      `)
      .eq('booking_code', bookingCode)
      .maybeSingle();

    reservation = result.data;
    error = result.error;
  }

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservierung ${reservation ? 'erfolgreich' : 'nicht gefunden'}</title>
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

${reservation ? `
  <!-- Success State -->
  <div class="max-w-2xl w-full">
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
          <h1 class="text-3xl font-bold text-white mb-2">Zahlung erfolgreich!</h1>
          <p class="text-green-100">Ihre Reservierung wurde bestätigt</p>
        </div>
      </div>

      <!-- Content -->
      <div class="p-8">

        <!-- Booking Code -->
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 mb-6 border-2 border-green-200 text-center">
          <p class="text-sm font-medium text-gray-600 mb-2">Ihr Buchungscode</p>
          <p class="text-4xl font-bold text-green-700 tracking-wider font-mono">${reservation.booking_code}</p>
          <button onclick="copyBookingCode()" class="mt-3 text-sm text-green-600 hover:text-green-700 font-medium flex items-center justify-center mx-auto gap-2 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            Code kopieren
          </button>
        </div>

        <!-- Reservation Details -->
        <div class="space-y-4 mb-6">

          <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-500 mb-1">Gast</p>
              <p class="font-semibold text-gray-900">${reservation.customer_name}</p>
            </div>
          </div>

          ${reservation.rooms?.name ? `
          <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-500 mb-1">Raum</p>
              <p class="font-semibold text-gray-900">${reservation.rooms.name}</p>
            </div>
          </div>
          ` : ''}

          <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-500 mb-1">Datum & Zeit</p>
              <p class="font-semibold text-gray-900">${new Date(reservation.reservation_date).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} um ${reservation.reservation_time} Uhr</p>
            </div>
          </div>

          <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div class="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-500 mb-1">Anzahl Gäste</p>
              <p class="font-semibold text-gray-900">${reservation.party_size} ${reservation.party_size === 1 ? 'Gast' : 'Gäste'}</p>
            </div>
          </div>

          ${reservation.special_requests ? `
          <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div class="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-500 mb-1">Besondere Wünsche</p>
              <p class="text-gray-900">${reservation.special_requests}</p>
            </div>
          </div>
          ` : ''}

        </div>

        <!-- Email Confirmation -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <div>
              <p class="text-sm font-medium text-blue-900 mb-1">Bestätigungs-E-Mail</p>
              <p class="text-sm text-blue-700">Eine detaillierte Bestätigung wurde an <span class="font-semibold">${reservation.customer_email}</span> gesendet.</p>
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

        <!-- Contact Info -->
        <div class="text-center pt-6 border-t border-gray-200">
          <p class="text-sm text-gray-600 mb-2">Bei Fragen zu Ihrer Reservierung</p>
          <p class="text-sm font-medium text-gray-800">Kontaktieren Sie uns bitte direkt</p>
        </div>

      </div>
    </div>

    <!-- Print Button -->
    <div class="text-center mt-6">
      <button onclick="window.print()" class="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-gray-700 font-medium">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
        </svg>
        Bestätigung drucken
      </button>
    </div>
  </div>
` : `
  <!-- Error State -->
  <div class="max-w-md w-full">
    <div class="bg-white rounded-3xl shadow-2xl p-8 text-center fade-in">
      <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-900 mb-3">Reservierung nicht gefunden</h2>
      <p class="text-gray-600 mb-6">Die angeforderte Reservierung konnte nicht geladen werden.</p>
      <p class="text-sm text-gray-500">Bitte überprüfen Sie Ihren Buchungscode oder kontaktieren Sie uns direkt.</p>
    </div>
  </div>
`}

  <script>
    function copyBookingCode() {
      const bookingCode = '${reservation?.booking_code || ''}';
      navigator.clipboard.writeText(bookingCode).then(() => {
        const button = event.currentTarget;
        const originalText = button.innerHTML;
        button.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Kopiert!';
        button.classList.add('text-green-700');

        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove('text-green-700');
        }, 2000);
      });
    }
  </script>

  <style media="print">
    body {
      background: white;
    }
    button {
      display: none;
    }
  </style>

</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});
