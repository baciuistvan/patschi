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
      htmlBody = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ihr Geschenkgutschein</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#ffffff;border-radius:4px;overflow:hidden;box-shadow:6px 6px 9px rgba(0,0,0,0.12);">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Logo header -->
                <tr>
                  <td style="background-color:#1e1e1e;padding:28px 40px 20px 40px;text-align:center;">
                    <img src="https://patschi.at/wp-content/uploads/2023/04/cropped-Patschi-Logo-neu-transparent-e1757582721442.png" alt="Patschi Serfaus" width="180" style="max-width:180px;height:auto;display:block;margin:0 auto 12px auto;" />
                    <p style="margin:0;font-size:12px;color:#b8924a;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;">Geschenkgutschein</p>
                  </td>
                </tr>

                <!-- Status header -->
                <tr>
                  <td style="background-color:#f5eddc;padding:28px 40px 24px 40px;text-align:center;border-bottom:1px solid #e0d4bb;">
                    <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1e1e1e;letter-spacing:-0.3px;">Sie haben einen Gutschein!</h1>
                    <p style="margin:0;font-size:14px;color:#5a5550;">{{purchaser_name}} hat Ihnen etwas Besonderes geschenkt.</p>
                  </td>
                </tr>

                <!-- Amount highlight -->
                <tr>
                  <td style="padding:28px 40px 20px 40px;text-align:center;">
                    <p style="margin:0 0 8px 0;font-size:11px;color:#9a948e;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Gutscheinwert</p>
                    <div style="display:inline-block;background-color:#f5eddc;border:2px solid #b8924a;border-radius:4px;padding:14px 40px;">
                      <span style="font-size:34px;font-weight:800;color:#b8924a;letter-spacing:1px;">&#8364;{{amount}}</span>
                    </div>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <p style="margin:0;font-size:15px;color:#3a3a3a;line-height:1.7;">
                      Hallo <strong style="color:#1e1e1e;">{{recipient_name}}</strong>,<br><br>
                      <strong style="color:#1e1e1e;">{{purchaser_name}}</strong> hat Ihnen einen Geschenkgutschein im Wert von <strong style="color:#b8924a;">&#8364;{{amount}}</strong> geschenkt. Wir freuen uns auf Ihren Besuch!
                    </p>
                  </td>
                </tr>

                {{#if message}}
                <!-- Personal message -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #f0d080;border-radius:4px;">
                      <tr>
                        <td style="padding:14px 18px;">
                          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.1em;">Pers&ouml;nliche Nachricht</p>
                          <p style="margin:0;font-size:14px;color:#78350f;line-height:1.55;font-style:italic;">&ldquo;{{message}}&rdquo;</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                {{/if}}

                <!-- Details card -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;border-radius:4px;border:1px solid #d4cec4;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0 0 14px 0;font-size:11px;font-weight:700;color:#1e1e1e;text-transform:uppercase;letter-spacing:0.1em;">Gutschein-Details</p>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                            <tr>
                              <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Gutschein-Code</td>
                              <td style="padding:10px 0;font-size:15px;color:#1e1e1e;font-weight:700;text-align:right;font-family:'Courier New',Courier,monospace;letter-spacing:2px;">{{code}}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                            <tr>
                              <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Barcode</td>
                              <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">{{barcode}}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">G&uuml;ltig bis</td>
                              <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">{{expiry_date}}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- PDF download button -->
                <tr>
                  <td style="padding:0 40px 32px 40px;text-align:center;">
                    <a href="{{pdf_url}}" style="display:inline-block;background-color:#b8924a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:4px;font-size:15px;font-weight:700;letter-spacing:0.02em;">Gutschein als PDF herunterladen &rarr;</a>
                    <p style="margin:10px 0 0 0;font-size:12px;color:#9a948e;">Das PDF enth&auml;lt alle Details und den Barcode zum Einl&ouml;sen.</p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:28px 40px 32px 40px;text-align:center;border-top:1px solid #ede8e0;">
                    <p style="margin:0 0 2px 0;font-size:14px;font-weight:700;color:#1e1e1e;">${settings.smtp_from_name || 'Patschi Serfaus'}</p>
                    <p style="margin:0 0 10px 0;font-size:11px;color:#b8b2aa;letter-spacing:0.05em;">Patschi &bull; by K&ouml;hle</p>
                    <p style="margin:0;font-size:12px;color:#9a948e;line-height:1.8;">
                      <strong style="color:#5a5550;">Kontakt</strong><br>
                      Email: <a href="mailto:info@patschi.at" style="color:#b8924a;text-decoration:none;">info@patschi.at</a><br>
                      Tel: +43 (0) 5476 6290<br>
                      Dorfbahnstra&szlig;e 82, 6534 Serfaus
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      const buyerExpiryDate = new Date(giftCard.expiry_date).toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" });
      const buyerAmount = Number(giftCard.original_amount).toFixed(2);
      const buyerHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Geschenkgutschein erfolgreich gekauft</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#ffffff;border-radius:4px;overflow:hidden;box-shadow:6px 6px 9px rgba(0,0,0,0.12);">
              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Logo header -->
                <tr>
                  <td style="background-color:#1e1e1e;padding:28px 40px 20px 40px;text-align:center;">
                    <img src="https://patschi.at/wp-content/uploads/2023/04/cropped-Patschi-Logo-neu-transparent-e1757582721442.png" alt="Patschi Serfaus" width="180" style="max-width:180px;height:auto;display:block;margin:0 auto 12px auto;" />
                    <p style="margin:0;font-size:12px;color:#b8924a;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;">Kaufbest&auml;tigung</p>
                  </td>
                </tr>

                <!-- Status header -->
                <tr>
                  <td style="background-color:#eaf2ed;padding:28px 40px 24px 40px;text-align:center;border-bottom:1px solid #c6dece;">
                    <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1e1e1e;letter-spacing:-0.3px;">Kauf erfolgreich!</h1>
                    <p style="margin:0;font-size:14px;color:#5a5550;">Ihr Geschenkgutschein wurde erstellt und versendet.</p>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding:28px 40px 24px 40px;">
                    <p style="margin:0;font-size:15px;color:#3a3a3a;line-height:1.7;">
                      Hallo <strong style="color:#1e1e1e;">${giftCard.purchaser_name}</strong>,<br><br>
                      vielen Dank f&uuml;r Ihren Kauf! Ihr Geschenkgutschein wurde erfolgreich erstellt und direkt an <strong style="color:#1e1e1e;">${giftCard.recipient_email}</strong> gesendet.
                    </p>
                  </td>
                </tr>

                <!-- Details card -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;border-radius:4px;border:1px solid #d4cec4;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0 0 14px 0;font-size:11px;font-weight:700;color:#1e1e1e;text-transform:uppercase;letter-spacing:0.1em;">Gutschein-Details</p>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                            <tr>
                              <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Gutschein-Code</td>
                              <td style="padding:10px 0;font-size:15px;color:#1e1e1e;font-weight:700;text-align:right;font-family:'Courier New',Courier,monospace;letter-spacing:2px;">${giftCard.code}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                            <tr>
                              <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Betrag</td>
                              <td style="padding:10px 0;font-size:18px;color:#b8924a;font-weight:800;text-align:right;">&#8364;${buyerAmount}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                            <tr>
                              <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Empf&auml;nger</td>
                              <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">${giftCard.recipient_name || giftCard.recipient_email}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">G&uuml;ltig bis</td>
                              <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">${buyerExpiryDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Info notice -->
                <tr>
                  <td style="padding:0 40px 32px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f8;border:1px solid #c4d0e8;border-radius:4px;">
                      <tr>
                        <td style="padding:14px 18px;">
                          <p style="margin:0;font-size:13px;color:#3a5a8a;line-height:1.7;">
                            Eine Kopie des Gutscheins wurde an die E-Mail-Adresse des Empf&auml;ngers gesendet. Der Gutschein kann direkt bei uns eingel&ouml;st werden.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:28px 40px 32px 40px;text-align:center;border-top:1px solid #ede8e0;">
                    <p style="margin:0 0 2px 0;font-size:14px;font-weight:700;color:#1e1e1e;">${settings.smtp_from_name || 'Patschi Serfaus'}</p>
                    <p style="margin:0 0 10px 0;font-size:11px;color:#b8b2aa;letter-spacing:0.05em;">Patschi &bull; by K&ouml;hle</p>
                    <p style="margin:0;font-size:12px;color:#9a948e;line-height:1.8;">
                      <strong style="color:#5a5550;">Kontakt</strong><br>
                      Email: <a href="mailto:info@patschi.at" style="color:#b8924a;text-decoration:none;">info@patschi.at</a><br>
                      Tel: +43 (0) 5476 6290<br>
                      Dorfbahnstra&szlig;e 82, 6534 Serfaus
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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
