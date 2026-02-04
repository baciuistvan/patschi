import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email } = await req.json();
    const testEmail = email || "baciujob@icloud.com";

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
        "smtp_from_name"
      ]);

    const settingsMap = settings?.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>) || {};

    if (!settingsMap.smtp_host || !settingsMap.smtp_user || !settingsMap.smtp_password) {
      throw new Error("SMTP settings not configured");
    }

    const emailBody = `Hallo!

Dies ist eine Test-E-Mail vom Patschi Gutscheinsystem.

Gift Card System Test Details:
- System: Patschi Gift Card Platform
- Sent: ${new Date().toLocaleString('de-DE')}
- Recipient: ${testEmail}

Wenn Sie diese E-Mail erhalten, funktioniert das E-Mail-System korrekt!

Mit freundlichen Grüßen,
Das Patschi Team`;

    const emailSubject = "Test-E-Mail vom Patschi Gutscheinsystem";

    const smtpPort = parseInt(settingsMap.smtp_port || "587");
    const smtpSecure = settingsMap.smtp_secure === "true";

    const boundary = `----=_Part_${Date.now()}`;
    const emailContent = [
      `From: ${settingsMap.smtp_from_name || 'Patschi'} <${settingsMap.smtp_from_email}>`,
      `To: ${testEmail}`,
      `Subject: ${emailSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      emailBody,
      `--${boundary}--`
    ].join('\r\n');

    console.log('[TEST EMAIL] Sending to:', testEmail);
    console.log('[TEST EMAIL] SMTP Host:', settingsMap.smtp_host);

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
          console.log('[SMTP Command]:', command.startsWith('AUTH') || command.length > 100 ? command.substring(0, 20) + '...' : command);
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

      console.log('[TEST EMAIL] Authentication successful');

      const mailFromResponse = await sendCommand(`MAIL FROM:<${settingsMap.smtp_from_email}>`);
      if (!mailFromResponse.startsWith('250')) {
        throw new Error(`MAIL FROM failed: ${mailFromResponse}`);
      }

      const rcptToResponse = await sendCommand(`RCPT TO:<${testEmail}>`);
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

      console.log('[TEST EMAIL] Email sent successfully');

      await sendCommand('QUIT');
    } finally {
      if (conn) {
        try {
          conn.close();
        } catch (e) {
          console.error('[TEST EMAIL] Error closing connection:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Test email sent successfully to ${testEmail}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending test email:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send test email"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
