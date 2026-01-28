import React, { useState } from 'react';
import { X, Gift, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface GiftCardValidatorProps {
  onClose: () => void;
}

interface GiftCardInfo {
  code: string;
  balance: number;
  originalAmount: number;
  status: string;
  expiryDate: string;
  isExpired: boolean;
  recipientName: string;
}

export function GiftCardValidator({ onClose }: GiftCardValidatorProps) {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [giftCard, setGiftCard] = useState<GiftCardInfo | null>(null);
  const [error, setError] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const handleVerify = async () => {
    if (!barcode.trim()) {
      setError('Bitte geben Sie einen Barcode oder Code ein');
      return;
    }

    setLoading(true);
    setError('');
    setGiftCard(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-gift-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ barcode: barcode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gutschein konnte nicht überprüft werden');
      }

      if (data.valid) {
        setGiftCard(data.giftCard);
      } else {
        setError(data.error || 'Gutschein ist nicht gültig');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gutschein konnte nicht überprüft werden');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!giftCard) return;

    const amount = giftCard.balance;

    setRedeeming(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/redeem-gift-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          code: giftCard.code,
          amount: amount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gutschein konnte nicht eingelöst werden');
      }

      setGiftCard({ ...giftCard, balance: 0 });

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gutschein konnte nicht eingelöst werden');
    } finally {
      setRedeeming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleVerify();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-lg shadow-xl max-w-md md:max-w-2xl lg:max-w-3xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-3">
            <Gift className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Gutschein-Prüfung</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6 md:w-7 md:h-7" />
          </button>
        </div>

        {!giftCard ? (
          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-sm md:text-base font-medium text-gray-700 mb-2 md:mb-3">
                Barcode / Gutschein-Code
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Code eingeben oder Barcode scannen"
                className="w-full px-4 md:px-6 py-3 md:py-4 text-base md:text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm md:text-base text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || !barcode.trim()}
              className="w-full bg-blue-600 text-white py-3 md:py-4 text-base md:text-lg rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Überprüfe...' : 'Gutschein prüfen'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600 flex-shrink-0" />
              <p className="text-sm md:text-base text-green-700 font-medium">Gültiger Gutschein</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 md:p-6 space-y-4 md:space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wide mb-1">Code</p>
                  <p className="text-sm md:text-base font-mono font-medium text-gray-900">{giftCard.code}</p>
                </div>

                <div>
                  <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wide mb-1">Empfänger</p>
                  <p className="text-sm md:text-base font-medium text-gray-900">{giftCard.recipientName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 pt-2 border-t border-gray-200">
                <div>
                  <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wide mb-1">Aktuelles Guthaben</p>
                  <p className="text-xl md:text-2xl font-bold text-green-600">€{giftCard.balance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wide mb-1">Original-Betrag</p>
                  <p className="text-base md:text-lg font-medium text-gray-700">€{giftCard.originalAmount.toFixed(2)}</p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wide mb-1">Gültig bis</p>
                  <p className="text-sm md:text-base font-medium text-gray-900">
                    {new Date(giftCard.expiryDate).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>

              {giftCard.isExpired && (
                <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-orange-50 border border-orange-200 rounded">
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs md:text-sm text-orange-700">Dieser Gutschein ist abgelaufen</p>
                </div>
              )}
            </div>

            {!giftCard.isExpired && giftCard.balance > 0 && (
              <div className="space-y-3 md:space-y-4">
                {error && (
                  <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg">
                    <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm md:text-base text-red-700">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="w-full bg-green-600 text-white py-3 md:py-4 text-base md:text-lg rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {redeeming ? 'Wird eingelöst...' : `Gutschein einlösen (€${giftCard.balance.toFixed(2)})`}
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setGiftCard(null);
                setBarcode('');
                setError('');
              }}
              className="w-full border border-gray-300 text-gray-700 py-3 md:py-4 text-base md:text-lg rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Anderen Gutschein prüfen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
