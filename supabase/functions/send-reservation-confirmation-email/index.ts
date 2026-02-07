import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReservationData {
  customer_name: string;
  customer_email: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  special_requests?: string;
  payment_amount?: number;
  booking_code: string;
  table_number?: string;
  payment_link_url?: string;
  is_payment_confirmation?: boolean;
  reservationId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const reservationData: ReservationData = await req.json();

    let {
      customer_name,
      customer_email,
      reservation_date,
      reservation_time,
      party_size,
      special_requests = '',
      payment_amount = 0,
      booking_code,
      table_number = 'To be assigned',
      payment_link_url,
      is_payment_confirmation = false,
      reservationId
    } = reservationData;

    // If reservationId is provided, fetch full reservation details
    if (reservationId && !customer_name) {
      const { data: reservation } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .maybeSingle();

      if (reservation) {
        customer_name = reservation.customer_name;
        customer_email = reservation.customer_email;
        reservation_date = reservation.reservation_date;
        reservation_time = reservation.reservation_time;
        party_size = reservation.party_size;
        special_requests = reservation.special_requests || '';
        payment_amount = reservation.payment_amount || 0;
        booking_code = reservation.booking_code;
      }
    }

    if (!customer_email || !customer_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "smtp_host",
        "smtp_port",
        "smtp_secure",
        "smtp_user",
        "smtp_password",
        "smtp_from_email",
        "smtp_from_name",
        "email_subject",
        "email_body",
        "email_body_html",
        "payment_email_subject",
        "payment_email_body",
        "payment_email_body_html"
      ]);

    const settingsMap = settings?.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>) || {};

    if (!settingsMap.smtp_host || !settingsMap.smtp_user || !settingsMap.smtp_password) {
      throw new Error("SMTP settings not configured");
    }

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formattedDate = reservation_date ? formatDate(reservation_date) : '';
    const depositAmountFormatted = (payment_amount || 0).toFixed(2);

    // Function to replace template variables
    const replaceVariables = (template: string) => {
      return template
        .replace(/{{customer_name}}/g, customer_name)
        .replace(/{{customer_email}}/g, customer_email)
        .replace(/{{customer_phone}}/g, reservationData.customer_phone || 'Nicht angegeben')
        .replace(/{{reservation_date}}/g, formattedDate)
        .replace(/{{reservation_time}}/g, reservation_time)
        .replace(/{{party_size}}/g, party_size.toString())
        .replace(/{{table_number}}/g, table_number)
        .replace(/{{room_name}}/g, reservationData.room_name || 'Hauptraum')
        .replace(/{{special_requests}}/g, special_requests || 'Keine')
        .replace(/{{deposit_amount}}/g, depositAmountFormatted)
        .replace(/{{booking_code}}/g, booking_code)
        .replace(/{{payment_link_url}}/g, payment_link_url || '');
    };

    // Determine which templates to use based on whether payment link is present or if it's a payment confirmation
    const usePaymentTemplate = !!payment_link_url && !is_payment_confirmation;
    const customSubject = usePaymentTemplate ? settingsMap.payment_email_subject : settingsMap.email_subject;
    const customBody = usePaymentTemplate ? settingsMap.payment_email_body : settingsMap.email_body;
    const customBodyHtml = usePaymentTemplate ? settingsMap.payment_email_body_html : settingsMap.email_body_html;

    // Use custom HTML email template if available, otherwise use default
    let htmlBody = '';

    if (customBodyHtml) {
      // Use custom HTML template and replace variables
      htmlBody = replaceVariables(customBodyHtml);
    } else if (customBody) {
      // Fallback: Wrap plain text custom body in simple HTML wrapper
      const bodyText = replaceVariables(customBody);

      htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservierungsbestätigung</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              <div style="color: #1f2937; font-size: 16px; line-height: 1.6;">
                ${bodyText.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; margin: 0; font-size: 13px; line-height: 1.6;">
                <strong style="color: #1f2937;">${settingsMap.smtp_from_name || 'Patschi'}</strong><br>
                ${settingsMap.smtp_from_email}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    } else {
      // Use default beautiful template
      htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservierungsbestätigung</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, ${is_payment_confirmation ? '#10b981 0%, #059669' : '#1e3a8a 0%, #3b82f6'} 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Patschi</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">${is_payment_confirmation ? 'Zahlungsbestätigung' : 'Reservierungsbestätigung'}</p>
            </td>
          </tr>

          <!-- Booking Code Badge -->
          <tr>
            <td style="padding: 30px 30px 20px 30px; text-align: center;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); display: inline-block; padding: 16px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
                <p style="color: rgba(255,255,255,0.9); margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Buchungsnummer</p>
                <p style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; font-family: 'Courier New', monospace;">${booking_code}</p>
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 20px 30px 30px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Liebe/r ${customer_name},</h2>
              <p style="color: #4b5563; margin: 0; font-size: 16px; line-height: 1.6;">
                ${is_payment_confirmation
                  ? 'vielen Dank für Ihre Zahlung! Ihre Reservierung ist nun vollständig bestätigt. Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen.'
                  : payment_link_url
                  ? 'vielen Dank für Ihre Reservierungsanfrage! Um Ihre Reservierung zu bestätigen, klicken Sie bitte auf den Button unten, um die Anzahlung zu leisten.'
                  : 'vielen Dank für Ihre Reservierung! Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen.'}
              </p>
            </td>
          </tr>

          ${payment_link_url ? `
          <!-- Payment Link Button -->
          <tr>
            <td style="padding: 0 30px 30px 30px; text-align: center;">
              <a href="${payment_link_url}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: transform 0.2s;">
                💳 Jetzt Anzahlung leisten
              </a>
              <p style="color: #6b7280; margin: 16px 0 0 0; font-size: 13px;">Betrag: €${depositAmountFormatted}</p>
            </td>
          </tr>
          ` : ''}

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
                        <td style="color: #1f2937; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">⏰ Uhrzeit</td>
                        <td style="color: #1f2937; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${reservation_time} Uhr</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">👥 Anzahl Personen</td>
                        <td style="color: #1f2937; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${party_size} ${party_size === 1 ? 'Person' : 'Personen'}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 500;">🪑 Tisch</td>
                        <td style="color: #1f2937; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${table_number}</td>
                      </tr>
                      ${payment_amount > 0 ? `
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0; font-weight: 500;">💳 Anzahlung</td>
                        <td style="color: #10b981; font-size: 16px; padding: 8px 0; text-align: right; font-weight: 700;">€${depositAmountFormatted}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${special_requests ? `
          <!-- Special Requests -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="color: #92400e; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">📝 Besondere Wünsche</p>
                    <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">${special_requests}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          ${is_payment_confirmation ? `
          <!-- Payment Confirmation Notice -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #d1fae5; border-left: 4px solid #10b981; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="color: #065f46; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">✅ Zahlung erfolgreich</p>
                    <p style="color: #047857; margin: 0; font-size: 13px; line-height: 1.6;">
                      Ihre Anzahlung von €${depositAmountFormatted} wurde erfolgreich verarbeitet. Ihre Reservierung ist nun vollständig bestätigt.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

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
</html>`;

    }

    // Plain text fallback - use custom template or default
    let emailBody = '';
    if (customBody) {
      emailBody = replaceVariables(customBody);
    } else {
      emailBody = `Liebe/r ${customer_name},

${payment_link_url
  ? 'vielen Dank für Ihre Reservierungsanfrage! Um Ihre Reservierung zu bestätigen, leisten Sie bitte die Anzahlung über den folgenden Link:'
  : 'vielen Dank für Ihre Reservierung bei Patschi!'}

BUCHUNGSNUMMER: ${booking_code}

${payment_link_url ? `Zahlungslink: ${payment_link_url}\n` : ''}
Reservierungsdetails:
- Datum: ${formattedDate}
- Uhrzeit: ${reservation_time} Uhr
- Anzahl Personen: ${party_size}
- Tisch: ${table_number}
${payment_amount > 0 ? `- Anzahlung: €${depositAmountFormatted}` : ''}

${special_requests ? `Besondere Wünsche: ${special_requests}\n` : ''}
Wir freuen uns auf Ihren Besuch!

Mit freundlichen Grüßen,
Das Patschi Team`;
    }

    let emailSubject = customSubject || (is_payment_confirmation ? 'Zahlungsbestätigung - {{customer_name}}' : 'Reservierungsbestätigung - {{customer_name}}');
    emailSubject = replaceVariables(emailSubject);

    const smtpPort = parseInt(settingsMap.smtp_port || "587");
    const smtpSecure = settingsMap.smtp_secure === "true";

    const emailPayload = {
      from: `${settingsMap.smtp_from_name || 'Patschi'} <${settingsMap.smtp_from_email}>`,
      to: customer_email,
      subject: emailSubject,
      text: emailBody,
    };

    const boundary = `----=_Part_${Date.now()}`;
    const emailContent = [
      `From: ${emailPayload.from}`,
      `To: ${emailPayload.to}`,
      `Subject: ${emailPayload.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      emailPayload.text,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlBody,
      `--${boundary}--`
    ].join('\r\n');

    console.log('[EMAIL] Attempting to send email to:', customer_email);
    console.log('[EMAIL] SMTP Host:', settingsMap.smtp_host);
    console.log('[EMAIL] SMTP Port:', smtpPort);
    console.log('[EMAIL] SMTP User:', settingsMap.smtp_user);

    let conn;
    try {
      conn = await Deno.connect({
        hostname: settingsMap.smtp_host,
        port: smtpPort,
      });

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const readResponse = async () => {
        const buffer = new Uint8Array(4096);
        const n = await conn!.read(buffer);
        const response = decoder.decode(buffer.subarray(0, n || 0));
        console.log('[SMTP Response]:', response.trim());
        return response;
      };

      const sendCommand = async (command: string, logCommand: boolean = true) => {
        if (logCommand) {
          console.log('[SMTP Command]:', command.startsWith('AUTH PLAIN') || command.length > 100 ? command.substring(0, 20) + '...' : command);
        }
        await conn!.write(encoder.encode(command + '\r\n'));
        return await readResponse();
      };

      const greeting = await readResponse();
      if (!greeting.startsWith('220')) {
        throw new Error(`SMTP connection failed: ${greeting}`);
      }

      const ehloResponse = await sendCommand(`EHLO ${settingsMap.smtp_host}`);
      if (!ehloResponse.includes('250')) {
        throw new Error(`EHLO failed: ${ehloResponse}`);
      }

      if (!smtpSecure && smtpPort === 587) {
        const starttlsResponse = await sendCommand('STARTTLS');
        if (!starttlsResponse.startsWith('220')) {
          throw new Error(`STARTTLS failed: ${starttlsResponse}`);
        }

        const tlsConn = await Deno.startTls(conn, {
          hostname: settingsMap.smtp_host,
        });
        conn = tlsConn as any;

        await sendCommand(`EHLO ${settingsMap.smtp_host}`);
      }

      const authResponse = await sendCommand('AUTH LOGIN');
      if (!authResponse.startsWith('334')) {
        throw new Error(`AUTH LOGIN failed: ${authResponse}`);
      }

      const userResponse = await sendCommand(btoa(settingsMap.smtp_user), false);
      if (!userResponse.startsWith('334')) {
        throw new Error(`Username authentication failed: ${userResponse}`);
      }

      const passResponse = await sendCommand(btoa(settingsMap.smtp_password), false);
      if (!passResponse.startsWith('235')) {
        throw new Error(`Password authentication failed: ${passResponse}`);
      }

      console.log('[EMAIL] Authentication successful');

      const mailFromResponse = await sendCommand(`MAIL FROM:<${settingsMap.smtp_from_email}>`);
      if (!mailFromResponse.startsWith('250')) {
        throw new Error(`MAIL FROM failed: ${mailFromResponse}`);
      }

      const rcptToResponse = await sendCommand(`RCPT TO:<${customer_email}>`);
      if (!rcptToResponse.startsWith('250')) {
        throw new Error(`RCPT TO failed: ${rcptToResponse}`);
      }

      const dataResponse = await sendCommand('DATA');
      if (!dataResponse.startsWith('354')) {
        throw new Error(`DATA command failed: ${dataResponse}`);
      }

      await conn.write(encoder.encode(emailContent + '\r\n.\r\n'));
      const sendResponse = await readResponse();
      if (!sendResponse.startsWith('250')) {
        throw new Error(`Email send failed: ${sendResponse}`);
      }

      console.log('[EMAIL] Email sent successfully');

      await sendCommand('QUIT');
    } finally {
      if (conn) {
        try {
          conn.close();
        } catch (e) {
          console.error('[EMAIL] Error closing connection:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send email"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
