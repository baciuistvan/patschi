import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { targetEmail } = await req.json();
    if (!targetEmail) throw new Error("targetEmail required");

    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email", "smtp_from_name"]);

    const s: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => { s[r.key] = r.value; });

    if (!s.smtp_host || !s.smtp_user || !s.smtp_password) {
      throw new Error("SMTP not configured");
    }

    const nodemailer = await import("npm:nodemailer@6.9.8");
    const transporter = nodemailer.default.createTransport({
      host: s.smtp_host,
      port: parseInt(s.smtp_port || "587"),
      secure: s.smtp_port === "465",
      auth: { user: s.smtp_user, pass: s.smtp_password },
    });

    const fromName = s.smtp_from_name || "Patschi Serfaus";
    const fromEmail = s.smtp_from_email;
    const from = `"${fromName}" <${fromEmail}>`;

    const results: string[] = [];

    // ──────────────────────────────────────────────
    // EMAIL 1: Reservation Confirmation (no payment)
    // ──────────────────────────────────────────────
    const email1Html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservierungsbestätigung</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Tisch Reservierung</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,0.12),0 4px 16px rgba(15,23,42,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#f0fdf4;padding:40px 40px 32px 40px;text-align:center;border-bottom:1px solid #dcfce7;">
              <div style="display:inline-block;width:72px;height:72px;background-color:#10b981;border-radius:50%;margin-bottom:20px;text-align:center;line-height:72px;">
                <span style="color:#ffffff;font-size:36px;line-height:72px;">&#10003;</span>
              </div>
              <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">Reservierung bestätigt!</h1>
              <p style="margin:0;font-size:15px;color:#475569;">Vielen Dank für Ihre Buchung.</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 40px 24px 40px;text-align:center;">
              <p style="margin:0 0 10px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Ihre Buchungsnummer</p>
              <div style="display:inline-block;background-color:#f0fdf4;border:2px solid #10b981;border-radius:16px;padding:14px 32px;">
                <span style="font-size:30px;font-weight:700;color:#059669;letter-spacing:4px;font-family:'Courier New',Courier,monospace;">5ZTGNUDK</span>
              </div>
              <p style="margin:10px 0 0 0;font-size:12px;color:#94a3b8;">Bitte bewahren Sie diese Nummer auf</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 28px 40px;">
              <p style="margin:0;font-size:16px;color:#334155;line-height:1.65;">
                Liebe/r <strong style="color:#0f172a;">Villa Vibes</strong>,<br><br>
                vielen Dank für Ihre Reservierung! Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen.
              </p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:16px;border:2px solid #e2e8f0;">
                <tr><td style="padding:24px 28px;">
                  <p style="margin:0 0 18px 0;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;">Reservierungsdetails</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr>
                      <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Datum</td>
                      <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">Dienstag, 17. März 2026</td>
                    </tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr>
                      <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Uhrzeit</td>
                      <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">15:45 Uhr</td>
                    </tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr>
                      <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Personen</td>
                      <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">50 Personen</td>
                    </tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Tisch</td>
                      <td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">Tisch 1</td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border:2px solid #bfdbfe;border-radius:16px;">
                <tr><td style="padding:18px 22px;">
                  <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#1e40af;">Wichtige Hinweise</p>
                  <p style="margin:0;font-size:13px;color:#1e3a8a;line-height:1.7;">
                    &bull; Bitte erscheinen Sie pünktlich zu Ihrer Reservierung<br>
                    &bull; Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen<br>
                    &bull; Bei Stornierung oder Änderungen kontaktieren Sie uns bitte rechtzeitig
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 40px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0f172a;">Wir freuen uns auf Ihren Besuch!</p>
          <p style="margin:0 0 16px 0;font-size:13px;color:#64748b;">Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            <strong style="color:#475569;">${fromName}</strong><br>${fromEmail}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from, to: targetEmail,
      subject: "[TEST] Reservierungsbestätigung – Tisch 1, 17. März 2026",
      html: email1Html,
    });
    results.push("✓ Reservation confirmation email sent");

    // ──────────────────────────────────────────────
    // EMAIL 2: Reservation with Payment Link
    // ──────────────────────────────────────────────
    const email2Html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservierungsbestätigung mit Anzahlung</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Tisch Reservierung</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,0.12),0 4px 16px rgba(15,23,42,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#f0fdf4;padding:40px 40px 32px 40px;text-align:center;border-bottom:1px solid #dcfce7;">
              <div style="display:inline-block;width:72px;height:72px;background-color:#10b981;border-radius:50%;margin-bottom:20px;text-align:center;line-height:72px;">
                <span style="color:#ffffff;font-size:36px;line-height:72px;">&#10003;</span>
              </div>
              <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">Reservierung bestätigt!</h1>
              <p style="margin:0;font-size:15px;color:#475569;">Bitte leisten Sie die Anzahlung zur Bestätigung.</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 40px 24px 40px;text-align:center;">
              <p style="margin:0 0 10px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Ihre Buchungsnummer</p>
              <div style="display:inline-block;background-color:#f0fdf4;border:2px solid #10b981;border-radius:16px;padding:14px 32px;">
                <span style="font-size:30px;font-weight:700;color:#059669;letter-spacing:4px;font-family:'Courier New',Courier,monospace;">A8B2C3D4</span>
              </div>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 28px 40px;">
              <p style="margin:0;font-size:16px;color:#334155;line-height:1.65;">
                Liebe/r <strong style="color:#0f172a;">Max Mustermann</strong>,<br><br>
                vielen Dank für Ihre Reservierungsanfrage! Um Ihre Reservierung zu bestätigen, klicken Sie bitte auf den Button unten, um die Anzahlung zu leisten.
              </p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 32px 40px;text-align:center;">
              <a href="https://patschi.services" style="display:inline-block;background-color:#10b981;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(16,185,129,0.4);">Jetzt Anzahlung leisten &rarr;</a>
              <p style="margin:12px 0 0 0;font-size:13px;color:#64748b;">Betrag: <strong style="color:#0f172a;">&#8364;50.00</strong></p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:16px;border:2px solid #e2e8f0;">
                <tr><td style="padding:24px 28px;">
                  <p style="margin:0 0 18px 0;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;">Reservierungsdetails</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Datum</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">Samstag, 4. April 2026</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Uhrzeit</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">19:00 Uhr</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Personen</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">4 Personen</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Tisch</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">Tisch 5</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:14px 0 2px 0;font-size:15px;color:#475569;font-weight:600;">Anzahlung</td><td style="padding:14px 0 2px 0;font-size:20px;color:#10b981;font-weight:800;text-align:right;">&#8364;50.00</td></tr>
                  </table>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:2px solid #fcd34d;border-radius:16px;">
                <tr><td style="padding:18px 22px;">
                  <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.1em;">Besondere Wünsche</p>
                  <p style="margin:0;font-size:14px;color:#78350f;line-height:1.55;">Fensterplatz bevorzugt, ein Geburtstagskind dabei</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border:2px solid #bfdbfe;border-radius:16px;">
                <tr><td style="padding:18px 22px;">
                  <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#1e40af;">Wichtige Hinweise</p>
                  <p style="margin:0;font-size:13px;color:#1e3a8a;line-height:1.7;">
                    &bull; Bitte erscheinen Sie pünktlich zu Ihrer Reservierung<br>
                    &bull; Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen<br>
                    &bull; Bei Stornierung oder Änderungen kontaktieren Sie uns bitte rechtzeitig
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 40px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0f172a;">Wir freuen uns auf Ihren Besuch!</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            <strong style="color:#475569;">${fromName}</strong><br>${fromEmail}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from, to: targetEmail,
      subject: "[TEST] Reservierungsanfrage mit Anzahlung – Tisch 5, 4. April 2026",
      html: email2Html,
    });
    results.push("✓ Reservation with payment link email sent");

    // ──────────────────────────────────────────────
    // EMAIL 3: Payment Confirmation
    // ──────────────────────────────────────────────
    const email3Html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zahlungsbestätigung</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Tisch Reservierung</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,0.12),0 4px 16px rgba(15,23,42,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#ecfdf5;padding:40px 40px 32px 40px;text-align:center;border-bottom:1px solid #d1fae5;">
              <div style="display:inline-block;width:72px;height:72px;background-color:#10b981;border-radius:50%;margin-bottom:20px;text-align:center;line-height:72px;">
                <span style="color:#ffffff;font-size:36px;line-height:72px;">&#10003;</span>
              </div>
              <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">Zahlung bestätigt!</h1>
              <p style="margin:0;font-size:15px;color:#475569;">Ihre Anzahlung wurde erfolgreich verarbeitet.</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 40px 24px 40px;text-align:center;">
              <p style="margin:0 0 10px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Ihre Buchungsnummer</p>
              <div style="display:inline-block;background-color:#f0fdf4;border:2px solid #10b981;border-radius:16px;padding:14px 32px;">
                <span style="font-size:30px;font-weight:700;color:#059669;letter-spacing:4px;font-family:'Courier New',Courier,monospace;">A8B2C3D4</span>
              </div>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 28px 40px;">
              <p style="margin:0;font-size:16px;color:#334155;line-height:1.65;">
                Liebe/r <strong style="color:#0f172a;">Max Mustermann</strong>,<br><br>
                vielen Dank für Ihre Zahlung! Ihre Reservierung ist nun vollständig bestätigt. Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen.
              </p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:16px;border:2px solid #e2e8f0;">
                <tr><td style="padding:24px 28px;">
                  <p style="margin:0 0 18px 0;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;">Reservierungsdetails</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Datum</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">Samstag, 4. April 2026</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Uhrzeit</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">19:00 Uhr</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Personen</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">4 Personen</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Tisch</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">Tisch 5</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:14px 0 2px 0;font-size:15px;color:#475569;font-weight:600;">Bezahlt</td><td style="padding:14px 0 2px 0;font-size:20px;color:#10b981;font-weight:800;text-align:right;">&#8364;50.00</td></tr>
                  </table>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:2px solid #86efac;border-radius:16px;">
                <tr><td style="padding:18px 22px;">
                  <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#15803d;">Zahlung erfolgreich verarbeitet</p>
                  <p style="margin:0;font-size:13px;color:#166534;line-height:1.55;">Ihre Anzahlung von &#8364;50.00 wurde erfolgreich verarbeitet. Ihre Reservierung ist nun vollständig bestätigt.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border:2px solid #bfdbfe;border-radius:16px;">
                <tr><td style="padding:18px 22px;">
                  <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#1e40af;">Wichtige Hinweise</p>
                  <p style="margin:0;font-size:13px;color:#1e3a8a;line-height:1.7;">
                    &bull; Bitte erscheinen Sie pünktlich zu Ihrer Reservierung<br>
                    &bull; Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen<br>
                    &bull; Bei Stornierung oder Änderungen kontaktieren Sie uns bitte rechtzeitig
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 40px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0f172a;">Wir freuen uns auf Ihren Besuch!</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            <strong style="color:#475569;">${fromName}</strong><br>${fromEmail}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from, to: targetEmail,
      subject: "[TEST] Zahlungsbestätigung – Anzahlung erhalten",
      html: email3Html,
    });
    results.push("✓ Payment confirmation email sent");

    // ──────────────────────────────────────────────
    // EMAIL 4: Gift Card Recipient
    // ──────────────────────────────────────────────
    const email4Html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ihr Geschenkgutschein</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Geschenkgutschein</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,0.12),0 4px 16px rgba(15,23,42,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#f0fdf4;padding:40px 40px 32px 40px;text-align:center;border-bottom:1px solid #dcfce7;">
              <div style="display:inline-block;width:72px;height:72px;background-color:#10b981;border-radius:50%;margin-bottom:20px;text-align:center;line-height:72px;">
                <span style="color:#ffffff;font-size:36px;line-height:72px;">&#127873;</span>
              </div>
              <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">Sie haben einen Gutschein!</h1>
              <p style="margin:0;font-size:15px;color:#475569;">Babsi hat Ihnen etwas Besonderes geschenkt.</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 40px 24px 40px;text-align:center;">
              <p style="margin:0 0 10px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Gutscheinwert</p>
              <div style="display:inline-block;background-color:#f0fdf4;border:2px solid #10b981;border-radius:16px;padding:14px 40px;">
                <span style="font-size:36px;font-weight:800;color:#059669;letter-spacing:1px;">&#8364;500.00</span>
              </div>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 28px 40px;">
              <p style="margin:0;font-size:16px;color:#334155;line-height:1.65;">
                Hallo <strong style="color:#0f172a;">Maria Muster</strong>,<br><br>
                <strong style="color:#0f172a;">Babsi</strong> hat Ihnen einen Geschenkgutschein im Wert von <strong style="color:#10b981;">&#8364;500.00</strong> geschenkt. Wir freuen uns auf Ihren Besuch!
              </p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:2px solid #fcd34d;border-radius:16px;">
                <tr><td style="padding:18px 22px;">
                  <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.1em;">Persönliche Nachricht</p>
                  <p style="margin:0;font-size:14px;color:#78350f;line-height:1.55;font-style:italic;">&ldquo;Herzlichen Glückwunsch zum Geburtstag! Genieß einen schönen Abend bei Patschi!&rdquo;</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:16px;border:2px solid #e2e8f0;">
                <tr><td style="padding:24px 28px;">
                  <p style="margin:0 0 18px 0;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;">Gutschein-Details</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Gutschein-Code</td><td style="padding:11px 0;font-size:15px;color:#0f172a;font-weight:700;text-align:right;font-family:'Courier New',Courier,monospace;letter-spacing:2px;">GS-TGTQ0VG</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Barcode</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">1234567890</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Gültig bis</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">3. März 2027</td></tr>
                  </table>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 40px 40px;text-align:center;">
              <a href="https://patschi.services" style="display:inline-block;background-color:#10b981;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(16,185,129,0.4);">Gutschein als PDF herunterladen &rarr;</a>
              <p style="margin:12px 0 0 0;font-size:12px;color:#94a3b8;">Das PDF enthält alle Details und den Barcode zum Einlösen.</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 40px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0f172a;">Wir freuen uns auf Ihren Besuch!</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            <strong style="color:#475569;">${fromName}</strong><br>${fromEmail}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from, to: targetEmail,
      subject: "[TEST] Ihr Geschenkgutschein – €500.00 von Babsi",
      html: email4Html,
    });
    results.push("✓ Gift card recipient email sent");

    // ──────────────────────────────────────────────
    // EMAIL 5: Gift Card Purchaser Confirmation
    // ──────────────────────────────────────────────
    const email5Html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Geschenkgutschein erfolgreich gekauft</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#64748b;letter-spacing:0.05em;text-transform:uppercase;font-weight:600;">Kaufbestätigung</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,0.12),0 4px 16px rgba(15,23,42,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background-color:#f0fdf4;padding:40px 40px 32px 40px;text-align:center;border-bottom:1px solid #dcfce7;">
              <div style="display:inline-block;width:72px;height:72px;background-color:#10b981;border-radius:50%;margin-bottom:20px;text-align:center;line-height:72px;">
                <span style="color:#ffffff;font-size:36px;line-height:72px;">&#10003;</span>
              </div>
              <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">Kauf erfolgreich!</h1>
              <p style="margin:0;font-size:15px;color:#475569;">Ihr Geschenkgutschein wurde erstellt und versendet.</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 40px 28px 40px;">
              <p style="margin:0;font-size:16px;color:#334155;line-height:1.65;">
                Hallo <strong style="color:#0f172a;">Babsi</strong>,<br><br>
                vielen Dank für Ihren Kauf! Ihr Geschenkgutschein wurde erfolgreich erstellt und direkt an <strong style="color:#0f172a;">maria@example.com</strong> gesendet.
              </p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:16px;border:2px solid #e2e8f0;">
                <tr><td style="padding:24px 28px;">
                  <p style="margin:0 0 18px 0;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.08em;">Gutschein-Details</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Gutschein-Code</td><td style="padding:11px 0;font-size:15px;color:#0f172a;font-weight:700;text-align:right;font-family:'Courier New',Courier,monospace;letter-spacing:2px;">GS-TGTQ0VG</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Betrag</td><td style="padding:11px 0;font-size:20px;color:#10b981;font-weight:800;text-align:right;">&#8364;500.00</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e2e8f0;">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Empfänger</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">Maria Muster</td></tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:11px 0;font-size:14px;color:#64748b;font-weight:500;">Gültig bis</td><td style="padding:11px 0;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">3. März 2027</td></tr>
                  </table>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 40px 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border:2px solid #bfdbfe;border-radius:16px;">
                <tr><td style="padding:18px 22px;">
                  <p style="margin:0;font-size:13px;color:#1e3a8a;line-height:1.7;">
                    Eine Kopie des Gutscheins wurde an die E-Mail-Adresse des Empfängers gesendet. Der Gutschein kann direkt bei uns eingelöst werden.
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 40px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0f172a;">Vielen Dank für Ihr Vertrauen!</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            <strong style="color:#475569;">${fromName}</strong><br>${fromEmail}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from, to: targetEmail,
      subject: "[TEST] Kaufbestätigung – Geschenkgutschein €500.00",
      html: email5Html,
    });
    results.push("✓ Gift card purchaser confirmation email sent");

    return new Response(
      JSON.stringify({ success: true, sent: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
