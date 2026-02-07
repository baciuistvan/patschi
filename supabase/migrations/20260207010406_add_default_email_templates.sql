/*
  # Add Default Email Templates
  
  1. Changes
    - Inserts default email templates for reservation confirmation emails
    - Provides a starting template that users can customize
    - Includes German language template with all available variables
  
  2. Templates Include
    - email_from_name: Default sender name
    - email_subject: Subject line with customer name variable
    - email_body: Complete email body with all available variables
*/

-- Insert default email templates if they don't exist
INSERT INTO settings (key, value)
VALUES 
  ('email_from_name', 'Patschi Restaurant')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value)
VALUES 
  ('email_subject', 'Reservierungsbestätigung - {{customer_name}}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value)
VALUES 
  ('email_body', 'Liebe/r {{customer_name}},

vielen Dank für Ihre Reservierung bei uns!

BUCHUNGSNUMMER: {{booking_code}}

Ihre Reservierungsdetails:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Datum: {{reservation_date}}
⏰ Uhrzeit: {{reservation_time}} Uhr
👥 Anzahl Personen: {{party_size}}
🪑 Tisch: {{table_number}}
🏠 Raum: {{room_name}}
💳 Anzahlung: €{{deposit_amount}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Besondere Wünsche: {{special_requests}}

WICHTIGE HINWEISE:
• Bitte erscheinen Sie pünktlich zu Ihrer Reservierung
• Bei Verspätung über 15 Minuten kann Ihre Reservierung verfallen
• Bei Stornierung oder Änderungen kontaktieren Sie uns bitte rechtzeitig

Wir freuen uns sehr, Sie bei uns begrüßen zu dürfen!

Mit freundlichen Grüßen,
Ihr Patschi Team

Bei Fragen erreichen Sie uns unter:
📧 E-Mail: {{customer_email}}
📞 Telefon: {{customer_phone}}')
ON CONFLICT (key) DO NOTHING;
