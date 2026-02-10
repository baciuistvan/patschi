/*
  # Add Gift Card Email Template Settings

  1. New Settings
    - `gift_card_email_subject` - Subject line for gift card emails
    - `gift_card_email_body_html` - HTML template for gift card emails
    - `gift_card_email_body_text` - Plain text template for gift card emails
    - `gift_card_email_from_name` - Sender name for gift card emails
  
  2. Template Variables
    - {{recipient_name}} - Name of the gift card recipient
    - {{purchaser_name}} - Name of the person who purchased the gift card
    - {{code}} - Unique gift card code
    - {{barcode}} - Barcode number
    - {{amount}} - Gift card value
    - {{expiry_date}} - Expiration date
    - {{message}} - Personal message from purchaser
    - {{pdf_url}} - Download link for PDF gift card
  
  3. Changes
    - Inserts default gift card email templates if they don't exist
    - Templates are fully customizable from admin interface
*/

-- Insert gift card email subject if not exists
INSERT INTO settings (key, value)
VALUES ('gift_card_email_subject', 'Ihr Geschenkgutschein von Patschi 🎁')
ON CONFLICT (key) DO NOTHING;

-- Insert gift card sender name if not exists
INSERT INTO settings (key, value)
VALUES ('gift_card_email_from_name', 'Patschi Geschenkgutscheine')
ON CONFLICT (key) DO NOTHING;

-- Insert gift card HTML email template if not exists
INSERT INTO settings (key, value)
VALUES ('gift_card_email_body_html', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ihr Geschenkgutschein</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">

<!-- Header with Gift Icon -->
<tr>
<td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 50px 30px; text-align: center;">
<div style="font-size: 64px; margin-bottom: 16px;">🎁</div>
<h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 700; letter-spacing: -0.5px;">Ihr Geschenkgutschein</h1>
<p style="color: rgba(255,255,255,0.95); margin: 12px 0 0 0; font-size: 18px;">Ein besonderes Geschenk wartet auf Sie</p>
</td>
</tr>

<!-- Greeting -->
<tr>
<td style="padding: 40px 30px 20px 30px;">
<h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Liebe/r {{recipient_name}},</h2>
<p style="color: #4b5563; margin: 0; font-size: 16px; line-height: 1.7;">
<strong style="color: #1f2937;">{{purchaser_name}}</strong> hat Ihnen einen wundervollen Geschenkgutschein im Wert von <strong style="color: #10b981; font-size: 18px;">€{{amount}}</strong> geschenkt!
</p>
</td>
</tr>

<!-- Personal Message (if exists) -->
<tr>
<td style="padding: 0 30px 30px 30px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border-left: 4px solid #f59e0b;">
<tr>
<td style="padding: 20px;">
<p style="color: #92400e; margin: 0 0 8px 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">💌 Persönliche Nachricht</p>
<p style="color: #78350f; margin: 0; font-size: 15px; line-height: 1.6; font-style: italic;">"{{message}}"</p>
</td>
</tr>
</table>
</td>
</tr>

<!-- Gift Card Details -->
<tr>
<td style="padding: 0 30px 30px 30px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 10px; overflow: hidden; border: 2px solid #e5e7eb;">
<tr>
<td style="padding: 30px;">
<h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; text-align: center;">🎫 Gutschein-Details</h3>

<table width="100%" cellpadding="12" cellspacing="0">
<tr>
<td style="color: #6b7280; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">Gutschein-Code</td>
<td style="color: #1f2937; font-size: 16px; padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; font-family: ''Courier New'', monospace; letter-spacing: 2px;">{{code}}</td>
</tr>
<tr>
<td style="color: #6b7280; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">Barcode-Nummer</td>
<td style="color: #1f2937; font-size: 16px; padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; font-family: ''Courier New'', monospace;">{{barcode}}</td>
</tr>
<tr>
<td style="color: #6b7280; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">Wert</td>
<td style="color: #10b981; font-size: 20px; padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700;">€{{amount}}</td>
</tr>
<tr>
<td style="color: #6b7280; font-size: 14px; padding: 12px 0; font-weight: 500;">Gültig bis</td>
<td style="color: #1f2937; font-size: 16px; padding: 12px 0; text-align: right; font-weight: 600;">{{expiry_date}}</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<!-- Download PDF Button -->
<tr>
<td style="padding: 0 30px 30px 30px; text-align: center;">
<a href="{{pdf_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s;">
📥 Gutschein als PDF herunterladen
</a>
<p style="color: #6b7280; margin: 16px 0 0 0; font-size: 13px;">Der Gutschein ist auch als PDF im Anhang dieser E-Mail.</p>
</td>
</tr>

<!-- Usage Instructions -->
<tr>
<td style="padding: 0 30px 30px 30px;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
<tr>
<td style="padding: 20px;">
<p style="color: #1e40af; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">ℹ️ So lösen Sie Ihren Gutschein ein:</p>
<p style="color: #1e3a8a; margin: 0; font-size: 14px; line-height: 1.7;">
1. Zeigen Sie den Gutschein-Code oder das PDF bei Ihrer Reservierung vor<br>
2. Der Gutscheinwert wird von Ihrer Rechnung abgezogen<br>
3. Bei Teileinlösung bleibt das Restguthaben erhalten<br>
4. Gutscheine sind nicht mit anderen Aktionen kombinierbar
</p>
</td>
</tr>
</table>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding: 40px 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
<p style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Wir freuen uns auf Ihren Besuch! ❤️</p>
<p style="color: #6b7280; margin: 0 0 20px 0; font-size: 14px; line-height: 1.6;">
Bei Fragen zu Ihrem Gutschein stehen wir Ihnen gerne zur Verfügung.
</p>
<p style="color: #9ca3af; margin: 0; font-size: 13px; line-height: 1.7;">
<strong style="color: #1f2937; font-size: 15px;">Patschi by Köhle</strong><br>
Dorfbahnstraße 83, 6534 Serfaus<br>
Email: info@patschi.at | Tel: +43 5476 6290
</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>')
ON CONFLICT (key) DO NOTHING;

-- Insert gift card plain text email template if not exists
INSERT INTO settings (key, value)
VALUES ('gift_card_email_body_text', 'Liebe/r {{recipient_name}},

{{purchaser_name}} hat Ihnen einen Geschenkgutschein im Wert von €{{amount}} geschenkt!

GUTSCHEIN-DETAILS:
------------------
Code: {{code}}
Barcode: {{barcode}}
Wert: €{{amount}}
Gültig bis: {{expiry_date}}

Persönliche Nachricht:
"{{message}}"

SO LÖSEN SIE DEN GUTSCHEIN EIN:
1. Zeigen Sie den Gutschein-Code oder das PDF bei Ihrer Reservierung vor
2. Der Gutscheinwert wird von Ihrer Rechnung abgezogen
3. Bei Teileinlösung bleibt das Restguthaben erhalten

Ihr Gutschein als PDF: {{pdf_url}}

Wir freuen uns auf Ihren Besuch!

Patschi by Köhle
Dorfbahnstraße 83, 6534 Serfaus
Email: info@patschi.at | Tel: +43 5476 6290')
ON CONFLICT (key) DO NOTHING;