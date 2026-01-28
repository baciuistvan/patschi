import { useState, useEffect } from 'react';
import { Mail, Save, CheckCircle, AlertTriangle, Send, Server, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function SMTPSettings() {
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState('false');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .in('key', ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_password', 'smtp_from_email', 'smtp_from_name']);

    if (data) {
      data.forEach(setting => {
        switch (setting.key) {
          case 'smtp_host':
            setSmtpHost(setting.value);
            break;
          case 'smtp_port':
            setSmtpPort(setting.value);
            break;
          case 'smtp_secure':
            setSmtpSecure(setting.value);
            break;
          case 'smtp_user':
            setSmtpUser(setting.value);
            break;
          case 'smtp_password':
            setSmtpPassword(setting.value);
            break;
          case 'smtp_from_email':
            setFromEmail(setting.value);
            break;
          case 'smtp_from_name':
            setFromName(setting.value);
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
        { key: 'smtp_host', value: smtpHost },
        { key: 'smtp_port', value: smtpPort },
        { key: 'smtp_secure', value: smtpSecure },
        { key: 'smtp_user', value: smtpUser },
        { key: 'smtp_password', value: smtpPassword },
        { key: 'smtp_from_email', value: fromEmail },
        { key: 'smtp_from_name', value: fromName },
      ], { onConflict: 'key' });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save SMTP settings:', error);
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
      const testGiftCard = {
        code: 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        original_amount: 50,
        current_balance: 50,
        recipient_name: 'Test Recipient',
        recipient_email: testEmail,
        purchaser_name: 'Test Sender',
        purchaser_email: 'test@example.com',
        message: 'This is a test gift card email from your SMTP configuration',
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        purchase_date: new Date().toISOString(),
        status: 'active'
      };

      const { data: insertedCard, error: insertError } = await supabase
        .from('gift_cards')
        .insert([testGiftCard])
        .select()
        .single();

      if (insertError || !insertedCard) {
        throw insertError || new Error('Failed to create test gift card');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gift-card-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ giftCardId: insertedCard.id })
      });

      const result = await response.json();

      await supabase
        .from('gift_cards')
        .delete()
        .eq('id', insertedCard.id);

      if (response.ok) {
        setTestResult({
          success: true,
          message: `Test email sent successfully to ${testEmail}! Check your inbox (including spam folder).`
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || result.message || 'Failed to send test email. Check browser console for details.'
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
        <div className="text-slate-400">Loading SMTP settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">SMTP Email Configuration</h3>
        <p className="text-slate-400 text-sm">
          Configure your SMTP server for sending emails
        </p>
      </div>

      <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Server className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-300 font-medium mb-2">SMTP Server Information</p>
            <p className="text-blue-200/80">
              Get your SMTP credentials from your hosting provider's email settings. Common configurations:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-blue-200/80 ml-4">
              <li><strong>Host:</strong> mail.yourdomain.com or smtp.yourdomain.com</li>
              <li><strong>Port:</strong> 587 (TLS) or 465 (SSL)</li>
              <li><strong>Username:</strong> Your full email address</li>
              <li><strong>Password:</strong> Your email account password</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              SMTP Host
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Your mail server hostname (e.g., mail.patschi.at)
            </p>
            <input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="mail.yourdomain.com"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              SMTP Port
            </label>
            <p className="text-xs text-slate-400 mb-3">
              587 for TLS (recommended) or 465 for SSL
            </p>
            <select
              value={smtpPort}
              onChange={(e) => {
                setSmtpPort(e.target.value);
                setSmtpSecure(e.target.value === '465' ? 'true' : 'false');
              }}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="587">587 (TLS)</option>
              <option value="465">465 (SSL)</option>
              <option value="25">25 (Unsecured)</option>
              <option value="2525">2525 (Alternative)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            SMTP Username
          </label>
          <p className="text-xs text-slate-400 mb-3">
            Usually your full email address
          </p>
          <input
            type="text"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
            placeholder="noreply@patschi.at"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            SMTP Password
          </label>
          <p className="text-xs text-slate-400 mb-3">
            Your email account password
          </p>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 pr-12 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700">
          <h4 className="text-sm font-semibold text-white mb-4">Email Sender Information</h4>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                From Email Address
              </label>
              <p className="text-xs text-slate-400 mb-3">
                The email address that appears as the sender
              </p>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@patschi.at"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                From Name
              </label>
              <p className="text-xs text-slate-400 mb-3">
                The sender name that appears in the recipient's inbox
              </p>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Patschi Serfaus"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-yellow-300 font-medium mb-2">Security Note</p>
            <p className="text-yellow-200/80">
              Your SMTP password is stored in the database. Make sure your Supabase project has proper security settings enabled.
              For production use, consider using environment variables or Supabase secrets for sensitive credentials.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-green-900/20 border border-green-800 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Test Email Configuration</h4>
        <p className="text-sm text-slate-300 mb-4">
          Send a test gift card email to verify your SMTP configuration is working correctly.
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
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
