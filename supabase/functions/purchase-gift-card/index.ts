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

    const { amount, recipientName, recipientEmail, buyerName, buyerEmail, message } = await req.json();

    // Validate amount
    if (!amount || amount < 10) {
      throw new Error("Invalid amount. Minimum is €10");
    }

    // Generate unique gift card code and barcode
    const code = `GS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const barcode = Math.floor(Math.random() * 9e18).toString();

    // Calculate expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Create gift card in database with active status (bypassing payment for testing)
    const { data: giftCard, error: dbError } = await supabase
      .from("gift_cards")
      .insert({
        code,
        barcode,
        original_amount: amount,
        current_balance: amount,
        recipient_name: recipientName || null,
        recipient_email: recipientEmail || null,
        purchaser_name: buyerName,
        purchaser_email: buyerEmail,
        message: message || null,
        status: "active",
        expiry_date: expiryDate.toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to create gift card");
    }

    // Send gift card email immediately (bypassing Stripe webhook)
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-gift-card-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          giftCardId: giftCard.id,
        }),
      });
    } catch (emailError) {
      console.error("Error sending gift card email:", emailError);
      // Don't fail the request if email fails
    }

    // Return success with direct redirect (no Stripe checkout)
    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: `${req.headers.get("origin")}/gift-card-widget.html?success=true`,
        giftCardId: giftCard.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating gift card checkout:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create gift card checkout",
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
