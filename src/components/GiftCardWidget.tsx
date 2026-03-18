import { useState, useEffect } from 'react';
import { Gift, Check, Loader2, Search, Download, DollarSign, Calendar, User, X, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateGiftCardPDF } from '../lib/pdfGenerator';
import { uploadPdfToStorage } from '../lib/uploadHelpers';

const PRESET_AMOUNTS = [50, 100, 200];
const MIN_AMOUNT = 10;

interface FormData {
  amount: number;
  customAmount: string;
  recipientName: string;
  recipientEmail: string;
  buyerName: string;
  buyerEmail: string;
  message: string;
}

interface GiftCardDetails {
  id: string;
  code: string;
  barcode: string;
  original_amount: number;
  current_balance: number;
  recipient_name: string;
  recipient_email: string;
  purchaser_name: string;
  purchaser_email: string;
  message: string;
  status: string;
  purchase_date: string;
  expiry_date: string;
  pdf_url?: string;
  stripe_payment_intent_id?: string;
  redemptions?: Array<{
    id: string;
    amount: number;
    redeemed_at: string;
  }>;
}

export function GiftCardWidget() {
  const [formData, setFormData] = useState<FormData>({
    amount: 50,
    customAmount: '',
    recipientName: '',
    recipientEmail: '',
    buyerName: '',
    buyerEmail: '',
    message: ''
  });
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    balance?: number;
    expiryDate?: string;
    error?: string;
  } | null>(null);
  const [giftCardDetails, setGiftCardDetails] = useState<GiftCardDetails | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const handleSuccessfulPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');

      if (urlParams.get('success') === 'true' && sessionId) {
        setProcessingPayment(true);

        try {
          const successResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gift-card-success`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ sessionId }),
            }
          );

          const successResult = await successResponse.json();

          if (!successResponse.ok || !successResult.success) {
            console.error('Gift card processing failed:', successResult);
            setSuccess(true);
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }

          const giftCard = successResult.giftCard;

          if (!giftCard.pdf_url) {
            const pdfBlob = await generateGiftCardPDF({
              ...giftCard,
              showPurchaser: true
            });

            const pdfFormData = new FormData();
            pdfFormData.append('giftCardId', giftCard.id);
            pdfFormData.append('pdf', pdfBlob, `gift-card-${giftCard.code}.pdf`);

            const uploadResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-gift-card-pdf`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: pdfFormData,
              }
            );

            if (!uploadResponse.ok) {
              console.error('Failed to upload PDF:', await uploadResponse.json());
            }
          }

          setSuccess(true);
        } catch (error) {
          console.error('Error processing payment:', error);
          setSuccess(true);
        } finally {
          setProcessingPayment(false);
          window.history.replaceState({}, '', window.location.pathname);
        }
      } else if (urlParams.get('success') === 'true') {
        setSuccess(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    handleSuccessfulPayment();
  }, []);

  const handleAmountSelect = (amount: number) => {
    setIsCustomAmount(false);
    setFormData({ ...formData, amount, customAmount: '' });
  };

  const handleCustomAmountChange = (value: string) => {
    setIsCustomAmount(true);
    setFormData({ ...formData, customAmount: value });
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= MIN_AMOUNT) {
      setFormData({ ...formData, amount: numValue, customAmount: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const finalAmount = isCustomAmount ? parseFloat(formData.customAmount) : formData.amount;

      if (finalAmount < MIN_AMOUNT) {
        setError(`Mindestbetrag ist €${MIN_AMOUNT}`);
        setLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/purchase-gift-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          amount: finalAmount,
          recipientName: formData.recipientName,
          recipientEmail: formData.recipientEmail,
          buyerName: formData.buyerName,
          buyerEmail: formData.buyerEmail,
          message: formData.message
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Zahlung konnte nicht verarbeitet werden');
      }

      if (data.checkoutUrl) {
        if (window.top && window.top !== window) {
          window.top.location.href = data.checkoutUrl;
        } else {
          window.location.href = data.checkoutUrl;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      setLoading(false);
    }
  };

  const handleVerifyGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyResult(null);
    setGiftCardDetails(null);

    try {
      const { data: giftCard, error } = await supabase
        .from('gift_cards')
        .select(`
          *,
          redemptions:gift_card_redemptions(
            id,
            amount,
            redeemed_at
          )
        `)
        .eq('barcode', verifyCode.trim())
        .maybeSingle();

      if (error) throw error;

      if (!giftCard) {
        setVerifyResult({ valid: false, error: 'Gutschein mit diesem Barcode nicht gefunden' });
      } else {
        const isExpired = new Date(giftCard.expiry_date) < new Date();
        const isValid = giftCard.status === 'active' && giftCard.current_balance > 0 && !isExpired;

        setVerifyResult({
          valid: isValid,
          balance: giftCard.current_balance,
          expiryDate: giftCard.expiry_date,
          error: !isValid ? (isExpired ? 'Gutschein ist abgelaufen' : giftCard.status === 'cancelled' ? 'Gutschein wurde storniert' : 'Gutschein ist nicht mehr gültig') : undefined
        });
        setGiftCardDetails(giftCard);
      }
    } catch (err) {
      setVerifyResult({ valid: false, error: 'Ein Fehler ist aufgetreten' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!giftCardDetails) return;

    try {
      setDownloadingPdf(true);

      if (giftCardDetails.pdf_url) {
        const a = document.createElement('a');
        a.href = giftCardDetails.pdf_url;
        a.download = `gift-card-${giftCardDetails.code}.pdf`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const blob = await generateGiftCardPDF({
          ...giftCardDetails,
          showPurchaser: !!giftCardDetails.stripe_payment_intent_id
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gift-card-${giftCardDetails.code}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('PDF konnte nicht heruntergeladen werden. Bitte versuchen Sie es erneut.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const isValid = (card: GiftCardDetails) => {
    return card.status === 'active' && card.current_balance > 0 && !isExpired(card.expiry_date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'redeemed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (processingPayment) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 px-safe ios-scroll">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Gutschein wird erstellt...</h2>
          <p className="text-sm sm:text-base text-slate-600">
            Ihr Gutschein-PDF wird generiert und per E-Mail versendet.<br/>
            Bitte warten Sie einen Moment.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 px-safe ios-scroll">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Zahlung erfolgreich!</h2>
          <p className="text-sm sm:text-base text-slate-600 mb-6">
            Ihr Gutschein wurde erfolgreich gekauft.<br/>
            Sie erhalten in Kürze eine E-Mail mit dem Gutschein-PDF.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setFormData({
                amount: 50,
                customAmount: '',
                recipientName: '',
                recipientEmail: '',
                buyerName: '',
                buyerEmail: '',
                message: ''
              });
              setIsCustomAmount(false);
            }}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg active:bg-green-700 transition font-medium text-sm sm:text-base"
          >
            Weiteren Gutschein kaufen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 px-safe ios-scroll">
      <div className="flex flex-col sm:flex-row items-center justify-center mb-6 sm:mb-8 gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-2xl flex items-center justify-center">
          <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Gutschein kaufen</h2>
          <p className="text-sm sm:text-base text-slate-600">Schenken Sie Freude</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2 sm:mb-3">
            Betrag auswählen
          </label>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleAmountSelect(amount)}
                className={`py-3 sm:py-4 px-3 sm:px-6 rounded-xl border-2 font-semibold text-base sm:text-lg transition ${
                  !isCustomAmount && formData.amount === amount
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-slate-200 text-slate-700 active:border-green-300 active:bg-slate-50'
                }`}
              >
                €{amount}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Individueller Betrag (min. €{MIN_AMOUNT})
            </label>
            <input
              type="number"
              min={MIN_AMOUNT}
              step="0.01"
              value={formData.customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              placeholder={`€${MIN_AMOUNT}`}
              className={`w-full px-4 py-3 rounded-lg border-2 transition ${
                isCustomAmount
                  ? 'border-green-600 bg-green-50'
                  : 'border-slate-200 focus:border-green-500 focus:outline-none'
              }`}
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 sm:pt-6">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Empfänger-Informationen (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Name des Empfängers
              </label>
              <input
                type="text"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-green-500 focus:outline-none transition"
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                E-Mail des Empfängers
              </label>
              <input
                type="email"
                value={formData.recipientEmail}
                onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-green-500 focus:outline-none transition"
                placeholder="max@beispiel.de"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 sm:pt-6">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Ihre Informationen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ihr Name *
              </label>
              <input
                type="text"
                required
                value={formData.buyerName}
                onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-green-500 focus:outline-none transition"
                placeholder="Anna Schmidt"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ihre E-Mail *
              </label>
              <input
                type="email"
                required
                value={formData.buyerEmail}
                onChange={(e) => setFormData({ ...formData, buyerEmail: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-green-500 focus:outline-none transition"
                placeholder="anna@beispiel.de"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Persönliche Nachricht (Optional)
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-green-500 focus:outline-none transition resize-none"
            placeholder="Fügen Sie eine persönliche Nachricht für den Empfänger hinzu..."
          />
          <p className="text-xs text-slate-500 mt-1">{formData.message.length}/500 Zeichen</p>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <span className="text-sm sm:text-base text-slate-700 font-medium">Gesamtbetrag:</span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900">
              €{(isCustomAmount && formData.customAmount ? parseFloat(formData.customAmount) : formData.amount).toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Der Gutschein wird nach der Zahlung sofort per E-Mail zugestellt
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 sm:py-4 bg-green-600 text-white rounded-xl active:bg-green-700 transition font-semibold text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              <span>Wird verarbeitet...</span>
            </>
          ) : (
            <>
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Gutschein kaufen</span>
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-slate-500 text-center mt-4 sm:mt-6 px-2">
        Mit dem Kauf stimmen Sie unseren Geschäftsbedingungen zu. Gutscheine sind 1 Jahr ab Kaufdatum gültig.
      </p>

      <div className="mt-6 sm:mt-8 pt-6 border-t border-slate-200">
        <div className="text-center mb-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Gutschein prüfen</h3>
          <p className="text-xs text-slate-600">
            Geben Sie die Barcode-Nummer Ihres Gutscheins ein, um die Gültigkeit und den Restbetrag zu überprüfen
          </p>
        </div>

        <form onSubmit={handleVerifyGiftCard} className="max-w-md mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="Barcode-Nummer eingeben"
              className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-200 focus:border-green-500 focus:outline-none transition text-sm"
              required
            />
            <button
              type="submit"
              disabled={verifyLoading}
              className="px-4 py-2 bg-slate-700 active:bg-slate-800 text-white rounded-lg transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {verifyLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Prüfen</span>
            </button>
          </div>
        </form>

        {verifyResult && giftCardDetails && (
          <div className={`mt-4 border-2 rounded-xl p-4 sm:p-6 ${
            isValid(giftCardDetails)
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {isValid(giftCardDetails) ? (
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <X className="w-5 h-5 text-red-600" />
                  </div>
                )}
                <div>
                  <h3 className={`text-lg font-bold ${
                    isValid(giftCardDetails) ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {isValid(giftCardDetails) ? 'Gültiger Gutschein' : 'Ungültiger Gutschein'}
                  </h3>
                  <p className={`text-xs ${
                    isValid(giftCardDetails) ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {verifyResult.error || 'Dieser Gutschein kann verwendet werden'}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(giftCardDetails.status)}`}>
                {giftCardDetails.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                  <span className="text-xs text-slate-600">Gutschein-Code</span>
                </div>
                <p className="font-mono font-bold text-sm text-slate-900">{giftCardDetails.code}</p>
              </div>

              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <DollarSign className="w-4 h-4 text-slate-600" />
                  <span className="text-xs text-slate-600">Ursprünglicher Betrag</span>
                </div>
                <p className="text-lg font-bold text-slate-900">€{Number(giftCardDetails.original_amount).toFixed(2)}</p>
              </div>

              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <DollarSign className="w-4 h-4 text-slate-600" />
                  <span className="text-xs text-slate-600">Aktuelles Guthaben</span>
                </div>
                <p className="text-lg font-bold text-slate-900">€{Number(giftCardDetails.current_balance).toFixed(2)}</p>
              </div>

              <div className="bg-white rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <span className="text-xs text-slate-600">Ablaufdatum</span>
                </div>
                <p className={`text-sm font-semibold ${
                  isExpired(giftCardDetails.expiry_date)
                    ? 'text-red-600'
                    : 'text-slate-900'
                }`}>
                  {new Date(giftCardDetails.expiry_date).toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  {isExpired(giftCardDetails.expiry_date) && ' (Abgelaufen)'}
                </p>
              </div>
            </div>

            {giftCardDetails.recipient_name && (
              <div className="bg-white rounded-lg p-3 mb-3">
                <div className="flex items-center space-x-2 mb-1">
                  <User className="w-4 h-4 text-slate-600" />
                  <span className="text-xs text-slate-600">Empfänger</span>
                </div>
                <p className="font-semibold text-sm text-slate-900">{giftCardDetails.recipient_name}</p>
                {giftCardDetails.recipient_email && (
                  <p className="text-xs text-slate-600">{giftCardDetails.recipient_email}</p>
                )}
              </div>
            )}

            {giftCardDetails.message && (
              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="text-xs text-slate-600 mb-1">Nachricht</p>
                <p className="text-sm text-slate-900">{giftCardDetails.message}</p>
              </div>
            )}

            {giftCardDetails.redemptions && giftCardDetails.redemptions.length > 0 && (
              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="text-xs text-slate-600 mb-2 font-semibold">Einlösungen</p>
                <div className="space-y-2">
                  {giftCardDetails.redemptions.map((redemption) => (
                    <div key={redemption.id} className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">
                        {new Date(redemption.redeemed_at).toLocaleDateString('de-DE')}
                      </span>
                      <span className="font-semibold text-slate-900">
                        -€{Number(redemption.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={downloadPdf}
              disabled={downloadingPdf}
              className="w-full px-4 py-2.5 bg-blue-600 active:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>PDF wird erstellt...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Gutschein-PDF herunterladen</span>
                </>
              )}
            </button>
          </div>
        )}

        {verifyResult && !giftCardDetails && (
          <div className="mt-4 p-4 rounded-lg border-2 bg-red-50 border-red-200">
            <div className="text-center">
              <p className="text-sm font-medium text-red-800">
                {verifyResult.error || 'Ungültiger oder abgelaufener Gutschein'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
