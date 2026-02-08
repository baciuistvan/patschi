import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const giftCardId = formData.get("giftCardId") as string;
    const pdfFile = formData.get("pdf") as File;

    if (!giftCardId || !pdfFile) {
      throw new Error("Missing gift card ID or PDF file");
    }

    // Upload PDF to Supabase Storage
    const fileName = `gift-card-${giftCardId}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("gift-cards")
      .upload(fileName, pdfFile, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload PDF");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("gift-cards")
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Update gift card with PDF URL
    const { error: updateError } = await supabase
      .from("gift_cards")
      .update({ pdf_url: pdfUrl })
      .eq("id", giftCardId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to update gift card");
    }

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: pdfUrl,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to upload PDF",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
