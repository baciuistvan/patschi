import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { giftCardId } = await req.json();

    if (!giftCardId) {
      return new Response(
        JSON.stringify({ error: "giftCardId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch gift card data
    const { data: giftCard, error: fetchError } = await supabaseClient
      .from("gift_cards")
      .select("*")
      .eq("id", giftCardId)
      .single();

    if (fetchError || !giftCard) {
      return new Response(
        JSON.stringify({ error: "Gift card not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const { width, height } = page.getSize();

    // Embed fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Background gradient effect (simulated with rectangles)
    const gradientSteps = 20;
    for (let i = 0; i < gradientSteps; i++) {
      const yPos = height - (height / gradientSteps) * i;
      const greenIntensity = 0.7 - (i / gradientSteps) * 0.4;
      page.drawRectangle({
        x: 0,
        y: yPos - height / gradientSteps,
        width: width,
        height: height / gradientSteps,
        color: rgb(0.06, greenIntensity, 0.38),
      });
    }

    // White content box
    page.drawRectangle({
      x: 40,
      y: 60,
      width: width - 80,
      height: height - 120,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.06, 0.73, 0.53),
      borderWidth: 3,
    });

    // Title
    page.drawText("GESCHENKGUTSCHEIN", {
      x: 60,
      y: height - 80,
      size: 32,
      font: boldFont,
      color: rgb(0.06, 0.73, 0.53),
    });

    // Subtitle
    page.drawText("Patschi by Köhle", {
      x: 60,
      y: height - 110,
      size: 18,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Recipient
    page.drawText(`Für: ${giftCard.recipient_name}`, {
      x: 60,
      y: height - 150,
      size: 16,
      font: boldFont,
      color: rgb(0.12, 0.16, 0.24),
    });

    // Amount (large and prominent)
    const amountText = `€${parseFloat(giftCard.amount).toFixed(2)}`;
    page.drawText(amountText, {
      x: width / 2 - 70,
      y: height - 210,
      size: 48,
      font: boldFont,
      color: rgb(0.06, 0.73, 0.53),
    });

    // Gift card code
    page.drawText("Gutschein-Code:", {
      x: 60,
      y: height - 260,
      size: 12,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(giftCard.code, {
      x: 60,
      y: height - 280,
      size: 16,
      font: boldFont,
      color: rgb(0.12, 0.16, 0.24),
    });

    // Barcode number
    page.drawText("Barcode:", {
      x: 60,
      y: height - 310,
      size: 12,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(giftCard.barcode, {
      x: 60,
      y: height - 330,
      size: 14,
      font: boldFont,
      color: rgb(0.12, 0.16, 0.24),
    });

    // Expiry date
    const expiryDate = new Date(giftCard.expiry_date).toLocaleDateString("de-DE");
    page.drawText(`Gültig bis: ${expiryDate}`, {
      x: width - 200,
      y: 80,
      size: 12,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Personal message if exists
    if (giftCard.message) {
      page.drawText("Nachricht:", {
        x: 60,
        y: 150,
        size: 11,
        font: boldFont,
        color: rgb(0.4, 0.4, 0.4),
      });

      const message = giftCard.message.substring(0, 100);
      page.drawText(`"${message}"`, {
        x: 60,
        y: 130,
        size: 10,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
        maxWidth: width - 120,
      });
    }

    // Footer
    page.drawText("Einlösbar im Patschi Restaurant, Serfaus", {
      x: width / 2 - 140,
      y: 30,
      size: 10,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Upload to Supabase Storage
    const fileName = `gift-card-${giftCard.code}.pdf`;
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from("gift-cards")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload PDF" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabaseClient
      .storage
      .from("gift-cards")
      .getPublicUrl(fileName);

    const pdfUrl = publicUrlData.publicUrl;

    // Update gift card with PDF URL
    const { error: updateError } = await supabaseClient
      .from("gift_cards")
      .update({ pdf_url: pdfUrl })
      .eq("id", giftCardId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update gift card" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl,
        message: "PDF generated and uploaded successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
