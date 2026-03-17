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
      console.log('[EMAIL] Fetching reservation with ID:', reservationId);

      const { data: reservation, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .maybeSingle();

      if (fetchError) {
        console.error('[EMAIL] Error fetching reservation:', fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch reservation details", details: fetchError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!reservation) {
        console.error('[EMAIL] No reservation found with ID:', reservationId);
        return new Response(
          JSON.stringify({ error: "Reservation not found", reservationId }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log('[EMAIL] Reservation fetched successfully:', reservation.booking_code);

      customer_name = reservation.customer_name;
      customer_email = reservation.customer_email;
      reservation_date = reservation.reservation_date;
      reservation_time = reservation.reservation_time;
      party_size = reservation.party_size;
      special_requests = reservation.special_requests || '';
      payment_amount = reservation.payment_amount || 0;
      booking_code = reservation.booking_code;
      table_number = reservation.table_number || 'To be assigned';
    }

    if (!customer_email || !customer_name) {
      console.error('[EMAIL] Missing required fields - customer_email:', customer_email, 'customer_name:', customer_name);
      return new Response(
        JSON.stringify({ error: "Missing required fields", provided: { customer_email: !!customer_email, customer_name: !!customer_name } }),
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
      // Use default beautiful template — matches the Reservation Widget design
      const logoUrl = "https://patschi.at/wp-content/uploads/2023/04/cropped-Patschi-Logo-neu-transparent-e1757582721442.png";
      const headerSubtitle = is_payment_confirmation ? 'Zahlungsbestätigung' : 'Tisch Reservierung';
      const headerBg = is_payment_confirmation ? '#eaf2ed' : (payment_link_url ? '#f5eddc' : '#eaf2ed');
      const headerBorder = is_payment_confirmation ? '#c6dece' : (payment_link_url ? '#e0d4bb' : '#c6dece');
      const headerTitle = is_payment_confirmation ? 'Zahlung bestätigt!' : 'Reservierung bestätigt!';
      const headerSubtext = is_payment_confirmation
        ? 'Ihre Anzahlung wurde erfolgreich verarbeitet.'
        : payment_link_url
        ? 'Bitte leisten Sie die Anzahlung zur Bestätigung.'
        : 'Vielen Dank für Ihre Buchung.';

      htmlBody = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${is_payment_confirmation ? 'Zahlungsbestätigung' : 'Reservierungsbestätigung'}</title>
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
                    <img src="${logoUrl}" alt="Patschi Serfaus" width="120" style="max-width:120px;height:auto;display:block;margin:0 auto 12px auto;" />
                    <p style="margin:0;font-size:12px;color:#b8924a;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;">${headerSubtitle}</p>
                  </td>
                </tr>

                <!-- Status header -->
                <tr>
                  <td style="background-color:${headerBg};padding:28px 40px 24px 40px;text-align:center;border-bottom:1px solid ${headerBorder};">
                    <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1e1e1e;letter-spacing:-0.3px;">${headerTitle}</h1>
                    <p style="margin:0;font-size:14px;color:#5a5550;">${headerSubtext}</p>
                  </td>
                </tr>

                <!-- Booking code -->
                <tr>
                  <td style="padding:28px 40px 20px 40px;text-align:center;">
                    <p style="margin:0 0 8px 0;font-size:11px;color:#9a948e;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Ihre Buchungsnummer</p>
                    <div style="display:inline-block;background-color:#f5eddc;border:2px solid #b8924a;border-radius:4px;padding:12px 32px;">
                      <span style="font-size:28px;font-weight:700;color:#b8924a;letter-spacing:4px;font-family:'Courier New',Courier,monospace;">${booking_code}</span>
                    </div>
                    <p style="margin:8px 0 0 0;font-size:12px;color:#9a948e;">Bitte bewahren Sie diese Nummer auf</p>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <p style="margin:0;font-size:15px;color:#3a3a3a;line-height:1.7;">
                      Liebe/r <strong style="color:#1e1e1e;">${customer_name}</strong>,<br><br>
                      ${is_payment_confirmation
                        ? 'vielen Dank für Ihre Zahlung! Ihre Reservierung ist nun vollständig bestätigt. Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen.'
                        : payment_link_url
                        ? 'vielen Dank für Ihre Reservierungsanfrage! Um Ihre Reservierung zu bestätigen, klicken Sie bitte auf den Button unten, um die Anzahlung zu leisten.'
                        : 'vielen Dank für Ihre Reservierung! Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen.'}
                    </p>
                  </td>
                </tr>

                ${payment_link_url ? `
                <!-- Payment CTA -->
                <tr>
                  <td style="padding:0 40px 28px 40px;text-align:center;">
                    <a href="${payment_link_url}" style="display:inline-block;background-color:#b8924a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:4px;font-size:15px;font-weight:700;letter-spacing:0.02em;">Jetzt Anzahlung leisten &rarr;</a>
                    <p style="margin:10px 0 0 0;font-size:13px;color:#5a5550;">Betrag: <strong style="color:#1e1e1e;">&#8364;${depositAmountFormatted}</strong></p>
                  </td>
                </tr>
                ` : ''}

                <!-- Details card -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;border-radius:4px;border:1px solid #d4cec4;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0 0 14px 0;font-size:11px;font-weight:700;color:#1e1e1e;text-transform:uppercase;letter-spacing:0.1em;">Reservierungsdetails</p>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                            <tr>
                              <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Datum</td>
                              <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">${formattedDate}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                            <tr>
                              <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Uhrzeit</td>
                              <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">${reservation_time} Uhr</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                            <tr>
                              <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Personen</td>
                              <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">${party_size} ${party_size === 1 ? 'Person' : 'Personen'}</td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" style="${payment_amount > 0 ? 'border-bottom:1px solid #d4cec4;' : ''}">
                            <tr>
                              <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Tisch</td>
                              <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">${table_number}</td>
                            </tr>
                          </table>
                          ${payment_amount > 0 ? `
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:12px 0 2px 0;font-size:14px;color:#5a5550;font-weight:600;">${is_payment_confirmation ? 'Bezahlt' : 'Anzahlung'}</td>
                              <td style="padding:12px 0 2px 0;font-size:18px;color:${is_payment_confirmation ? '#4a7c59' : '#b8924a'};font-weight:800;text-align:right;">&#8364;${depositAmountFormatted}</td>
                            </tr>
                          </table>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${special_requests ? `
                <!-- Special requests -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #f0d080;border-radius:4px;">
                      <tr>
                        <td style="padding:14px 18px;">
                          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.1em;">Besondere Wünsche</p>
                          <p style="margin:0;font-size:13px;color:#78350f;line-height:1.55;">${special_requests}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}

                ${is_payment_confirmation ? `
                <!-- Payment confirmed notice -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eaf2ed;border:1px solid #a8d4b8;border-radius:4px;">
                      <tr>
                        <td style="padding:14px 18px;">
                          <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#2d6a4a;">Zahlung erfolgreich verarbeitet</p>
                          <p style="margin:0;font-size:13px;color:#2d6a4a;line-height:1.55;">Ihre Anzahlung von &#8364;${depositAmountFormatted} wurde erfolgreich verarbeitet. Ihre Reservierung ist nun vollständig bestätigt.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}

                <!-- Important info -->
                <tr>
                  <td style="padding:0 40px 32px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f8;border:1px solid #c4d0e8;border-radius:4px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3a5a8a;">Wichtige Hinweise</p>
                          <p style="margin:0;font-size:13px;color:#3a5a8a;line-height:1.7;">
                            &bull; Bitte erscheinen Sie p&uuml;nktlich zu Ihrer Reservierung<br>
                            &bull; Bei Versp&auml;tung &uuml;ber 15 Minuten kann Ihre Reservierung verfallen<br>
                            &bull; Bei Stornierung oder &Auml;nderungen kontaktieren Sie uns bitte rechtzeitig
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:28px 40px 32px 40px;text-align:center;border-top:1px solid #ede8e0;">
                    <p style="margin:0 0 2px 0;font-size:14px;font-weight:700;color:#1e1e1e;">${settingsMap.smtp_from_name || 'Patschi Serfaus'}</p>
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
