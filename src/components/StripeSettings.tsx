import { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, CheckCircle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export function StripeSettings() {
  const { t } = useLanguage();
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState(350);
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');
  const [toggling, setToggling] = useState(false);
  const isTestMode = import.meta.env.VITE_STRIPE_TEST_MODE === 'true';
  const [testSecretKey, setTestSecretKey] = useState('');
  const [liveSecretKey, setLiveSecretKey] = useState('');
  const [testPublishableKey, setTestPublishableKey] = useState('');
  const [livePublishableKey, setLivePublishableKey] = useState('');
  const [showSecretKeys, setShowSecretKeys] = useState(false);

  useEffect(() => {
    checkStripeStatus();
    loadSettings();
    loadStripeMode();
  }, []);

  const checkStripeStatus = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-reservation`;
      const response = await fetch(apiUrl, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      setStripeConfigured(response.ok);
    } catch (error) {
      setStripeConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .in('key', [
        'deposit_amount',
        'stripe_enabled',
        'stripe_test_secret_key',
        'stripe_live_secret_key',
        'stripe_test_publishable_key',
        'stripe_live_publishable_key'
      ]);

    if (settings) {
      settings.forEach(setting => {
        switch(setting.key) {
          case 'deposit_amount':
            setDepositAmount(parseFloat(setting.value));
            break;
          case 'stripe_enabled':
            setStripeEnabled(setting.value === 'true');
            break;
          case 'stripe_test_secret_key':
            setTestSecretKey(setting.value || '');
            break;
          case 'stripe_live_secret_key':
            setLiveSecretKey(setting.value || '');
            break;
          case 'stripe_test_publishable_key':
            setTestPublishableKey(setting.value || '');
            break;
          case 'stripe_live_publishable_key':
            setLivePublishableKey(setting.value || '');
            break;
        }
      });
    }
  };

  const loadStripeMode = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-stripe-mode`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStripeMode(data.mode);
      }
    } catch (error) {
      console.error('Failed to load Stripe mode:', error);
    }
  };

  const toggleStripeMode = async () => {
    setToggling(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-stripe-mode`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        setStripeMode(data.mode);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to toggle Stripe mode:', error);
    } finally {
      setToggling(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const settingsToUpdate = [
        { key: 'deposit_amount', value: depositAmount.toString() },
        { key: 'stripe_enabled', value: stripeEnabled.toString() },
      ];

      if (testSecretKey) {
        settingsToUpdate.push({ key: 'stripe_test_secret_key', value: testSecretKey });
      }
      if (liveSecretKey) {
        settingsToUpdate.push({ key: 'stripe_live_secret_key', value: liveSecretKey });
      }
      if (testPublishableKey) {
        settingsToUpdate.push({ key: 'stripe_test_publishable_key', value: testPublishableKey });
      }
      if (livePublishableKey) {
        settingsToUpdate.push({ key: 'stripe_live_publishable_key', value: livePublishableKey });
      }

      await supabase
        .from('settings')
        .upsert(settingsToUpdate, {
          onConflict: 'key'
        });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-slate-400">Loading Stripe configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('stripe.title')}</h2>
        <p className="text-slate-400">Configure payment processing for reservations</p>
      </div>

      {isTestMode && (
        <div className="bg-amber-900/30 border-2 border-amber-500 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-lg font-semibold text-amber-300">Test Mode Active</h3>
              <p className="text-amber-200/80 text-sm mt-1">
                Stripe is running in test mode. No real transactions will be processed. Use test card: 4242 4242 4242 4242
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <CreditCard className="w-8 h-8 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Stripe Integration Status</h3>

            {stripeConfigured ? (
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-300 font-medium">Stripe is configured</p>
                  <p className="text-green-400/80 text-sm mt-1">
                    Your reservation system is connected to Stripe and ready to accept payments.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-300 font-medium">Stripe is not configured</p>
                    <p className="text-yellow-400/80 text-sm mt-1">
                      To accept payments, you need to configure Stripe integration.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 space-y-3 text-sm">
                  <p className="text-slate-300 font-medium">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-400">
                    <li>Create a Stripe account at <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline inline-flex items-center">stripe.com <ExternalLink className="w-3 h-3 ml-1" /></a></li>
                    <li>Get your API keys from the <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline inline-flex items-center">Developers section <ExternalLink className="w-3 h-3 ml-1" /></a></li>
                    <li>Configure your Stripe keys in the environment variables</li>
                  </ol>

                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-slate-300 font-medium mb-2">Need help?</p>
                    <a
                      href="https://bolt.new/setup/stripe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-400 hover:text-blue-300 transition"
                    >
                      <span>View detailed setup guide</span>
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Stripe API Mode</h3>
          <p className="text-sm text-slate-400 mb-4">
            Switch between test and live Stripe API keys. Make sure you have configured both sets of keys in your environment.
          </p>

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`px-4 py-2 rounded-lg font-semibold ${
                  stripeMode === 'test'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  Test Mode
                </div>
                <div className={`px-4 py-2 rounded-lg font-semibold ${
                  stripeMode === 'live'
                    ? 'bg-green-500/20 text-green-300 border border-green-500'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  Live Mode
                </div>
              </div>
              <button
                onClick={toggleStripeMode}
                disabled={toggling}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
              >
                {toggling ? 'Switching...' : `Switch to ${stripeMode === 'test' ? 'Live' : 'Test'}`}
              </button>
            </div>

            {stripeMode === 'test' && (
              <div className="mt-4 bg-amber-900/20 border border-amber-700 rounded-lg p-3">
                <p className="text-sm text-amber-300">
                  <strong>Test Mode Active:</strong> Using test API keys. No real charges will be made. Use test card: 4242 4242 4242 4242
                </p>
              </div>
            )}

            {stripeMode === 'live' && (
              <div className="mt-4 bg-green-900/20 border border-green-700 rounded-lg p-3">
                <p className="text-sm text-green-300">
                  <strong>Live Mode Active:</strong> Using live API keys. Real charges will be processed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Stripe API Keys</h3>
          <p className="text-sm text-slate-400 mb-4">
            Enter your Stripe API keys. Get them from your <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Stripe Dashboard</a>.
          </p>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-white">Test Mode Keys</h4>
                <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded">For Testing</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Test Publishable Key
                </label>
                <input
                  type="text"
                  value={testPublishableKey}
                  onChange={(e) => setTestPublishableKey(e.target.value)}
                  placeholder="pk_test_..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Test Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showSecretKeys ? "text" : "password"}
                    value={testSecretKey}
                    onChange={(e) => setTestSecretKey(e.target.value)}
                    placeholder="sk_test_..."
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm pr-24"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKeys(!showSecretKeys)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-300 bg-slate-700 px-3 py-1 rounded"
                  >
                    {showSecretKeys ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-white">Live Mode Keys</h4>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded">Real Payments</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Live Publishable Key
                </label>
                <input
                  type="text"
                  value={livePublishableKey}
                  onChange={(e) => setLivePublishableKey(e.target.value)}
                  placeholder="pk_live_..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Live Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showSecretKeys ? "text" : "password"}
                    value={liveSecretKey}
                    onChange={(e) => setLiveSecretKey(e.target.value)}
                    placeholder="sk_live_..."
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm pr-24"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKeys(!showSecretKeys)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-300 bg-slate-700 px-3 py-1 rounded"
                  >
                    {showSecretKeys ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {(testSecretKey.startsWith('sk_live') || liveSecretKey.startsWith('sk_test') ||
              testPublishableKey.startsWith('pk_live') || livePublishableKey.startsWith('pk_test')) && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-300">
                  <strong>Warning:</strong> You may have entered keys in the wrong fields. Test keys should start with <code className="bg-slate-800 px-2 py-0.5 rounded">sk_test_</code> or <code className="bg-slate-800 px-2 py-0.5 rounded">pk_test_</code>, and live keys should start with <code className="bg-slate-800 px-2 py-0.5 rounded">sk_live_</code> or <code className="bg-slate-800 px-2 py-0.5 rounded">pk_live_</code>.
                </p>
              </div>
            )}

            {(() => {
              const extractAccountId = (key: string) => {
                const match = key.match(/^(?:pk|sk)_(?:test|live)_51([A-Za-z0-9]+)/);
                return match ? match[1] : null;
              };
              const testPubAccount = extractAccountId(testPublishableKey);
              const testSecAccount = extractAccountId(testSecretKey);
              const livePubAccount = extractAccountId(livePublishableKey);
              const liveSecAccount = extractAccountId(liveSecretKey);
              const testMismatch = testPubAccount && testSecAccount && testPubAccount !== testSecAccount;
              const liveMismatch = livePubAccount && liveSecAccount && livePubAccount !== liveSecAccount;
              if (!testMismatch && !liveMismatch) return null;
              return (
                <div className="bg-red-900/30 border-2 border-red-600 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-300 mb-2">Critical: Mismatched Stripe Account Keys</p>
                  {testMismatch && (
                    <p className="text-sm text-red-200 mb-1">
                      Your <strong>test publishable key</strong> and <strong>test secret key</strong> are from different Stripe accounts. This will cause "No such payment_intent" errors. Both keys must come from the same Stripe account.
                    </p>
                  )}
                  {liveMismatch && (
                    <p className="text-sm text-red-200">
                      Your <strong>live publishable key</strong> and <strong>live secret key</strong> are from different Stripe accounts. This will cause payment failures. Both keys must come from the same Stripe account.
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>{saving ? 'Saving...' : 'Save API Keys'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Payment Settings</h3>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Enable Stripe Payments
                </label>
                <p className="text-xs text-slate-400">
                  Turn off for testing without payment processing
                </p>
              </div>
              <button
                onClick={() => setStripeEnabled(!stripeEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                  stripeEnabled ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                    stripeEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('stripe.deposit_amount')} (€)
              </label>
              <p className="text-xs text-slate-400 mb-3">
                The non-refundable deposit amount customers must pay when making a reservation. Minimum: €350
              </p>
              <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-xs">
                  <input
                    type="number"
                    min="350"
                    step="50"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Math.max(350, parseFloat(e.target.value)))}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!stripeEnabled}
                  />
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">About Deposits</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>Deposits are non-refundable and charged immediately when customers book</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>Minimum deposit amount is €350</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>Deposits help secure bookings and cover reservation costs</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>All payment data is securely handled by Stripe</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
