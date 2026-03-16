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
      htmlBody = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${is_payment_confirmation ? 'Zahlungsbestätigung' : 'Reservierungsbestätigung'}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Top brand bar -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Tisch Reservierung</p>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,0.12),0 4px 16px rgba(15,23,42,0.06);">

              <!-- Success header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:${is_payment_confirmation ? '#ecfdf5' : '#f0fdf4'};padding:40px 40px 32px 40px;text-align:center;border-bottom:1px solid ${is_payment_confirmation ? '#d1fae5' : '#dcfce7'};">
                    <!-- Circle check icon -->
                    <div style="display:inline-block;width:72px;height:72px;background-color:#10b981;border-radius:50%;margin-bottom:20px;line-height:72px;text-align:center;">
                      <span style="color:#ffffff;font-size:36px;line-height:72px;">&#10003;</span>
                    </div>
                    <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${is_payment_confirmation ? 'Zahlung bestätigt!' : 'Reservierung bestätigt!'}</h1>
                    <p style="margin:0;font-size:15px;color:#475569;">
                      ${is_payment_confirmation
                        ? 'Ihre Anzahlung wurde erfolgreich verarbeitet.'
                        : payment_link_url
                        ? 'Bitte leisten Sie die Anzahlung zur Bestätigung.'
                        : 'Vielen Dank für Ihre Buchung.'}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Booking code -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 40px 24px 40px;text-align:center;">
                    <p style="margin:0 0 10px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Ihre Buchungsnummer</p>
                    <div style="display:inline-block;background-color:#f0fdf4;border:2px solid #10b981;border-radius:16px;padding:14px 32px;">
                      <span style="font-size:30px;font-weight:700;color:#059669;letter-spacing:4px;font-family:'Courier New',Courier,monospace;">${booking_code}</span>
                    </div>
                    <p style="margin:10px 0 0 0;font-size:12px;color:#94a3b8;">Bitte bewahren Sie diese Nummer auf</p>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 28px 40px;">
                    <p style="margin:0;font-size:16px;color:#334155;line-height:1.65;">
                      Liebe/r <strong style="color:#0f172a;">${customer_name}</strong>,<br><br>
                      ${is_payment_confirmation
                        ? 'vielen Dank für Ihre Zahlung! Ihre Reservierung ist nun vollständig bestätigt. Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen.'
                        : payment_link_url
                        ? 'vielen Dank für Ihre Reservierungsanfrage! Um Ihre Reservierung zu bestätigen, klicken Sie bitte auf den Button unten, um die Anzahlung zu leisten.'
                        : 'vielen Dank für Ihre Reservierung! Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen.'}
                    </p>
                  </td>
                </tr>
              </table>

              ${payment_link_url ? `
              <!-- Payment CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 32px 40px;text-align:center;">
                    <a href="${payment_link_url}" style="display:inline-block;background-color:#10b981;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(16,185,129,0.4);">Jetzt Anzahlung leisten &rarr;</a>
                    <p style="margin:12px 0 0 0;font-size:13px;color:#64748b;">Betrag: <strong style="color:#0f172a;">&#8364;${depositAmountFormatted}</strong></p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Details card -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 28px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:16px;border:2px solid #e2e8f0;">
                      <tr>
                        <td style="padding:24px 28px;">
                          <p style="margin:0 0 18px 0;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;">Reservierungsdetails</p>

                          <!-- Date row -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                            <tr>
                              <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Datum</td>
                              <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">${formattedDate}</td>
                            </tr>
                          </table>
                          <!-- Time row -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                            <tr>
                              <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Uhrzeit</td>
                              <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">${reservation_time} Uhr</td>
                            </tr>
                          </table>
                          <!-- Party size row -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                            <tr>
                              <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Personen</td>
                              <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">${party_size} ${party_size === 1 ? 'Person' : 'Personen'}</td>
                            </tr>
                          </table>
                          <!-- Table row -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="${payment_amount > 0 ? 'border-bottom:1px solid #e2e8f0;' : ''}">
                            <tr>
                              <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Tisch</td>
                              <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">${table_number}</td>
                            </tr>
                          </table>
                          ${payment_amount > 0 ? `
                          <!-- Payment row -->
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:14px 0 2px 0;font-size:15px;color:#475569;font-weight:600;">${is_payment_confirmation ? 'Bezahlt' : 'Anzahlung'}</td>
                              <td style="padding:14px 0 2px 0;font-size:20px;color:#10b981;font-weight:800;text-align:right;">&#8364;${depositAmountFormatted}</td>
                            </tr>
                          </table>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${special_requests ? `
              <!-- Special requests -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 28px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:2px solid #fcd34d;border-radius:16px;">
                      <tr>
                        <td style="padding:18px 22px;">
                          <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.1em;">Besondere Wünsche</p>
                          <p style="margin:0;font-size:14px;color:#78350f;line-height:1.55;">${special_requests}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${is_payment_confirmation ? `
              <!-- Payment confirmed notice -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 28px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:2px solid #86efac;border-radius:16px;">
                      <tr>
                        <td style="padding:18px 22px;">
                          <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#15803d;">Zahlung erfolgreich verarbeitet</p>
                          <p style="margin:0;font-size:13px;color:#166534;line-height:1.55;">Ihre Anzahlung von &#8364;${depositAmountFormatted} wurde erfolgreich verarbeitet. Ihre Reservierung ist nun vollständig bestätigt.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Important info -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 40px 40px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border:2px solid #bfdbfe;border-radius:16px;">
                      <tr>
                        <td style="padding:18px 22px;">
                          <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#1e40af;">Wichtige Hinweise</p>
                          <p style="margin:0;font-size:13px;color:#1e3a8a;line-height:1.7;">
                            &bull; Bitte erscheinen Sie p&uuml;nktlich zu Ihrer Reservierung<br>
                            &bull; Bei Versp&auml;tung &uuml;ber 15 Minuten kann Ihre Reservierung verfallen<br>
                            &bull; Bei Stornierung oder &Auml;nderungen kontaktieren Sie uns bitte rechtzeitig
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
              <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0f172a;">Wir freuen uns auf Ihren Besuch!</p>
              <p style="margin:0 0 16px 0;font-size:13px;color:#64748b;">Bei Fragen stehen wir Ihnen gerne zur Verf&uuml;gung.</p>
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                <strong style="color:#475569;">${settingsMap.smtp_from_name || 'Restaurant'}</strong><br>
                ${settingsMap.smtp_from_email || ''}
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
