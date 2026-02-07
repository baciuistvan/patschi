import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const bookingCode = url.searchParams.get('booking_code') || '';

  const redirectUrl = `https://qwwerwkekvmaswusvgxy.supabase.co/reservation-success.html?booking_code=${bookingCode}`;

  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectUrl,
    },
  });
});
