import { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export function GiftCardStripeSettings() {
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');
  const [switching, setSwitching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switchSuccess, setSwitchSuccess] = useState(false);

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

  const setMode = async (targetMode: 'test' | 'live') => {
    if (targetMode === stripeMode || switching) return;
    setSwitching(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-stripe-mode`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: targetMode }),
      });
      if (response.ok) {
        const data = await response.json();
        setStripeMode(data.mode);
        setSwitchSuccess(true);
        setTimeout(() => setSwitchSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to set Stripe mode:', error);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 space-x-2 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Lade Stripe-Konfiguration...</span>
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

      {stripeMode === 'live' && (
        <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-600 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Live-Modus aktiv</h3>
              <p className="text-green-700 dark:text-green-200/80 text-xs mt-0.5">
                Stripe läuft im Live-Modus. Echte Zahlungen werden verarbeitet.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Modus auswählen</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('test')}
            disabled={switching || stripeMode === 'test'}
            className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              stripeMode === 'test'
                ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-400 dark:border-amber-500 cursor-default'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 cursor-pointer'
            } disabled:opacity-60`}
          >
            {stripeMode === 'test' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500" />
            )}
            <CreditCard className={`w-6 h-6 mb-2 ${stripeMode === 'test' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span className={`text-sm font-semibold ${stripeMode === 'test' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-400'}`}>
              Testmodus
            </span>
            <span className={`text-xs mt-1 ${stripeMode === 'test' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
              Keine echten Zahlungen
            </span>
          </button>

          <button
            onClick={() => setMode('live')}
            disabled={switching || stripeMode === 'live'}
            className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              stripeMode === 'live'
                ? 'bg-green-50 dark:bg-green-500/10 border-green-500 dark:border-green-500 cursor-default'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50/50 dark:hover:bg-green-900/10 cursor-pointer'
            } disabled:opacity-60`}
          >
            {stripeMode === 'live' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500" />
            )}
            <CreditCard className={`w-6 h-6 mb-2 ${stripeMode === 'live' ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span className={`text-sm font-semibold ${stripeMode === 'live' ? 'text-green-700 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'}`}>
              Live-Modus
            </span>
            <span className={`text-xs mt-1 ${stripeMode === 'live' ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
              Echte Zahlungen
            </span>
          </button>
        </div>

        {switching && (
          <div className="flex items-center justify-center space-x-2 mt-4 text-slate-500 dark:text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Wird umgeschaltet...</span>
          </div>
        )}

        {switchSuccess && !switching && (
          <div className="flex items-center justify-center space-x-2 mt-4 text-green-600 dark:text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Modus erfolgreich gespeichert</span>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
          Aktueller Modus: <span className={`font-semibold ${stripeMode === 'test' ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
            {stripeMode === 'test' ? 'Test' : 'Live'}
          </span>. Der Modus gilt systemweit für alle Stripe-Zahlungen.
        </p>
      </div>
    </div>
  );
}
