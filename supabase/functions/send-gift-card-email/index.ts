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

    const { giftCardId } = await req.json();

    if (!giftCardId) {
      throw new Error("Missing gift card ID");
    }

    // Get gift card details
    const { data: giftCard, error: fetchError } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("id", giftCardId)
      .single();

    if (fetchError || !giftCard) {
      throw new Error("Gift card not found");
    }

    const emailTo = giftCard.recipient_email || giftCard.purchaser_email;
    if (!emailTo) {
      throw new Error("No email address available");
    }

    // PDF is optional - if not available, we'll send email without it
    const hasPdf = !!giftCard.pdf_url;

    // Get SMTP and email template settings from key-value table
    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email", "smtp_from_name",
        "gift_card_email_subject", "gift_card_email_body_html", "gift_card_email_body_text", "gift_card_email_from_name"
      ]);

    if (!settingsRows || settingsRows.length === 0) {
      throw new Error("SMTP not configured");
    }

    // Convert key-value pairs to object
    const settings: any = {};
    settingsRows.forEach((row: any) => {
      settings[row.key] = row.value;
    });

    if (!settings.smtp_host) {
      throw new Error("SMTP host not configured");
    }

    // Prepare template variables
    const expiryDate = new Date(giftCard.expiry_date).toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
    const templateVars = {
      recipient_name: giftCard.recipient_name || "Kunde",
      purchaser_name: giftCard.purchaser_name || "Jemand",
      code: giftCard.code,
      barcode: giftCard.barcode,
      amount: Number(giftCard.original_amount).toFixed(2),
      expiry_date: expiryDate,
      message: giftCard.message || "",
      pdf_url: giftCard.pdf_url || "#"
    };

    // Function to replace template variables
    const replaceTemplateVars = (template: string, vars: any): string => {
      let result = template;
      Object.keys(vars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, vars[key]);
      });
      return result;
    };

    // Get subject from settings or use default
    const subject = settings.gift_card_email_subject || "Ihr Geschenkgutschein";

    // Get HTML template from settings or use default
    let htmlBody = settings.gift_card_email_body_html;
    if (!htmlBody) {
      // Fallback to default template if not configured
      htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎁 Ihr Geschenkgutschein</h1>
          </div>
          <div class="content">
            <p>Hallo {{recipient_name}},</p>
            <p><strong>{{purchaser_name}}</strong> hat Ihnen einen Geschenkgutschein im Wert von <strong>€{{amount}}</strong> geschenkt!</p>
            <div class="details">
              <p><strong>Gutschein-Code:</strong> {{code}}</p>
              <p><strong>Barcode:</strong> {{barcode}}</p>
              <p><strong>Gültig bis:</strong> {{expiry_date}}</p>
            </div>
            <p>Ihr Gutschein ist als PDF verfügbar.</p>
            <a href="{{pdf_url}}" class="button">Gutschein herunterladen</a>
            <p>Wir freuen uns auf Ihren Besuch!</p>
          </div>
        </div>
      </body>
      </html>
      `;
    }
    htmlBody = replaceTemplateVars(htmlBody, templateVars);

    // Get text template from settings or use default
    let textBody = settings.gift_card_email_body_text;
    if (!textBody) {
      textBody = `
Hallo {{recipient_name}},

{{purchaser_name}} hat Ihnen einen Geschenkgutschein im Wert von €{{amount}} geschenkt!

Gutschein-Code: {{code}}
Barcode: {{barcode}}
Gültig bis: {{expiry_date}}

Laden Sie Ihren Gutschein herunter: {{pdf_url}}

Wir freuen uns auf Ihren Besuch!
      `.trim();
    }
    textBody = replaceTemplateVars(textBody, templateVars);

    // Use gift card specific from name if configured
    const fromName = settings.gift_card_email_from_name || settings.smtp_from_name || "Reservierungssystem";

    // Send email using SMTP
    const emailPayload = {
      to: emailTo,
      from: {
        email: settings.smtp_from_email,
        name: fromName,
      },
      subject,
      html: htmlBody,
      text: textBody,
    };

    // Use nodemailer-like approach
    const nodemailer = await import("npm:nodemailer@6.9.8");
    const transporter = nodemailer.default.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      secure: settings.smtp_port === 465,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_password,
      },
    });

    await transporter.sendMail({
      from: `"${emailPayload.from.name}" <${emailPayload.from.email}>`,
      to: emailPayload.to,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html,
    });

    // Also send confirmation to buyer if different from recipient
    if (giftCard.purchaser_email && giftCard.purchaser_email !== giftCard.recipient_email) {
      const buyerSubject = "Bestätigung - Geschenkgutschein gekauft";
      const buyerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Geschenkgutschein erfolgreich gekauft</h1>
            </div>
            <div class="content">
              <p>Hallo ${giftCard.purchaser_name},</p>

              <p>Vielen Dank für Ihren Kauf! Ihr Geschenkgutschein wurde erfolgreich erstellt und an <strong>${giftCard.recipient_email}</strong> versendet.</p>

              <div class="details">
                <p><strong>Gutschein-Code:</strong> ${giftCard.code}</p>
                <p><strong>Betrag:</strong> €${Number(giftCard.original_amount).toFixed(2)}</p>
                <p><strong>Empfänger:</strong> ${giftCard.recipient_name || giftCard.recipient_email}</p>
                <p><strong>Gültig bis:</strong> ${new Date(giftCard.expiry_date).toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>

              <p>Eine Kopie des Gutscheins wurde an die E-Mail-Adresse des Empfängers gesendet.</p>

              <div class="footer">
                <p>Vielen Dank für Ihr Vertrauen!</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"${settings.smtp_from_name || 'Reservierungssystem'}" <${settings.smtp_from_email}>`,
        to: giftCard.purchaser_email,
        subject: buyerSubject,
        html: buyerHtml,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send email",
        details: error.toString(),
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
