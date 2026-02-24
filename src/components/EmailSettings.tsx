import { useState, useEffect } from 'react';
import { Mail, Save, CheckCircle, Send, Eye, EyeOff, Gift } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function EmailSettings() {
  const [emailFromName, setEmailFromName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailBodyHtml, setEmailBodyHtml] = useState('');

  const [giftCardEmailFromName, setGiftCardEmailFromName] = useState('');
  const [giftCardEmailSubject, setGiftCardEmailSubject] = useState('');
  const [giftCardEmailBodyText, setGiftCardEmailBodyText] = useState('');
  const [giftCardEmailBodyHtml, setGiftCardEmailBodyHtml] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingReservationEmail, setTestingReservationEmail] = useState(false);
  const [testReservationResult, setTestReservationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingGiftCardEmail, setTestingGiftCardEmail] = useState(false);
  const [testGiftCardResult, setTestGiftCardResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'html'>('text');
  const [showPreview, setShowPreview] = useState(true);
  const [activeGiftCardTab, setActiveGiftCardTab] = useState<'text' | 'html'>('html');
  const [showGiftCardPreview, setShowGiftCardPreview] = useState(true);

  useEffect(() => {
    loadEmailSettings();
  }, []);

  const loadEmailSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .in('key', [
        'email_from_name', 'email_subject', 'email_body', 'email_body_html',
        'gift_card_email_from_name', 'gift_card_email_subject', 'gift_card_email_body_text', 'gift_card_email_body_html'
      ]);

    if (data) {
      data.forEach(setting => {
        switch (setting.key) {
          case 'email_from_name': setEmailFromName(setting.value); break;
          case 'email_subject': setEmailSubject(setting.value); break;
          case 'email_body': setEmailBody(setting.value); break;
          case 'email_body_html': setEmailBodyHtml(setting.value); break;
          case 'gift_card_email_from_name': setGiftCardEmailFromName(setting.value); break;
          case 'gift_card_email_subject': setGiftCardEmailSubject(setting.value); break;
          case 'gift_card_email_body_text': setGiftCardEmailBodyText(setting.value); break;
          case 'gift_card_email_body_html': setGiftCardEmailBodyHtml(setting.value); break;
        }
      });
    }
    setLoading(false);
  };

  const getPreviewHtml = () => {
    const sampleData: Record<string, string> = {
      customer_name: 'Max Mustermann',
      customer_email: 'max@example.com',
      customer_phone: '+43 123 456789',
      booking_code: 'ABC123',
      reservation_date: '15.03.2024',
      reservation_time: '19:00',
      party_size: '4',
      table_number: 'Tisch 12',
      room_name: 'Hauptraum',
      special_requests: 'Fensterplatz bevorzugt',
      deposit_amount: '50.00'
    };
    let html = emailBodyHtml || '';
    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return html;
  };

  const getGiftCardPreviewHtml = () => {
    const sampleData: Record<string, string> = {
      recipient_name: 'Anna Müller',
      purchaser_name: 'Max Mustermann',
      code: 'GIFT-ABC123',
      barcode: 'https://example.com/barcode.png',
      amount: '50.00',
      expiry_date: '31.12.2025',
      message: 'Viel Spaß und guten Appetit!',
      pdf_url: 'https://example.com/gift-card.pdf'
    };
    let html = giftCardEmailBodyHtml || '';
    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return html;
  };

  const insertGiftCardVariable = (variable: string) => {
    if (activeGiftCardTab === 'html') {
      const textarea = document.getElementById('gift-card-html-editor') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = giftCardEmailBodyHtml.substring(0, start);
        const after = giftCardEmailBodyHtml.substring(end);
        setGiftCardEmailBodyHtml(before + variable + after);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    } else {
      const textarea = document.getElementById('gift-card-text-editor') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = giftCardEmailBodyText.substring(0, start);
        const after = giftCardEmailBodyText.substring(end);
        setGiftCardEmailBodyText(before + variable + after);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    }
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
        { key: 'gift_card_email_from_name', value: giftCardEmailFromName },
        { key: 'gift_card_email_subject', value: giftCardEmailSubject },
        { key: 'gift_card_email_body_text', value: giftCardEmailBodyText },
        { key: 'gift_card_email_body_html', value: giftCardEmailBodyHtml },
      ], { onConflict: 'key' });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save email settings:', error);
    } finally {
      setSaving(false);
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify(testReservation)
      });
      const result = await response.json();
      if (response.ok) {
        setTestReservationResult({ success: true, message: `Test-Reservierungsbestätigung erfolgreich an ${testEmail} gesendet! Bitte prüfen Sie Ihr Postfach.` });
      } else {
        setTestReservationResult({ success: false, message: result.error || 'Fehler beim Senden der Test-E-Mail.' });
        console.error('Test email error:', result);
      }
    } catch (error: any) {
      setTestReservationResult({ success: false, message: error.message || 'Ein Fehler ist aufgetreten' });
    } finally {
      setTestingReservationEmail(false);
    }
  };

  const handleTestGiftCardEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestGiftCardResult({ success: false, message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' });
      return;
    }
    setTestingGiftCardEmail(true);
    setTestGiftCardResult(null);
    try {
      const testGiftCard = {
        id: 'test-' + Date.now(),
        code: 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        initial_balance: '50.00',
        current_balance: '50.00',
        recipient_name: 'Test Empfänger',
        recipient_email: testEmail,
        purchaser_name: 'Test Käufer',
        purchaser_email: 'test@example.com',
        message: 'Dies ist eine Test-Gutschein-E-Mail',
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      };
      const { error: insertError } = await supabase.from('gift_cards').insert([testGiftCard]);
      if (insertError) throw insertError;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gift-card-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ giftCardId: testGiftCard.id })
      });
      const result = await response.json();
      await supabase.from('gift_cards').delete().eq('id', testGiftCard.id);
      if (response.ok) {
        setTestGiftCardResult({ success: true, message: `Test-Gutschein-E-Mail erfolgreich an ${testEmail} gesendet!` });
      } else {
        setTestGiftCardResult({ success: false, message: result.error || 'Fehler beim Senden der Test-E-Mail.' });
        console.error('Test gift card email error:', result);
      }
    } catch (error: any) {
      setTestGiftCardResult({ success: false, message: error.message || 'Ein Fehler ist aufgetreten' });
    } finally {
      setTestingGiftCardEmail(false);
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Absendername</label>
              <p className="text-xs text-slate-400 mb-3">Der Name, der als Absender in der E-Mail erscheint</p>
              <input
                type="text"
                value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)}
                placeholder="Patschi"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">E-Mail-Betreff</label>
              <p className="text-xs text-slate-400 mb-3">Die Betreffzeile für Bestätigungs-E-Mails</p>
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
                <label className="block text-sm font-medium text-slate-300">E-Mail-Inhalt</label>
                <div className="flex items-center space-x-3">
                  {activeTab === 'html' && (
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 transition text-sm"
                    >
                      {showPreview ? <><EyeOff className="w-4 h-4" /><span>Vorschau ausblenden</span></> : <><Eye className="w-4 h-4" /><span>Vorschau anzeigen</span></>}
                    </button>
                  )}
                  <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                    <button type="button" onClick={() => setActiveTab('text')} className={`px-4 py-1.5 text-sm font-medium rounded transition ${activeTab === 'text' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Text</button>
                    <button type="button" onClick={() => setActiveTab('html')} className={`px-4 py-1.5 text-sm font-medium rounded transition ${activeTab === 'html' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>HTML</button>
                  </div>
                </div>
              </div>

              {activeTab === 'text' ? (
                <>
                  <p className="text-xs text-slate-400 mb-3">Einfacher Text für die E-Mail (wird als Fallback verwendet, wenn HTML nicht angezeigt werden kann)</p>
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
                  <p className="text-xs text-slate-400 mb-3">Vollständiger HTML-Code für die E-Mail. Verwenden Sie table-basiertes Layout für beste E-Mail-Client-Kompatibilität.</p>
                  <div className={`grid gap-4 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="flex flex-col">
                      <div className="text-xs font-medium text-slate-400 mb-2">HTML Editor</div>
                      <textarea
                        value={emailBodyHtml}
                        onChange={(e) => setEmailBodyHtml(e.target.value)}
                        rows={24}
                        placeholder="<!DOCTYPE html>&#10;<html>&#10;<head>&#10;  <meta charset='utf-8'>&#10;</head>&#10;<body>&#10;  <!-- Ihr HTML-Code hier -->&#10;</body>&#10;</html>"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                    {showPreview && (
                      <div className="flex flex-col">
                        <div className="text-xs font-medium text-slate-400 mb-2">Live-Vorschau</div>
                        <div className="bg-white rounded-lg overflow-hidden border border-slate-600 flex-1">
                          <iframe srcDoc={getPreviewHtml()} className="w-full h-full" style={{ minHeight: '600px' }} sandbox="allow-same-origin" title="Email Preview" />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Gutschein-E-Mail</h2>
          <p className="text-slate-400">Passen Sie die E-Mail an, die nach dem Kauf eines Gutscheins an den Empfänger gesendet wird</p>
        </div>

        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Gift className="w-8 h-8 text-amber-400" />
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Absendername (Gutschein)</label>
              <p className="text-xs text-slate-400 mb-3">Der Name, der als Absender in der Gutschein-E-Mail erscheint</p>
              <input
                type="text"
                value={giftCardEmailFromName}
                onChange={(e) => setGiftCardEmailFromName(e.target.value)}
                placeholder="Patschi"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">E-Mail-Betreff (Gutschein)</label>
              <p className="text-xs text-slate-400 mb-3">Die Betreffzeile für Gutschein-E-Mails</p>
              <input
                type="text"
                value={giftCardEmailSubject}
                onChange={(e) => setGiftCardEmailSubject(e.target.value)}
                placeholder="Ihr Gutschein von {{purchaser_name}}"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Template-Variablen (zum Einfügen klicken)</label>
              <div className="flex flex-wrap gap-2">
                {['{{recipient_name}}', '{{purchaser_name}}', '{{code}}', '{{barcode}}', '{{amount}}', '{{expiry_date}}', '{{message}}', '{{pdf_url}}'].map(v => (
                  <button key={v} type="button" onClick={() => insertGiftCardVariable(v)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm transition">{v}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">E-Mail-Inhalt (Gutschein)</label>
                <div className="flex items-center space-x-3">
                  {activeGiftCardTab === 'html' && (
                    <button type="button" onClick={() => setShowGiftCardPreview(!showGiftCardPreview)} className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 transition text-sm">
                      {showGiftCardPreview ? <><EyeOff className="w-4 h-4" /><span>Vorschau ausblenden</span></> : <><Eye className="w-4 h-4" /><span>Vorschau anzeigen</span></>}
                    </button>
                  )}
                  <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                    <button type="button" onClick={() => setActiveGiftCardTab('text')} className={`px-4 py-1.5 text-sm font-medium rounded transition ${activeGiftCardTab === 'text' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}>Text</button>
                    <button type="button" onClick={() => setActiveGiftCardTab('html')} className={`px-4 py-1.5 text-sm font-medium rounded transition ${activeGiftCardTab === 'html' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}>HTML</button>
                  </div>
                </div>
              </div>

              {activeGiftCardTab === 'text' ? (
                <>
                  <p className="text-xs text-slate-400 mb-3">Einfacher Text für die Gutschein-E-Mail</p>
                  <textarea
                    id="gift-card-text-editor"
                    value={giftCardEmailBodyText}
                    onChange={(e) => setGiftCardEmailBodyText(e.target.value)}
                    rows={16}
                    placeholder="Liebe/r {{recipient_name}},&#10;&#10;{{purchaser_name}} hat Ihnen einen Gutschein geschenkt!&#10;&#10;Gutscheincode: {{code}}&#10;Wert: {{amount}} EUR&#10;Gültig bis: {{expiry_date}}&#10;&#10;Nachricht: {{message}}"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-400 mb-3">Vollständiger HTML-Code für die Gutschein-E-Mail.</p>
                  <div className={`grid gap-4 ${showGiftCardPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="flex flex-col">
                      <div className="text-xs font-medium text-slate-400 mb-2">HTML Editor</div>
                      <textarea
                        id="gift-card-html-editor"
                        value={giftCardEmailBodyHtml}
                        onChange={(e) => setGiftCardEmailBodyHtml(e.target.value)}
                        rows={24}
                        placeholder="<!DOCTYPE html>&#10;<html>&#10;<head>&#10;  <meta charset='utf-8'>&#10;</head>&#10;<body>&#10;  <h1>Ihr Gutschein</h1>&#10;  <p>Code: {{code}}</p>&#10;</body>&#10;</html>"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                      />
                    </div>
                    {showGiftCardPreview && (
                      <div className="flex flex-col">
                        <div className="text-xs font-medium text-slate-400 mb-2">Live-Vorschau</div>
                        <div className="bg-white rounded-lg overflow-hidden border border-slate-600 flex-1">
                          <iframe srcDoc={getGiftCardPreviewHtml()} className="w-full h-full" style={{ minHeight: '600px' }} sandbox="allow-same-origin" title="Gift Card Email Preview" />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Gutschein-Variablen</h3>
        <p className="text-sm text-slate-300 mb-4">Diese Platzhalter können in Gutschein-E-Mails verwendet werden:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            ['{{recipient_name}}', 'Name des Empfängers'],
            ['{{purchaser_name}}', 'Name des Käufers'],
            ['{{code}}', 'Gutscheincode'],
            ['{{barcode}}', 'URL zum Barcode-Bild'],
            ['{{amount}}', 'Gutscheinwert'],
            ['{{expiry_date}}', 'Gültigkeitsdatum'],
            ['{{message}}', 'Persönliche Nachricht'],
            ['{{pdf_url}}', 'Link zum PDF-Gutschein'],
          ].map(([code, desc]) => (
            <div key={code} className="bg-slate-900 rounded-lg p-3">
              <code className="text-amber-400">{code}</code>
              <p className="text-slate-400 text-xs mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Test-Gutschein-E-Mail senden</h3>
        <p className="text-sm text-slate-300 mb-4">Senden Sie eine Test-Gutschein-E-Mail, um Ihre Vorlage zu überprüfen.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="ihre@email.de"
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button onClick={handleTestGiftCardEmail} disabled={testingGiftCardEmail} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2 whitespace-nowrap">
            <Send className="w-4 h-4" />
            <span>{testingGiftCardEmail ? 'Wird gesendet...' : 'Test-E-Mail senden'}</span>
          </button>
        </div>
        {testGiftCardResult && (
          <div className={`mt-4 p-4 rounded-lg ${testGiftCardResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
            <p className={`text-sm ${testGiftCardResult.success ? 'text-green-300' : 'text-red-300'}`}>{testGiftCardResult.message}</p>
          </div>
        )}
      </div>

      <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Verfügbare Variablen (Reservierungs-E-Mail)</h3>
        <p className="text-sm text-slate-300 mb-4">Diese Platzhalter können in der Reservierungsbestätigungs-E-Mail verwendet werden:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            ['{{customer_name}}', 'Name des Kunden'],
            ['{{customer_email}}', 'E-Mail-Adresse des Kunden'],
            ['{{customer_phone}}', 'Telefonnummer des Kunden'],
            ['{{booking_code}}', 'Buchungsnummer'],
            ['{{reservation_date}}', 'Reservierungsdatum'],
            ['{{reservation_time}}', 'Reservierungszeit'],
            ['{{party_size}}', 'Anzahl Personen'],
            ['{{table_number}}', 'Tischnummer'],
            ['{{room_name}}', 'Raumname'],
            ['{{special_requests}}', 'Besondere Wünsche'],
            ['{{deposit_amount}}', 'Bezahlte Anzahlung'],
          ].map(([code, desc]) => (
            <div key={code} className="bg-slate-900 rounded-lg p-3">
              <code className="text-blue-400">{code}</code>
              <p className="text-slate-400 text-xs mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Test-Reservierungsbestätigung senden</h3>
        <p className="text-sm text-slate-300 mb-4">Senden Sie eine Test-Reservierungsbestätigung, um Ihre E-Mail-Konfiguration und das Template zu überprüfen.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="ihre@email.de"
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button onClick={handleTestReservationEmail} disabled={testingReservationEmail} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2 whitespace-nowrap">
            <Send className="w-4 h-4" />
            <span>{testingReservationEmail ? 'Wird gesendet...' : 'Test-E-Mail senden'}</span>
          </button>
        </div>
        {testReservationResult && (
          <div className={`mt-4 p-4 rounded-lg ${testReservationResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
            <p className={`text-sm ${testReservationResult.success ? 'text-green-300' : 'text-red-300'}`}>{testReservationResult.message}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-700">
        <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center space-x-2">
          {saveSuccess ? (
            <><CheckCircle className="w-5 h-5" /><span>Erfolgreich gespeichert</span></>
          ) : (
            <><Save className="w-5 h-5" /><span>{saving ? 'Wird gespeichert...' : 'E-Mail-Vorlage speichern'}</span></>
          )}
        </button>
      </div>
    </div>
  );
}
