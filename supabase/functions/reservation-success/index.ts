import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr: string): string {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const months = ['Januar', 'Februar', 'M\u00e4rz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function buildSuccessHtml(reservation: any): string {
  const name = escapeHtml(reservation.customer_name || '');
  const code = escapeHtml(reservation.booking_code || '');
  const email = escapeHtml(reservation.customer_email || '');
  const date = formatDate(reservation.reservation_date);
  const time = escapeHtml(reservation.reservation_time || '');
  const guests = reservation.party_size || 0;
  const guestLabel = guests === 1 ? 'Gast' : 'G\u00e4ste';
  const amount = reservation.payment_amount ? parseFloat(reservation.payment_amount) : 0;
  const specialRequests = reservation.special_requests ? escapeHtml(reservation.special_requests) : '';

  const paymentBlock = amount > 0 ? `
          <div class="flex items-start gap-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-500 mb-1">Bezahlter Betrag</p>
              <p class="font-bold text-green-700 text-xl">\u20ac${amount.toFixed(2)}</p>
              <p class="text-xs text-green-600 mt-1">\u2713 Zahlung erfolgreich abgeschlossen</p>
            </div>
          </div>` : '';

  const requestsBlock = specialRequests ? `
          <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div class="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-500 mb-1">Besondere W\u00fcnsche</p>
              <p class="text-gray-900">${specialRequests}</p>
            </div>
          </div>` : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservierung erfolgreich</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.6s ease-out; }
    @keyframes checkmark { 0% { transform: scale(0) rotate(45deg); } 50% { transform: scale(1.2) rotate(45deg); } 100% { transform: scale(1) rotate(45deg); } }
    .checkmark { animation: checkmark 0.6s ease-out 0.3s both; }
  </style>
</head>
<body class="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-2xl w-full">
    <div class="bg-white rounded-3xl shadow-2xl overflow-hidden fade-in">
      <div class="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center relative overflow-hidden">
        <div class="absolute inset-0 bg-white opacity-10"></div>
        <div class="relative z-10">
          <div class="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <svg class="w-10 h-10 text-green-600 checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">Zahlung erfolgreich!</h1>
          <p class="text-green-100">Ihre Reservierung wurde best\u00e4tigt</p>
        </div>
      </div>
      <div class="p-8">
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 mb-6 border-2 border-green-200 text-center">
          <p class="text-sm font-medium text-gray-600 mb-2">Ihr Buchungscode</p>
          <p class="text-4xl font-bold text-green-700 tracking-wider font-mono">${code}</p>
          <button onclick="copyCode()" id="copyBtn" class="mt-3 text-sm text-green-600 hover:text-green-700 font-medium flex items-center justify-center mx-auto gap-2 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            Code kopieren
          </button>
        </div>
        <div class="space-y-4 mb-6">
          <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-500 mb-1">Gast</p>
              <p class="font-semibold text-gray-900">${name}</p>
            </div>
          </div>
          <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-500 mb-1">Datum &amp; Zeit</p>
              <p class="font-semibold text-gray-900">${date} um ${time} Uhr</p>
            </div>
          </div>
          <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div class="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-xs text-gray-500 mb-1">Anzahl G\u00e4ste</p>
              <p class="font-semibold text-gray-900">${guests} ${guestLabel}</p>
            </div>
          </div>${paymentBlock}${requestsBlock}
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <div>
              <p class="text-sm font-medium text-blue-900 mb-1">Best\u00e4tigungs-E-Mail</p>
              <p class="text-sm text-blue-700">Eine detaillierte Best\u00e4tigung wurde an <span class="font-semibold">${email}</span> gesendet.</p>
            </div>
          </div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <div>
              <p class="text-sm font-medium text-yellow-900 mb-1">Wichtig</p>
              <p class="text-sm text-yellow-700">Bitte bewahren Sie Ihren Buchungscode auf. Sie ben\u00f6tigen ihn bei Ihrer Ankunft.</p>
            </div>
          </div>
        </div>
        <div class="text-center pt-6 border-t border-gray-200">
          <p class="text-sm text-gray-600 mb-2">Bei Fragen zu Ihrer Reservierung</p>
          <p class="text-sm font-medium text-gray-800">Kontaktieren Sie uns bitte direkt</p>
        </div>
      </div>
    </div>
    <div class="text-center mt-6">
      <button onclick="window.print()" class="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-gray-700 font-medium">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
        </svg>
        Best\u00e4tigung drucken
      </button>
    </div>
  </div>
  <script>
    function copyCode(){var c='${code}';navigator.clipboard.writeText(c).then(function(){var b=document.getElementById('copyBtn');b.innerHTML='<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path><\/svg> Kopiert!';b.classList.add('text-green-700');setTimeout(function(){location.reload()},2000)});}
  <\/script>
  <style media="print">body{background:white}button{display:none}</style>
</body>
</html>`;
}

function buildErrorHtml(): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservierung nicht gefunden</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.6s ease-out; }
  </style>
</head>
<body class="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <div class="bg-white rounded-3xl shadow-2xl p-8 text-center fade-in">
      <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-900 mb-3">Reservierung nicht gefunden</h2>
      <p class="text-gray-600 mb-6">Die angeforderte Reservierung konnte nicht geladen werden.</p>
      <p class="text-sm text-gray-500">Bitte \u00fcberpr\u00fcfen Sie Ihren Buchungscode oder kontaktieren Sie uns direkt.</p>
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
    const url = new URL(req.url);
    const bookingCode = url.searchParams.get('booking_code') || '';

    if (!bookingCode) {
      return new Response(buildErrorHtml(), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: reservation } = await supabase
      .from('reservations')
      .select('*')
      .eq('booking_code', bookingCode)
      .maybeSingle();

    if (!reservation) {
      return new Response(buildErrorHtml(), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    return new Response(buildSuccessHtml(reservation), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err: any) {
    return new Response(buildErrorHtml(), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
});
