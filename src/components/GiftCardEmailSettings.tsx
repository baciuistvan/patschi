import { useState, useEffect } from 'react';
import { Gift, Save, CheckCircle, Send, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function GiftCardEmailSettings() {
  const [emailFromName, setEmailFromName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBodyText, setEmailBodyText] = useState('');
  const [emailBodyHtml, setEmailBodyHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'html'>('html');
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    loadEmailSettings();
  }, []);

  const loadEmailSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .in('key', ['gift_card_email_from_name', 'gift_card_email_subject', 'gift_card_email_body_text', 'gift_card_email_body_html']);

    if (data) {
      data.forEach(setting => {
        switch (setting.key) {
          case 'gift_card_email_from_name':
            setEmailFromName(setting.value);
            break;
          case 'gift_card_email_subject':
            setEmailSubject(setting.value);
            break;
          case 'gift_card_email_body_text':
            setEmailBodyText(setting.value);
            break;
          case 'gift_card_email_body_html':
            setEmailBodyHtml(setting.value);
            break;
        }
      });
    }
    setLoading(false);
  };

  const getPreviewHtml = () => {
    const sampleData = {
      recipient_name: 'Anna Müller',
      purchaser_name: 'Max Mustermann',
      code: 'GIFT-ABC123',
      barcode: 'https://example.com/barcode.png',
      amount: '50.00',
      expiry_date: '31.12.2025',
      message: 'Viel Spaß und guten Appetit!',
      pdf_url: 'https://example.com/gift-card.pdf'
    };

    let html = emailBodyHtml || '';

    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
    });

    return html;
  };

  const insertVariable = (variable: string) => {
    if (activeTab === 'html') {
      const textarea = document.getElementById('html-editor') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = emailBodyHtml;
        const before = text.substring(0, start);
        const after = text.substring(end);
        setEmailBodyHtml(before + variable + after);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    } else {
      const textarea = document.getElementById('text-editor') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = emailBodyText;
        const before = text.substring(0, start);
        const after = text.substring(end);
        setEmailBodyText(before + variable + after);
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
        { key: 'gift_card_email_from_name', value: emailFromName },
        { key: 'gift_card_email_subject', value: emailSubject },
        { key: 'gift_card_email_body_text', value: emailBodyText },
        { key: 'gift_card_email_body_html', value: emailBodyHtml },
      ], { onConflict: 'key' });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save gift card email settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestResult({ success: false, message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein' });
      return;
    }

    setTestingEmail(true);
    setTestResult(null);

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

      const { error: insertError } = await supabase
        .from('gift_cards')
        .insert([testGiftCard]);

      if (insertError) {
        throw insertError;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gift-card-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ giftCardId: testGiftCard.id })
      });

      const result = await response.json();

      await supabase
        .from('gift_cards')
        .delete()
        .eq('id', testGiftCard.id);

      if (response.ok) {
        setTestResult({
          success: true,
          message: `Test-E-Mail erfolgreich an ${testEmail} gesendet! Bitte prüfen Sie Ihr Postfach.`
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Fehler beim Senden der Test-E-Mail. Bitte prüfen Sie die Konsole für Details.'
        });
        console.error('Test email error:', result);
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Ein Fehler ist beim Senden der Test-E-Mail aufgetreten'
      });
      console.error('Test email error:', error);
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-400">E-Mail-Einstellungen werden geladen...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Gutschein-E-Mail Vorlage</h2>
        <p className="text-slate-400">
          Passen Sie die E-Mail an, die nach dem Kauf eines Gutscheins an den Empfänger gesendet wird
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Gift className="w-8 h-8 text-green-400" />
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
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                E-Mail-Betreff
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Die Betreffzeile für Gutschein-E-Mails
              </p>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Ihr Gutschein von {{purchaser_name}}"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Template-Variablen (zum Einfügen klicken)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => insertVariable('{{recipient_name}}')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
                >
                  {'{{recipient_name}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{{purchaser_name}}')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
                >
                  {'{{purchaser_name}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{{code}}')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
                >
                  {'{{code}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{{barcode}}')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
                >
                  {'{{barcode}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{{amount}}')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
                >
                  {'{{amount}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{{expiry_date}}')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
                >
                  {'{{expiry_date}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{{message}}')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
                >
                  {'{{message}}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{{pdf_url}}')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
                >
                  {'{{pdf_url}}'}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">
                  E-Mail-Inhalt
                </label>
                <div className="flex items-center space-x-3">
                  {activeTab === 'html' && (
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 transition text-sm"
                    >
                      {showPreview ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          <span>Vorschau ausblenden</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>Vorschau anzeigen</span>
                        </>
                      )}
                    </button>
                  )}
                  <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setActiveTab('text')}
                      className={`px-4 py-1.5 text-sm font-medium rounded transition ${
                        activeTab === 'text'
                          ? 'bg-green-600 text-white'
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
                          ? 'bg-green-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      HTML
                    </button>
                  </div>
                </div>
              </div>

              {activeTab === 'text' ? (
                <>
                  <p className="text-xs text-slate-400 mb-3">
                    Einfacher Text für die E-Mail (wird als Fallback verwendet, wenn HTML nicht angezeigt werden kann)
                  </p>
                  <textarea
                    id="text-editor"
                    value={emailBodyText}
                    onChange={(e) => setEmailBodyText(e.target.value)}
                    rows={16}
                    placeholder="Liebe/r {{recipient_name}},&#10;&#10;{{purchaser_name}} hat Ihnen einen Gutschein geschenkt!&#10;&#10;Gutscheincode: {{code}}&#10;Wert: {{amount}} EUR&#10;Gültig bis: {{expiry_date}}&#10;&#10;Nachricht: {{message}}"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-400 mb-3">
                    Vollständiger HTML-Code für die E-Mail. Verwenden Sie table-basiertes Layout für beste E-Mail-Client-Kompatibilität.
                  </p>
                  <div className={`grid gap-4 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="flex flex-col">
                      <div className="text-xs font-medium text-slate-400 mb-2">HTML Editor</div>
                      <textarea
                        id="html-editor"
                        value={emailBodyHtml}
                        onChange={(e) => setEmailBodyHtml(e.target.value)}
                        rows={24}
                        placeholder="<!DOCTYPE html>&#10;<html>&#10;<head>&#10;  <meta charset='utf-8'>&#10;</head>&#10;<body>&#10;  <h1>Ihr Gutschein</h1>&#10;  <p>Code: {{code}}</p>&#10;  <p>Wert: {{amount}} EUR</p>&#10;</body>&#10;</html>"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      />
                    </div>

                    {showPreview && (
                      <div className="flex flex-col">
                        <div className="text-xs font-medium text-slate-400 mb-2">Live-Vorschau</div>
                        <div className="bg-white rounded-lg overflow-hidden border border-slate-600 flex-1">
                          <iframe
                            srcDoc={getPreviewHtml()}
                            className="w-full h-full"
                            style={{ minHeight: '600px' }}
                            sandbox="allow-same-origin"
                            title="Gift Card Email Preview"
                          />
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

      <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Verfügbare Variablen</h3>
        <p className="text-sm text-slate-300 mb-4">
          Sie können diese Platzhalter in Betreff und Text verwenden. Sie werden automatisch durch die tatsächlichen Gutscheindaten ersetzt:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-green-400">{'{{recipient_name}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Name des Empfängers</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-green-400">{'{{purchaser_name}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Name des Käufers</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-green-400">{'{{code}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Gutscheincode</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-green-400">{'{{barcode}}'}</code>
            <p className="text-slate-400 text-xs mt-1">URL zum Barcode-Bild</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-green-400">{'{{amount}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Gutscheinwert</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-green-400">{'{{expiry_date}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Gültigkeitsdatum</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-green-400">{'{{message}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Persönliche Nachricht</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-green-400">{'{{pdf_url}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Link zum PDF-Gutschein</p>
          </div>
        </div>
      </div>

      <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Test-E-Mail senden</h3>
        <p className="text-sm text-slate-300 mb-4">
          Senden Sie eine Test-Gutschein-E-Mail, um Ihre Vorlage zu überprüfen.
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
            onClick={handleTestEmail}
            disabled={testingEmail}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>{testingEmail ? 'Wird gesendet...' : 'Test-E-Mail senden'}</span>
          </button>
        </div>
        {testResult && (
          <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
            <p className={`text-sm ${testResult.success ? 'text-green-300' : 'text-red-300'}`}>
              {testResult.message}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
        >
          {saveSuccess ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Erfolgreich gespeichert</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{saving ? 'Wird gespeichert...' : 'Vorlage speichern'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
