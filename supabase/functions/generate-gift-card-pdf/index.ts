import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const A4_W = 595.28;
const A4_H = 841.89;

function mm(v: number): number {
  return v * 2.8346;
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function dashedRect(
  page: ReturnType<PDFDocument["addPage"]>,
  x: number, y: number, w: number, h: number,
  dash = 6, gap = 4, thickness = 1
) {
  const sides: Array<[number, number, number, number]> = [
    [x, y + h, x + w, y + h],
    [x + w, y + h, x + w, y],
    [x + w, y, x, y],
    [x, y, x, y + h],
  ];
  for (const [x1, y1, x2, y2] of sides) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len, uy = dy / len;
    let d = 0, on = true;
    while (d < len) {
      const seg = on ? Math.min(dash, len - d) : Math.min(gap, len - d);
      if (on) {
        page.drawLine({
          start: { x: x1 + ux * d, y: y1 + uy * d },
          end: { x: x1 + ux * (d + seg), y: y1 + uy * (d + seg) },
          thickness,
          color: rgb(0, 0, 0),
        });
      }
      d += seg;
      on = !on;
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { giftCardId } = await req.json();
    if (!giftCardId) {
      return new Response(JSON.stringify({ error: "giftCardId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: giftCard, error: fetchError } = await supabaseClient
      .from("gift_cards").select("*").eq("id", giftCardId).single();

    if (fetchError || !giftCard) {
      return new Response(JSON.stringify({ error: "Gift card not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([A4_W, A4_H]);
    const W = A4_W, H = A4_H;

    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const courier = await pdfDoc.embedFont(StandardFonts.CourierBold);

    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });

    const bgBytes = await fetchBytes(`${supabaseUrl}/storage/v1/object/public/images/image00398.jpeg`);
    if (bgBytes) {
      try {
        const bgImg = await pdfDoc.embedJpg(bgBytes);
        const { width: iw, height: ih } = bgImg.scale(1);
        const imgAR = iw / ih, pageAR = W / H;
        let dw: number, dh: number, dx: number, dy: number;
        if (imgAR > pageAR) {
          dh = H; dw = dh * imgAR; dx = -(dw - W) / 2; dy = 0;
        } else {
          dw = W; dh = dw / imgAR; dx = 0; dy = -(dh - H) / 2;
        }
        page.drawImage(bgImg, { x: dx, y: dy, width: dw, height: dh, opacity: 0.2 });
      } catch { /* skip */ }
    }

    const logoBytes = await fetchBytes(`${supabaseUrl}/storage/v1/object/public/images/Patschi-Serfaus-Logo-transparent-schwarz.PNG`);
    const logoW = mm(60);
    if (logoBytes) {
      try {
        const logoImg = await pdfDoc.embedPng(logoBytes);
        const { width: lw, height: lh } = logoImg.scale(1);
        const logoH = (logoW / lw) * lh;
        page.drawImage(logoImg, {
          x: (W - logoW) / 2,
          y: H - mm(40) - logoH,
          width: logoW,
          height: logoH,
        });
      } catch {
        const t = "PATSCHI SERFAUS";
        page.drawText(t, { x: (W - bold.widthOfTextAtSize(t, 20)) / 2, y: H - mm(55), size: 20, font: bold, color: rgb(0.86, 0.15, 0.15) });
      }
    } else {
      const t = "PATSCHI SERFAUS";
      page.drawText(t, { x: (W - bold.widthOfTextAtSize(t, 20)) / 2, y: H - mm(55), size: 20, font: bold, color: rgb(0.86, 0.15, 0.15) });
    }

    const gt = "GUTSCHEIN";
    page.drawText(gt, { x: (W - bold.widthOfTextAtSize(gt, 32)) / 2, y: H - mm(100), size: 32, font: bold, color: rgb(0.86, 0.15, 0.15) });

    const balance = parseFloat(String(giftCard.current_balance)).toFixed(2);
    const amt = `\u20AC${balance}`;
    page.drawText(amt, { x: (W - bold.widthOfTextAtSize(amt, 64)) / 2, y: H - mm(135), size: 64, font: bold, color: rgb(0, 0, 0) });

    const bxM = mm(20), bxW = W - bxM * 2, bxH = mm(22), bxY = H - mm(170);
    page.drawRectangle({ x: bxM, y: bxY, width: bxW, height: bxH, color: rgb(0.973, 0.976, 0.98) });
    const lbl = "GESCHENK F\u00dcR:";
    page.drawText(lbl, { x: (W - regular.widthOfTextAtSize(lbl, 9)) / 2, y: bxY + mm(14), size: 9, font: regular, color: rgb(0.4, 0.4, 0.4) });
    const rn = giftCard.recipient_name || "Kunde";
    page.drawText(rn, { x: (W - bold.widthOfTextAtSize(rn, 18)) / 2, y: bxY + mm(5), size: 18, font: bold, color: rgb(0.86, 0.15, 0.15) });

    let curY = bxY - mm(8);

    if (giftCard.message) {
      const mH = mm(20), mY = curY - mH;
      page.drawRectangle({ x: bxM, y: mY, width: bxW, height: mH, color: rgb(0.941, 0.969, 0.945) });
      page.drawLine({ start: { x: bxM, y: mY }, end: { x: bxM, y: mY + mH }, thickness: 2, color: rgb(0, 0, 0) });
      const msg = `"${giftCard.message.substring(0, 80)}"`;
      page.drawText(msg, { x: (W - Math.min(regular.widthOfTextAtSize(msg, 10), bxW - mm(10))) / 2, y: mY + mm(8), size: 10, font: regular, color: rgb(0.33, 0.33, 0.33), maxWidth: bxW - mm(10) });
      curY = mY - mm(8);
    }

    page.drawLine({ start: { x: mm(75), y: curY }, end: { x: mm(135), y: curY }, thickness: 0.5, color: rgb(0, 0, 0) });

    const gtc = "GT CODE";
    page.drawText(gtc, { x: (W - regular.widthOfTextAtSize(gtc, 9)) / 2, y: curY - mm(10), size: 9, font: regular, color: rgb(0.4, 0.4, 0.4) });

    const cbM = mm(40), cbW = W - cbM * 2, cbH = mm(18), cbY = curY - mm(10) - mm(5) - cbH;
    dashedRect(page, cbM, cbY, cbW, cbH);
    const code = giftCard.code;
    page.drawText(code, { x: (W - courier.widthOfTextAtSize(code, 16)) / 2, y: cbY + (cbH - 16 * 0.75) / 2 + 2, size: 16, font: courier, color: rgb(0.86, 0.15, 0.15) });

    const detY = cbY - mm(12);
    const now = new Date().toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });
    const gl = "G\u00fcltig ab:";
    page.drawText(gl, { x: mm(30), y: detY, size: 11, font: bold, color: rgb(0.86, 0.15, 0.15) });
    page.drawText(now, { x: mm(30) + bold.widthOfTextAtSize(gl, 11) + mm(3), y: detY, size: 11, font: regular, color: rgb(0, 0, 0) });

    const discY = detY - mm(12);
    const d1 = "Dieser Gutschein kann f\u00fcr Speisen und Dienstleistungen verwendet werden.";
    const d2 = "Kein Wechselgeld oder Barauszahlung m\u00f6glich. Verlorene Gutscheine k\u00f6nnen nicht ersetzt werden.";
    page.drawText(d1, { x: (W - regular.widthOfTextAtSize(d1, 7)) / 2, y: discY, size: 7, font: regular, color: rgb(0, 0, 0) });
    page.drawText(d2, { x: (W - regular.widthOfTextAtSize(d2, 7)) / 2, y: discY - mm(5), size: 7, font: regular, color: rgb(0, 0, 0) });

    const f1 = "Patschi by K\u00f6hle GmbH, Dorfbahnstrasse 82, 6534 Serfaus";
    const f2 = "Tel. +43 5476 6290 | E-Mail: info@patschi.at";
    page.drawText(f1, { x: (W - regular.widthOfTextAtSize(f1, 7)) / 2, y: mm(15), size: 7, font: regular, color: rgb(0, 0, 0) });
    page.drawText(f2, { x: (W - regular.widthOfTextAtSize(f2, 7)) / 2, y: mm(10), size: 7, font: regular, color: rgb(0, 0, 0) });

    const pdfBytes = await pdfDoc.save();
    const fileName = `gift-card-${giftCard.code}.pdf`;

    const { error: uploadError } = await supabaseClient.storage.from("gift-cards").upload(fileName, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) {
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: publicUrlData } = supabaseClient.storage.from("gift-cards").getPublicUrl(fileName);
    const pdfUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabaseClient.from("gift_cards").update({ pdf_url: pdfUrl }).eq("id", giftCardId);
    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update gift card" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, pdfUrl, message: "PDF generated and uploaded successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
