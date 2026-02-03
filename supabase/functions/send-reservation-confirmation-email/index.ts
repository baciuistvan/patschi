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
      .replace(/{{customer_name}}/g, customer_name)
      .replace(/{{booking_code}}/g, booking_code)
      .replace(/{{reservation_date}}/g, formatDate(reservation_date))
      .replace(/{{reservation_time}}/g, reservation_time)
      .replace(/{{party_size}}/g, party_size.toString())
      .replace(/{{table_number}}/g, table_number)
      .replace(/{{special_requests}}/g, special_requests || 'None')
      .replace(/{{deposit_amount}}/g, payment_amount.toFixed(2));

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

    const smtpResponse = await fetch(`https://api.smtp2go.com/v3/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: 'api-key-placeholder',
        to: [customer_email],
        sender: settingsMap.smtp_from_email,
        subject: emailSubject,
        text_body: emailBody,
        custom_headers: [
          {
            header: 'Reply-To',
            value: settingsMap.smtp_from_email
          }
        ]
      })
    });

    const tc = await Deno.connect({
      hostname: settingsMap.smtp_host,
      port: smtpPort,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readResponse = async () => {
      const buffer = new Uint8Array(1024);
      const n = await tc.read(buffer);
      return decoder.decode(buffer.subarray(0, n || 0));
    };

    const sendCommand = async (command: string) => {
      await tc.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    await readResponse();
    await sendCommand(`EHLO ${settingsMap.smtp_host}`);

    if (!smtpSecure && smtpPort === 587) {
      await sendCommand('STARTTLS');
    }

    await sendCommand('AUTH LOGIN');
    await sendCommand(btoa(settingsMap.smtp_user));
    await sendCommand(btoa(settingsMap.smtp_password));

    await sendCommand(`MAIL FROM:<${settingsMap.smtp_from_email}>`);
    await sendCommand(`RCPT TO:<${customer_email}>`);
    await sendCommand('DATA');
    await tc.write(encoder.encode(emailContent + '\r\n.\r\n'));
    await readResponse();

    await sendCommand('QUIT');
    tc.close();

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
