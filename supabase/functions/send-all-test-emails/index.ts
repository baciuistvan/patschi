import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LOGO_URL = "https://patschi.at/wp-content/uploads/2023/04/Patschi-Logo-neu-transparent-e1773749723681.png";

const emailHeader = (subtitle: string) => `
  <tr>
    <td style="background-color:#1e1e1e;padding:36px 40px 28px 40px;text-align:center;">
      <img src="${LOGO_URL}" alt="Patschi Serfaus" width="180" style="max-width:180px;height:auto;display:block;margin:0 auto 16px auto;" />
      <p style="margin:0;font-size:12px;color:#b8924a;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;">${subtitle}</p>
    </td>
  </tr>
`;

const emailFooter = (fromName: string, _fromEmail: string) => `
  <tr>
    <td style="padding:28px 40px 32px 40px;text-align:center;border-top:1px solid #ede8e0;">
      <p style="margin:0 0 2px 0;font-size:14px;font-weight:700;color:#1e1e1e;">${fromName}</p>
      <p style="margin:0 0 10px 0;font-size:11px;color:#b8b2aa;letter-spacing:0.05em;">Patschi &bull; by K&ouml;hle</p>
      <p style="margin:0;font-size:12px;color:#9a948e;line-height:1.8;">
        <strong style="color:#5a5550;">Kontakt</strong><br>
        Email: <a href="mailto:info@patschi.at" style="color:#b8924a;text-decoration:none;">info@patschi.at</a><br>
        Tel: +43 (0) 5476 6290<br>
        Dorfbahnstra&szlig;e 82, 6534 Serfaus
      </p>
    </td>
  </tr>
`;

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
<body style="margin:0;padding:0;background-color:#f7f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background-color:#ffffff;border-radius:4px;overflow:hidden;box-shadow:6px 6px 9px rgba(0,0,0,0.12);">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${emailHeader("Tisch Reservierung")}
            <tr>
              <td style="background-color:#eaf2ed;padding:28px 40px 24px 40px;text-align:center;border-bottom:1px solid #c6dece;">
                <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1e1e1e;letter-spacing:-0.3px;">Reservierung bestätigt!</h1>
                <p style="margin:0;font-size:14px;color:#5a5550;">Vielen Dank für Ihre Buchung.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 20px 40px;text-align:center;">
                <p style="margin:0 0 8px 0;font-size:11px;color:#9a948e;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Ihre Buchungsnummer</p>
                <div style="display:inline-block;background-color:#f5eddc;border:2px solid #b8924a;border-radius:4px;padding:12px 32px;">
                  <span style="font-size:28px;font-weight:700;color:#b8924a;letter-spacing:4px;font-family:'Courier New',Courier,monospace;">5ZTGNUDK</span>
                </div>
                <p style="margin:8px 0 0 0;font-size:12px;color:#9a948e;">Bitte bewahren Sie diese Nummer auf</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <p style="margin:0;font-size:15px;color:#3a3a3a;line-height:1.7;">
                  Liebe/r <strong style="color:#1e1e1e;">Villa Vibes</strong>,<br><br>
                  vielen Dank für Ihre Reservierung! Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;border-radius:4px;border:1px solid #d4cec4;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 14px 0;font-size:11px;font-weight:700;color:#1e1e1e;text-transform:uppercase;letter-spacing:0.1em;">Reservierungsdetails</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr>
                        <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Datum</td>
                        <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">Dienstag, 17. März 2026</td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr>
                        <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Uhrzeit</td>
                        <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">15:45 Uhr</td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr>
                        <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Personen</td>
                        <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">50 Personen</td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Tisch</td>
                        <td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">Tisch 1</td>
                      </tr>
                    </table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f8;border:1px solid #c4d0e8;border-radius:4px;">
                  <tr><td style="padding:16px 20px;">
                    <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3a5a8a;">Wichtige Hinweise</p>
                    <p style="margin:0;font-size:13px;color:#3a5a8a;line-height:1.7;">
                      &bull; Bitte erscheinen Sie pünktlich zu Ihrer Reservierung<br>
                      &bull; Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen<br>
                      &bull; Bei Stornierung oder Änderungen kontaktieren Sie uns bitte rechtzeitig
                    </p>
                  </td></tr>
                </table>
              </td>
            </tr>
            ${emailFooter(fromName, fromEmail)}
          </table>
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
<body style="margin:0;padding:0;background-color:#f7f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background-color:#ffffff;border-radius:4px;overflow:hidden;box-shadow:6px 6px 9px rgba(0,0,0,0.12);">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${emailHeader("Tisch Reservierung")}
            <tr>
              <td style="background-color:#f5eddc;padding:28px 40px 24px 40px;text-align:center;border-bottom:1px solid #e0d4bb;">
                <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1e1e1e;letter-spacing:-0.3px;">Reservierung bestätigt!</h1>
                <p style="margin:0;font-size:14px;color:#5a5550;">Bitte leisten Sie die Anzahlung zur Bestätigung.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 20px 40px;text-align:center;">
                <p style="margin:0 0 8px 0;font-size:11px;color:#9a948e;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Ihre Buchungsnummer</p>
                <div style="display:inline-block;background-color:#f5eddc;border:2px solid #b8924a;border-radius:4px;padding:12px 32px;">
                  <span style="font-size:28px;font-weight:700;color:#b8924a;letter-spacing:4px;font-family:'Courier New',Courier,monospace;">A8B2C3D4</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <p style="margin:0;font-size:15px;color:#3a3a3a;line-height:1.7;">
                  Liebe/r <strong style="color:#1e1e1e;">Max Mustermann</strong>,<br><br>
                  vielen Dank für Ihre Reservierungsanfrage! Um Ihre Reservierung zu bestätigen, klicken Sie bitte auf den Button unten, um die Anzahlung zu leisten.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;text-align:center;">
                <a href="https://patschi.services" style="display:inline-block;background-color:#b8924a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:4px;font-size:15px;font-weight:700;letter-spacing:0.02em;">Jetzt Anzahlung leisten &rarr;</a>
                <p style="margin:10px 0 0 0;font-size:13px;color:#5a5550;">Betrag: <strong style="color:#1e1e1e;">&#8364;50.00</strong></p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;border-radius:4px;border:1px solid #d4cec4;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 14px 0;font-size:11px;font-weight:700;color:#1e1e1e;text-transform:uppercase;letter-spacing:0.1em;">Reservierungsdetails</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Datum</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">Samstag, 4. April 2026</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Uhrzeit</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">19:00 Uhr</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Personen</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">4 Personen</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Tisch</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">Tisch 5</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:12px 0 2px 0;font-size:14px;color:#5a5550;font-weight:600;">Anzahlung</td><td style="padding:12px 0 2px 0;font-size:18px;color:#b8924a;font-weight:800;text-align:right;">&#8364;50.00</td></tr>
                    </table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #f0d080;border-radius:4px;">
                  <tr><td style="padding:14px 18px;">
                    <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.1em;">Besondere Wünsche</p>
                    <p style="margin:0;font-size:13px;color:#78350f;line-height:1.55;">Fensterplatz bevorzugt, ein Geburtstagskind dabei</p>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f8;border:1px solid #c4d0e8;border-radius:4px;">
                  <tr><td style="padding:16px 20px;">
                    <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3a5a8a;">Wichtige Hinweise</p>
                    <p style="margin:0;font-size:13px;color:#3a5a8a;line-height:1.7;">
                      &bull; Bitte erscheinen Sie pünktlich zu Ihrer Reservierung<br>
                      &bull; Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen<br>
                      &bull; Bei Stornierung oder Änderungen kontaktieren Sie uns bitte rechtzeitig
                    </p>
                  </td></tr>
                </table>
              </td>
            </tr>
            ${emailFooter(fromName, fromEmail)}
          </table>
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
<body style="margin:0;padding:0;background-color:#f7f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background-color:#ffffff;border-radius:4px;overflow:hidden;box-shadow:6px 6px 9px rgba(0,0,0,0.12);">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${emailHeader("Zahlungsbestätigung")}
            <tr>
              <td style="background-color:#eaf2ed;padding:28px 40px 24px 40px;text-align:center;border-bottom:1px solid #c6dece;">
                <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1e1e1e;letter-spacing:-0.3px;">Zahlung bestätigt!</h1>
                <p style="margin:0;font-size:14px;color:#5a5550;">Ihre Anzahlung wurde erfolgreich verarbeitet.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 20px 40px;text-align:center;">
                <p style="margin:0 0 8px 0;font-size:11px;color:#9a948e;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Ihre Buchungsnummer</p>
                <div style="display:inline-block;background-color:#f5eddc;border:2px solid #b8924a;border-radius:4px;padding:12px 32px;">
                  <span style="font-size:28px;font-weight:700;color:#b8924a;letter-spacing:4px;font-family:'Courier New',Courier,monospace;">A8B2C3D4</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <p style="margin:0;font-size:15px;color:#3a3a3a;line-height:1.7;">
                  Liebe/r <strong style="color:#1e1e1e;">Max Mustermann</strong>,<br><br>
                  vielen Dank für Ihre Zahlung! Ihre Reservierung ist nun vollständig bestätigt. Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;border-radius:4px;border:1px solid #d4cec4;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 14px 0;font-size:11px;font-weight:700;color:#1e1e1e;text-transform:uppercase;letter-spacing:0.1em;">Reservierungsdetails</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Datum</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">Samstag, 4. April 2026</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Uhrzeit</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">19:00 Uhr</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Personen</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">4 Personen</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Tisch</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">Tisch 5</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:12px 0 2px 0;font-size:14px;color:#5a5550;font-weight:600;">Bezahlt</td><td style="padding:12px 0 2px 0;font-size:18px;color:#4a7c59;font-weight:800;text-align:right;">&#8364;50.00</td></tr>
                    </table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eaf2ed;border:1px solid #a8d4b8;border-radius:4px;">
                  <tr><td style="padding:14px 18px;">
                    <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#2d6a4a;">Zahlung erfolgreich verarbeitet</p>
                    <p style="margin:0;font-size:13px;color:#2d6a4a;line-height:1.55;">Ihre Anzahlung von &#8364;50.00 wurde erfolgreich verarbeitet. Ihre Reservierung ist nun vollständig bestätigt.</p>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f8;border:1px solid #c4d0e8;border-radius:4px;">
                  <tr><td style="padding:16px 20px;">
                    <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3a5a8a;">Wichtige Hinweise</p>
                    <p style="margin:0;font-size:13px;color:#3a5a8a;line-height:1.7;">
                      &bull; Bitte erscheinen Sie pünktlich zu Ihrer Reservierung<br>
                      &bull; Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen<br>
                      &bull; Bei Stornierung oder Änderungen kontaktieren Sie uns bitte rechtzeitig
                    </p>
                  </td></tr>
                </table>
              </td>
            </tr>
            ${emailFooter(fromName, fromEmail)}
          </table>
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
<body style="margin:0;padding:0;background-color:#f7f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background-color:#ffffff;border-radius:4px;overflow:hidden;box-shadow:6px 6px 9px rgba(0,0,0,0.12);">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${emailHeader("Geschenkgutschein")}
            <tr>
              <td style="background-color:#f5eddc;padding:28px 40px 24px 40px;text-align:center;border-bottom:1px solid #e0d4bb;">
                <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1e1e1e;letter-spacing:-0.3px;">Sie haben einen Gutschein!</h1>
                <p style="margin:0;font-size:14px;color:#5a5550;">Babsi hat Ihnen etwas Besonderes geschenkt.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 20px 40px;text-align:center;">
                <p style="margin:0 0 8px 0;font-size:11px;color:#9a948e;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;">Gutscheinwert</p>
                <div style="display:inline-block;background-color:#f5eddc;border:2px solid #b8924a;border-radius:4px;padding:14px 40px;">
                  <span style="font-size:34px;font-weight:800;color:#b8924a;letter-spacing:1px;">&#8364;500.00</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <p style="margin:0;font-size:15px;color:#3a3a3a;line-height:1.7;">
                  Hallo <strong style="color:#1e1e1e;">Maria Muster</strong>,<br><br>
                  <strong style="color:#1e1e1e;">Babsi</strong> hat Ihnen einen Geschenkgutschein im Wert von <strong style="color:#b8924a;">&#8364;500.00</strong> geschenkt. Wir freuen uns auf Ihren Besuch!
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #f0d080;border-radius:4px;">
                  <tr><td style="padding:14px 18px;">
                    <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.1em;">Persönliche Nachricht</p>
                    <p style="margin:0;font-size:14px;color:#78350f;line-height:1.55;font-style:italic;">&ldquo;Herzlichen Glückwunsch zum Geburtstag! Genieß einen schönen Abend bei Patschi!&rdquo;</p>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;border-radius:4px;border:1px solid #d4cec4;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 14px 0;font-size:11px;font-weight:700;color:#1e1e1e;text-transform:uppercase;letter-spacing:0.1em;">Gutschein-Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Gutschein-Code</td><td style="padding:10px 0;font-size:15px;color:#1e1e1e;font-weight:700;text-align:right;font-family:'Courier New',Courier,monospace;letter-spacing:2px;">GS-TGTQ0VG</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Barcode</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">1234567890</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Gültig bis</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">3. März 2027</td></tr>
                    </table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px 40px;text-align:center;">
                <a href="https://patschi.services" style="display:inline-block;background-color:#b8924a;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:4px;font-size:15px;font-weight:700;letter-spacing:0.02em;">Gutschein als PDF herunterladen &rarr;</a>
                <p style="margin:10px 0 0 0;font-size:12px;color:#9a948e;">Das PDF enthält alle Details und den Barcode zum Einlösen.</p>
              </td>
            </tr>
            ${emailFooter(fromName, fromEmail)}
          </table>
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
<body style="margin:0;padding:0;background-color:#f7f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background-color:#ffffff;border-radius:4px;overflow:hidden;box-shadow:6px 6px 9px rgba(0,0,0,0.12);">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${emailHeader("Kaufbestätigung")}
            <tr>
              <td style="background-color:#eaf2ed;padding:28px 40px 24px 40px;text-align:center;border-bottom:1px solid #c6dece;">
                <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:700;color:#1e1e1e;letter-spacing:-0.3px;">Kauf erfolgreich!</h1>
                <p style="margin:0;font-size:14px;color:#5a5550;">Ihr Geschenkgutschein wurde erstellt und versendet.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 24px 40px;">
                <p style="margin:0;font-size:15px;color:#3a3a3a;line-height:1.7;">
                  Hallo <strong style="color:#1e1e1e;">Babsi</strong>,<br><br>
                  vielen Dank für Ihren Kauf! Ihr Geschenkgutschein wurde erfolgreich erstellt und direkt an <strong style="color:#1e1e1e;">maria@example.com</strong> gesendet.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f3ee;border-radius:4px;border:1px solid #d4cec4;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 14px 0;font-size:11px;font-weight:700;color:#1e1e1e;text-transform:uppercase;letter-spacing:0.1em;">Gutschein-Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Gutschein-Code</td><td style="padding:10px 0;font-size:15px;color:#1e1e1e;font-weight:700;text-align:right;font-family:'Courier New',Courier,monospace;letter-spacing:2px;">GS-TGTQ0VG</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Betrag</td><td style="padding:10px 0;font-size:18px;color:#b8924a;font-weight:800;text-align:right;">&#8364;500.00</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #d4cec4;">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Empfänger</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">Maria Muster</td></tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:10px 0;font-size:14px;color:#5a5550;font-weight:500;">Gültig bis</td><td style="padding:10px 0;font-size:14px;color:#1e1e1e;font-weight:700;text-align:right;">3. März 2027</td></tr>
                    </table>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f8;border:1px solid #c4d0e8;border-radius:4px;">
                  <tr><td style="padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#3a5a8a;line-height:1.7;">
                      Eine Kopie des Gutscheins wurde an die E-Mail-Adresse des Empfängers gesendet. Der Gutschein kann direkt bei uns eingelöst werden.
                    </p>
                  </td></tr>
                </table>
              </td>
            </tr>
            ${emailFooter(fromName, fromEmail)}
          </table>
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
