import { useState } from 'react';
import { Gift, Loader2, Check, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateGiftCardPDF } from '../lib/pdfGenerator';

interface FormData {
  amount: number;
  customAmount: string;
  recipientName: string;
  recipientEmail: string;
  message: string;
}

const PRESET_AMOUNTS = [50, 100, 200];
const MIN_AMOUNT = 10;

export function CreateGiftCard() {
  const { adminUser } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    amount: 50,
    customAmount: '',
    recipientName: '',
    recipientEmail: '',
    message: ''
  });
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [createdGiftCardId, setCreatedGiftCardId] = useState<string>('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'GS-';
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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

      const code = generateCode();
      const now = new Date();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const { data: giftCard, error: insertError } = await supabase
        .from('gift_cards')
        .insert({
          code,
          original_amount: finalAmount,
          current_balance: finalAmount,
          recipient_name: formData.recipientName,
          recipient_email: formData.recipientEmail,
          purchaser_name: adminUser?.full_name || 'Admin',
          purchaser_email: adminUser?.email || '',
          message: formData.message,
          status: 'active',
          purchase_date: now.toISOString(),
          expiry_date: expiryDate.toISOString(),
          is_redeemed: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Gift card creation error:', insertError);
        throw insertError;
      }

      // Generate PDF client-side
      try {
        const pdfBlob = await generateGiftCardPDF({
          code,
          current_balance: finalAmount,
          recipient_name: formData.recipientName,
          purchaser_name: adminUser?.full_name || 'Admin',
          message: formData.message,
          expiry_date: expiryDate.toISOString(),
          showPurchaser: false, // Hide "FROM" field for admin-created gift cards
        });

        // Upload PDF to Supabase storage
        const fileName = `gc-${giftCard.id}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('gift-card-pdfs')
          .upload(fileName, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          console.error('PDF upload error:', uploadError);
          throw new Error('PDF konnte nicht hochgeladen werden');
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('gift-card-pdfs')
          .getPublicUrl(fileName);

        // Update gift card with PDF URL
        const { error: updateError } = await supabase
          .from('gift_cards')
          .update({ pdf_url: publicUrl })
          .eq('id', giftCard.id);

        if (updateError) {
          console.error('PDF URL update error:', updateError);
          throw new Error('PDF-URL konnte nicht gespeichert werden');
        }

        console.log('PDF generated and uploaded successfully:', publicUrl);
      } catch (pdfError) {
        console.error('PDF generation/upload failed:', pdfError);
        // Continue anyway - the gift card is created, PDF is optional
      }

      setCreatedCode(code);
      setCreatedGiftCardId(giftCard.id);
      setSuccess(true);
      setFormData({
        amount: 50,
        customAmount: '',
        recipientName: '',
        recipientEmail: '',
        message: ''
      });
      setIsCustomAmount(false);
    } catch (err) {
      console.error('Gift card creation failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!createdGiftCardId) return;

    setDownloadingPdf(true);
    try {
      const { data: giftCard } = await supabase
        .from('gift_cards')
        .select('pdf_url, current_balance, recipient_name, purchaser_name, message, expiry_date')
        .eq('id', createdGiftCardId)
        .maybeSingle();

      let blob: Blob;

      if (giftCard?.pdf_url) {
        const response = await fetch(giftCard.pdf_url);
        if (response.ok) {
          blob = await response.blob();
        } else {
          blob = await generateGiftCardPDF({
            code: createdCode,
            current_balance: giftCard.current_balance,
            recipient_name: giftCard.recipient_name || '',
            purchaser_name: giftCard.purchaser_name || '',
            message: giftCard.message || '',
            expiry_date: giftCard.expiry_date,
            showPurchaser: false,
          });
        }
      } else {
        const finalAmount = isCustomAmount ? parseFloat(formData.customAmount) : formData.amount;
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        blob = await generateGiftCardPDF({
          code: createdCode,
          current_balance: finalAmount,
          recipient_name: formData.recipientName || '',
          purchaser_name: adminUser?.full_name || 'Admin',
          message: formData.message || '',
          expiry_date: expiryDate.toISOString(),
          showPurchaser: false,
        });
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Geschenkgutschein-${createdCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('PDF konnte nicht heruntergeladen werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Gutschein erstellt!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Gutschein wurde erfolgreich erstellt
          </p>
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Gutschein-Code:</p>
            <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">{createdCode}</p>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={downloadPdf}
              disabled={downloadingPdf}
              className="w-full py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>PDF wird erstellt...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Gutschein als PDF herunterladen</span>
                </>
              )}
            </button>

            <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">PDF mit Logo und rotem Design</p>
              <p className="text-xs">Professioneller Gutschein mit Patschi-Logo und Hintergrundbild</p>
            </div>
          </div>

          <button
            onClick={() => {
              setSuccess(false);
              setCreatedCode('');
              setCreatedGiftCardId('');
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            Weiteren Gutschein erstellen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 md:p-8">
      <div className="flex items-center justify-center mb-8 gap-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
          <Gift className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Gutschein erstellen</h2>
          <p className="text-slate-600 dark:text-slate-400">Gutschein manuell ausstellen</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">
            Betrag auswählen
          </label>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleAmountSelect(amount)}
                className={`py-4 px-6 rounded-xl border-2 font-semibold text-lg transition ${
                  !isCustomAmount && formData.amount === amount
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-green-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                €{amount}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Individueller Betrag (mind. €{MIN_AMOUNT})
            </label>
            <input
              type="number"
              min={MIN_AMOUNT}
              step="1"
              value={formData.customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              placeholder={`€${MIN_AMOUNT}`}
              className={`w-full px-4 py-3 rounded-lg border-2 transition bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                isCustomAmount
                  ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                  : 'border-slate-200 dark:border-slate-600 focus:border-green-500 focus:outline-none'
              }`}
            />
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Empfänger-Informationen (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Name des Empfängers
              </label>
              <input
                type="text"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-green-500 focus:outline-none transition"
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                E-Mail des Empfängers
              </label>
              <input
                type="email"
                value={formData.recipientEmail}
                onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-green-500 focus:outline-none transition"
                placeholder="max@beispiel.de"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Nachricht (Optional)
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-green-500 focus:outline-none transition resize-none"
            placeholder="Fügen Sie eine persönliche Nachricht hinzu..."
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formData.message.length}/500 Zeichen</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-700 dark:text-slate-300 font-medium">Gesamtbetrag:</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              €{(isCustomAmount && formData.customAmount ? parseFloat(formData.customAmount) : formData.amount).toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Gutschein wird sofort erstellt und ist 1 Jahr gültig
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Wird erstellt...</span>
            </>
          ) : (
            <>
              <Gift className="w-5 h-5" />
              <span>Gutschein erstellen</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
