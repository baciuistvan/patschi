import { useState, useEffect } from 'react';
import { Mail, Save, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export function EmailSettings() {
  const { t } = useLanguage();
  const [emailFromName, setEmailFromName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailBodyHtml, setEmailBodyHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingReservationEmail, setTestingReservationEmail] = useState(false);
  const [testReservationResult, setTestReservationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'html'>('text');

  useEffect(() => {
    loadEmailSettings();
  }, []);

  const loadEmailSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .in('key', ['email_from_name', 'email_subject', 'email_body', 'email_body_html']);

    if (data) {
      data.forEach(setting => {
        switch (setting.key) {
          case 'email_from_name':
            setEmailFromName(setting.value);
            break;
          case 'email_subject':
            setEmailSubject(setting.value);
            break;
          case 'email_body':
            setEmailBody(setting.value);
            break;
          case 'email_body_html':
            setEmailBodyHtml(setting.value);
            break;
        }
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      await supabase.from('settings').upsert([
        { key: 'email_from_name', value: emailFromName },
        { key: 'email_subject', value: emailSubject },
        { key: 'email_body', value: emailBody },
        { key: 'email_body_html', value: emailBodyHtml },
      ], { onConflict: 'key' });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save email settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestResult({ success: false, message: 'Please enter a valid email address' });
      return;
    }

    setTestingEmail(true);
    setTestResult(null);

    try {
      // Create a test gift card to send
      const testGiftCard = {
        id: 'test-' + Date.now(),
        code: 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        initial_balance: '50.00',
        current_balance: '50.00',
        recipient_name: 'Test Recipient',
        recipient_email: testEmail,
        purchaser_name: 'Test Sender',
        purchaser_email: 'test@example.com',
        message: 'This is a test gift card email',
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      };

      // Insert test gift card
      const { error: insertError } = await supabase
        .from('gift_cards')
        .insert([testGiftCard]);

      if (insertError) {
        throw insertError;
      }

      // Call the send email function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gift-card-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ giftCardId: testGiftCard.id })
      });

      const result = await response.json();

      // Delete test gift card
      await supabase
        .from('gift_cards')
        .delete()
        .eq('id', testGiftCard.id);

      if (response.ok) {
        setTestResult({
          success: true,
          message: `Test email sent successfully to ${testEmail}! Check your inbox.`
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Failed to send test email. Check console for details.'
        });
        console.error('Test email error:', result);
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'An error occurred while sending test email'
      });
      console.error('Test email error:', error);
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestReservationEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestReservationResult({ success: false, message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' });
      return;
    }

    setTestingReservationEmail(true);
    setTestReservationResult(null);

    try {
      const testReservation = {
        customer_name: 'Max Mustermann',
        customer_email: testEmail,
        customer_phone: '+43 123 456789',
        reservation_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reservation_time: '15:45',
        party_size: 4,
        special_requests: 'Fensterplatz bevorzugt',
        payment_amount: 350,
        booking_code: 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        table_number: 'Tisch 5',
        room_name: 'Hauptraum'
      };

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reservation-confirmation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(testReservation)
      });

      const result = await response.json();

      if (response.ok) {
        setTestReservationResult({
          success: true,
          message: `Test-Reservierungsbestätigung erfolgreich an ${testEmail} gesendet! Bitte prüfen Sie Ihr Postfach.`
        });
      } else {
        setTestReservationResult({
          success: false,
          message: result.error || 'Fehler beim Senden der Test-E-Mail. Bitte prüfen Sie die Konsole für Details.'
        });
        console.error('Test email error:', result);
      }
    } catch (error: any) {
      setTestReservationResult({
        success: false,
        message: error.message || 'Ein Fehler ist beim Senden der Test-E-Mail aufgetreten'
      });
      console.error('Test email error:', error);
    } finally {
      setTestingReservationEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-400">Loading email settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Reservierungsbestätigungs-E-Mail</h2>
        <p className="text-slate-400">
          Passen Sie die Bestätigungs-E-Mail an, die nach einer Reservierung an Kunden gesendet wird
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Mail className="w-8 h-8 text-blue-400" />
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Absendername
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Der Name, der als Absender in der E-Mail erscheint
              </p>
              <input
                type="text"
                value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)}
                placeholder="Patschi"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                E-Mail-Betreff
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Die Betreffzeile für Bestätigungs-E-Mails
              </p>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Reservation Confirmation - {{customer_name}}"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">
                  E-Mail-Inhalt
                </label>
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActiveTab('text')}
                    className={`px-4 py-1.5 text-sm font-medium rounded transition ${
                      activeTab === 'text'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('html')}
                    className={`px-4 py-1.5 text-sm font-medium rounded transition ${
                      activeTab === 'html'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    HTML
                  </button>
                </div>
              </div>

              {activeTab === 'text' ? (
                <>
                  <p className="text-xs text-slate-400 mb-3">
                    Einfacher Text für die E-Mail (wird als Fallback verwendet, wenn HTML nicht angezeigt werden kann)
                  </p>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={12}
                    placeholder="Liebe/r {{customer_name}},&#10;&#10;vielen Dank für Ihre Reservierung..."
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-400 mb-3">
                    Vollständiger HTML-Code für die E-Mail. Verwenden Sie table-basiertes Layout für beste E-Mail-Client-Kompatibilität.
                  </p>
                  <textarea
                    value={emailBodyHtml}
                    onChange={(e) => setEmailBodyHtml(e.target.value)}
                    rows={20}
                    placeholder="<!DOCTYPE html>&#10;<html>&#10;<head>&#10;  <meta charset='utf-8'>&#10;</head>&#10;<body>&#10;  <!-- Ihr HTML-Code hier -->&#10;</body>&#10;</html>"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Verfügbare Variablen</h3>
        <p className="text-sm text-slate-300 mb-4">
          Sie können diese Platzhalter in Betreff und Text verwenden. Sie werden automatisch durch die tatsächlichen Reservierungsdaten ersetzt:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{customer_name}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Name des Kunden</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{customer_email}}'}</code>
            <p className="text-slate-400 text-xs mt-1">E-Mail-Adresse des Kunden</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{customer_phone}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Telefonnummer des Kunden</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{booking_code}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Buchungsnummer</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{reservation_date}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Reservierungsdatum</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{reservation_time}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Reservierungszeit</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{party_size}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Anzahl Personen</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{table_number}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Tischnummer</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{room_name}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Raumname</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{special_requests}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Besondere Wünsche</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{deposit_amount}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Bezahlte Anzahlung</p>
          </div>
        </div>
      </div>

      <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Test-Reservierungsbestätigung senden</h3>
        <p className="text-sm text-slate-300 mb-4">
          Senden Sie eine Test-Reservierungsbestätigung, um Ihre E-Mail-Konfiguration und das Template zu überprüfen.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="ihre@email.de"
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            onClick={handleTestReservationEmail}
            disabled={testingReservationEmail}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>{testingReservationEmail ? 'Wird gesendet...' : 'Test-E-Mail senden'}</span>
          </button>
        </div>
        {testReservationResult && (
          <div className={`mt-4 p-4 rounded-lg ${testReservationResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
            <p className={`text-sm ${testReservationResult.success ? 'text-green-300' : 'text-red-300'}`}>
              {testReservationResult.message}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
        >
          {saveSuccess ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Erfolgreich gespeichert</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{saving ? 'Wird gespeichert...' : 'E-Mail-Vorlage speichern'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
