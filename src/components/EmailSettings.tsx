import { useState, useEffect } from 'react';
import { Mail, Save, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export function EmailSettings() {
  const { t } = useLanguage();
  const [emailFromName, setEmailFromName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadEmailSettings();
  }, []);

  const loadEmailSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .in('key', ['email_from_name', 'email_subject', 'email_body']);

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
        <h2 className="text-2xl font-bold text-white mb-2">{t('email.title')}</h2>
        <p className="text-slate-400">
          Customize the confirmation email sent to customers after booking
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
                {t('email.from_name')}
              </label>
              <p className="text-xs text-slate-400 mb-3">
                The sender name that will appear in the email
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
                {t('email.subject')}
              </label>
              <p className="text-xs text-slate-400 mb-3">
                The subject line for confirmation emails
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
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('email.body')}
              </label>
              <p className="text-xs text-slate-400 mb-3">
                The main content of the confirmation email
              </p>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={12}
                placeholder="Dear {{customer_name}},&#10;&#10;Thank you for your reservation..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Available Variables</h3>
        <p className="text-sm text-slate-300 mb-4">
          You can use these placeholders in your email subject and body. They will be replaced with actual booking data:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{customer_name}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Customer's full name</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{customer_email}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Customer's email address</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{customer_phone}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Customer's phone number</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{reservation_date}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Reservation date</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{reservation_time}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Reservation time</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{party_size}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Number of guests</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{table_number}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Table number</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{room_name}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Room name</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{special_requests}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Special requests or notes</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <code className="text-blue-400">{'{{deposit_amount}}'}</code>
            <p className="text-slate-400 text-xs mt-1">Deposit amount paid</p>
          </div>
        </div>
      </div>

      <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Test Email Configuration</h3>
        <p className="text-sm text-slate-300 mb-4">
          Send a test gift card email to verify your email configuration is working correctly.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            onClick={handleTestEmail}
            disabled={testingEmail}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>{testingEmail ? 'Sending...' : 'Send Test Email'}</span>
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
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
        >
          {saveSuccess ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Saved Successfully</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Email Template'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
