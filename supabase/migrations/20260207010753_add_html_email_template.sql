/*
  # Add HTML Email Template Setting
  
  1. Changes
    - Adds email_body_html setting for storing custom HTML email templates
    - Inserts a beautiful default HTML template with professional styling
    - Uses table-based layout for maximum email client compatibility
  
  2. Template Features
    - Responsive design with proper email client support
    - Professional gradient header
    - Highlighted booking code badge
    - Structured reservation details table
    - Special requests section
    - Important notices section
    - Professional footer
*/

-- Insert default HTML email template
INSERT INTO settings (key, value)
VALUES 
  ('email_body_html', '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservierungsbestätigung</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Patschi</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Reservierungsbestätigung</p>
            </td>
          </tr>

          <!-- Booking Code Badge -->
          <tr>
            <td style="padding: 30px 30px 20px 30px; text-align: center;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); display: inline-block; padding: 16px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
                <p style="color: rgba(255,255,255,0.9); margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Buchungsnummer</p>
                <p style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; font-family: ''Courier New'', monospace;">{{booking_code}}</p>
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 20px 30px 30px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Liebe/r {{customer_name}},</h2>
              <p style="color: #4b5563; margin: 0; font-size: 16px; line-height: 1.6;">vielen Dank für Ihre Reservierung! Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen.</p>
            </td>
          </tr>

          <!-- Reservation Details -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Reservierungsdetails</h3>

                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">📅 Datum</td>
                        <td style="color: #1f2937; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">{{reservation_date}}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">⏰ Uhrzeit</td>
                        <td style="color: #1f2937; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">{{reservation_time}} Uhr</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">👥 Anzahl Personen</td>
                        <td style="color: #1f2937; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">{{party_size}}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">🪑 Tisch</td>
                        <td style="color: #1f2937; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">{{table_number}}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; font-weight: 500;">💳 Anzahlung</td>
                        <td style="color: #10b981; font-size: 16px; padding: 8px 0; text-align: right; font-weight: 700;">€{{deposit_amount}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Important Info -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="color: #1e40af; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">ℹ️ Wichtige Hinweise</p>
                    <p style="color: #1e3a8a; margin: 0; font-size: 13px; line-height: 1.6;">
                      • Bitte erscheinen Sie pünktlich zu Ihrer Reservierung<br>
                      • Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen<br>
                      • Bei Stornierung oder Änderungen kontaktieren Sie uns bitte rechtzeitig
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Wir freuen uns auf Ihren Besuch!</p>
              <p style="color: #6b7280; margin: 0 0 16px 0; font-size: 14px;">Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
              <p style="color: #9ca3af; margin: 0; font-size: 13px; line-height: 1.6;">
                <strong style="color: #1f2937;">Patschi Restaurant</strong><br>
                Email: info@patschi.com | Tel: +49 XXX XXXXXXX
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
