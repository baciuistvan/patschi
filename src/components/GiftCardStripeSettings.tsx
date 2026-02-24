import { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

export function GiftCardStripeSettings() {
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggleSuccess, setToggleSuccess] = useState(false);

  useEffect(() => {
    loadStripeMode();
  }, []);

  const loadStripeMode = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-stripe-mode`, {
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
    } finally {
      setLoading(false);
    }
  };

  const toggleStripeMode = async () => {
    setToggling(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-stripe-mode`, {
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
        setToggleSuccess(true);
        setTimeout(() => setToggleSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to toggle Stripe mode:', error);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="text-slate-500 dark:text-slate-400 text-sm">Lade Stripe-Konfiguration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {stripeMode === 'test' && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-300 dark:border-amber-500 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Testmodus aktiv</h3>
              <p className="text-amber-700 dark:text-amber-200/80 text-xs mt-0.5">
                Stripe läuft im Testmodus. Es werden keine echten Zahlungen verarbeitet. Testkarte: 4242 4242 4242 4242
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-all ${
              stripeMode === 'test'
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-500'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-transparent'
            }`}>
              Testmodus
            </div>
            <div className="text-slate-400 dark:text-slate-500 font-medium">↔</div>
            <div className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-all ${
              stripeMode === 'live'
                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-400 dark:border-green-500'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-transparent'
            }`}>
              Live-Modus
            </div>
          </div>

          <button
            onClick={toggleStripeMode}
            disabled={toggling}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition disabled:opacity-50 flex items-center space-x-2 ${
              stripeMode === 'test'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {toggleSuccess ? (
              <><CheckCircle className="w-4 h-4" /><span>Umgeschaltet</span></>
            ) : toggling ? (
              <span>Wird umgeschaltet...</span>
            ) : (
              <><CreditCard className="w-4 h-4" /><span>Zu {stripeMode === 'test' ? 'Live' : 'Test'} wechseln</span></>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
          Aktueller Modus: <span className={`font-semibold ${stripeMode === 'test' ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
            {stripeMode === 'test' ? 'Test' : 'Live'}
          </span>. Der Modus gilt systemweit für alle Stripe-Zahlungen.
        </p>
      </div>
    </div>
  );
}
