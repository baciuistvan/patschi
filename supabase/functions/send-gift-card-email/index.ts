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
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Brand label -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Geschenkgutschein</p>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,0.12),0 4px 16px rgba(15,23,42,0.06);">

              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#f0fdf4;padding:40px 40px 32px 40px;text-align:center;border-bottom:1px solid #dcfce7;">
                    <div style="display:inline-block;width:72px;height:72px;background-color:#10b981;border-radius:50%;margin-bottom:20px;text-align:center;line-height:72px;">
                      <span style="color:#ffffff;font-size:36px;line-height:72px;">&#127873;</span>
                    </div>
                    <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">Sie haben einen Gutschein!</h1>
                    <p style="margin:0;font-size:15px;color:#475569;">{{purchaser_name}} hat Ihnen etwas Besonderes geschenkt.</p>
                  </td>
                </tr>
              </table>

              <!-- Amount highlight -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 40px 24px 40px;text-align:center;">
                    <p style="margin:0 0 10px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Gutscheinwert</p>
                    <div style="display:inline-block;background-color:#f0fdf4;border:2px solid #10b981;border-radius:16px;padding:14px 40px;">
                      <span style="font-size:36px;font-weight:800;color:#059669;letter-spacing:1px;">&#8364;{{amount}}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 28px 40px;">
                    <p style="margin:0;font-size:16px;color:#334155;line-height:1.65;">
                      Hallo <strong style="color:#0f172a;">{{recipient_name}}</strong>,<br><br>
                      <strong style="color:#0f172a;">{{purchaser_name}}</strong> hat Ihnen einen Geschenkgutschein im Wert von <strong style="color:#10b981;">&#8364;{{amount}}</strong> geschenkt. Wir freuen uns auf Ihren Besuch!
                    </p>
                  </td>
                </tr>
              </table>

              {{#if message}}
              <!-- Personal message -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 28px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:2px solid #fcd34d;border-radius:16px;">
                      <tr>
                        <td style="padding:18px 22px;">
                          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.1em;">Pers&ouml;nliche Nachricht</p>
                          <p style="margin:0;font-size:14px;color:#78350f;line-height:1.55;font-style:italic;">&ldquo;{{message}}&rdquo;</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              {{/if}}

              <!-- Details card -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 28px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:16px;border:2px solid #e2e8f0;">
                      <tr>
                        <td style="padding:24px 28px;">
                          <p style="margin:0 0 18px 0;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;">Gutschein-Details</p>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                            <tr>
                              <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Gutschein-Code</td>
                              <td style="padding:11px 0;font-size:15px;color:#0f172a;font-weight:700;text-align:right;font-family:'Courier New',Courier,monospace;letter-spacing:2px;">{{code}}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                            <tr>
                              <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Barcode</td>
                              <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">{{barcode}}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">G&uuml;ltig bis</td>
                              <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">{{expiry_date}}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- PDF download button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 40px 40px;text-align:center;">
                    <a href="{{pdf_url}}" style="display:inline-block;background-color:#10b981;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(16,185,129,0.4);">Gutschein als PDF herunterladen &rarr;</a>
                    <p style="margin:12px 0 0 0;font-size:12px;color:#94a3b8;">Das PDF enth&auml;lt alle Details und den Barcode zum Einl&ouml;sen.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0f172a;">Wir freuen uns auf Ihren Besuch!</p>
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                <strong style="color:#475569;">${settings.smtp_from_name || 'Restaurant'}</strong><br>
                ${settings.smtp_from_email || ''}
              </p>
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
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Kaufbest&auml;tigung</p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,0.12),0 4px 16px rgba(15,23,42,0.06);">

              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#f0fdf4;padding:40px 40px 32px 40px;text-align:center;border-bottom:1px solid #dcfce7;">
                    <div style="display:inline-block;width:72px;height:72px;background-color:#10b981;border-radius:50%;margin-bottom:20px;text-align:center;line-height:72px;">
                      <span style="color:#ffffff;font-size:36px;line-height:72px;">&#10003;</span>
                    </div>
                    <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">Kauf erfolgreich!</h1>
                    <p style="margin:0;font-size:15px;color:#475569;">Ihr Geschenkgutschein wurde erstellt und versendet.</p>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 40px 28px 40px;">
                    <p style="margin:0;font-size:16px;color:#334155;line-height:1.65;">
                      Hallo <strong style="color:#0f172a;">${giftCard.purchaser_name}</strong>,<br><br>
                      vielen Dank f&uuml;r Ihren Kauf! Ihr Geschenkgutschein wurde erfolgreich erstellt und direkt an <strong style="color:#0f172a;">${giftCard.recipient_email}</strong> gesendet.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Details card -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 40px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:16px;border:2px solid #e2e8f0;">
                      <tr>
                        <td style="padding:24px 28px;">
                          <p style="margin:0 0 18px 0;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;">Gutschein-Details</p>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                            <tr>
                              <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Gutschein-Code</td>
                              <td style="padding:11px 0;font-size:15px;color:#0f172a;font-weight:700;text-align:right;font-family:'Courier New',Courier,monospace;letter-spacing:2px;">${giftCard.code}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                            <tr>
                              <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Betrag</td>
                              <td style="padding:11px 0;font-size:20px;color:#10b981;font-weight:800;text-align:right;">&#8364;${buyerAmount}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                            <tr>
                              <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Empf&auml;nger</td>
                              <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">${giftCard.recipient_name || giftCard.recipient_email}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">G&uuml;ltig bis</td>
                              <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">${buyerExpiryDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Info notice -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 40px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border:2px solid #bfdbfe;border-radius:16px;">
                      <tr>
                        <td style="padding:18px 22px;">
                          <p style="margin:0;font-size:13px;color:#1e3a8a;line-height:1.7;">
                            Eine Kopie des Gutscheins wurde an die E-Mail-Adresse des Empf&auml;ngers gesendet. Der Gutschein kann direkt bei uns eingel&ouml;st werden.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0f172a;">Vielen Dank f&uuml;r Ihr Vertrauen!</p>
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                <strong style="color:#475569;">${settings.smtp_from_name || 'Restaurant'}</strong><br>
                ${settings.smtp_from_email || ''}
              </p>
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
