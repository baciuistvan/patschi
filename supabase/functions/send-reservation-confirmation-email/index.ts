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

    const {
      customer_name,
      customer_email,
      reservation_date,
      reservation_time,
      party_size,
      special_requests = '',
      payment_amount = 0,
      booking_code,
      table_number = 'To be assigned'
    } = reservationData;

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
        "email_body"
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

    let emailBody = settingsMap.email_body || `Dear {{customer_name}},

Thank you for your reservation at Patschi!

Reservation Details:
- Booking Code: {{booking_code}}
- Date: {{reservation_date}}
- Time: {{reservation_time}}
- Party Size: {{party_size}} guests
- Table: {{table_number}}

Special Requests: {{special_requests}}

Deposit Paid: €{{deposit_amount}}

We look forward to welcoming you!

Best regards,
The Patschi Team`;

    emailBody = emailBody
      .replace(/{{customer_name}}/g, customer_name || '')
      .replace(/{{booking_code}}/g, booking_code || '')
      .replace(/{{reservation_date}}/g, reservation_date ? formatDate(reservation_date) : '')
      .replace(/{{reservation_time}}/g, reservation_time || '')
      .replace(/{{party_size}}/g, party_size?.toString() || '0')
      .replace(/{{table_number}}/g, table_number || 'To be assigned')
      .replace(/{{special_requests}}/g, special_requests || 'None')
      .replace(/{{deposit_amount}}/g, (payment_amount || 0).toFixed(2));

    let emailSubject = settingsMap.email_subject || 'Reservation Confirmation - {{customer_name}}';
    emailSubject = emailSubject.replace(/{{customer_name}}/g, customer_name);

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
