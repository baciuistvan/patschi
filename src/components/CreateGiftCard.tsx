import { useState } from 'react';
import { Gift, Loader2, Check, Download, ArrowRight } from 'lucide-react';
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

      if (insertError) throw insertError;

      try {
        const pdfBlob = await generateGiftCardPDF({
          code,
          current_balance: finalAmount,
          recipient_name: formData.recipientName,
          purchaser_name: adminUser?.full_name || 'Admin',
          message: formData.message,
          expiry_date: expiryDate.toISOString(),
          showPurchaser: false,
        });

        const fileName = `gc-${giftCard.id}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('gift-card-pdfs')
          .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('gift-card-pdfs').getPublicUrl(fileName);
          await supabase.from('gift_cards').update({ pdf_url: publicUrl }).eq('id', giftCard.id);
        }
      } catch (pdfError) {
        console.error('PDF generation/upload failed:', pdfError);
      }

      setCreatedCode(code);
      setCreatedGiftCardId(giftCard.id);
      setSuccess(true);
      setFormData({ amount: 50, customAmount: '', recipientName: '', recipientEmail: '', message: '' });
      setIsCustomAmount(false);
    } catch (err) {
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
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
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
      alert('PDF konnte nicht heruntergeladen werden.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-10 text-center">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-100 dark:ring-emerald-800/50">
            <Check className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Gutschein erstellt</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-8">Erfolgreich ausgestellt und gespeichert</p>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-6 py-5 mb-8 border border-slate-100 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Gutschein-Code</p>
            <p className="text-2xl font-mono font-bold text-slate-900 dark:text-white tracking-wider">{createdCode}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={downloadPdf}
              disabled={downloadingPdf}
              className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-700 dark:hover:bg-slate-100 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {downloadingPdf ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>PDF wird erstellt...</span></>
              ) : (
                <><Download className="w-4 h-4" /><span>PDF herunterladen</span></>
              )}
            </button>
            <button
              onClick={() => { setSuccess(false); setCreatedCode(''); setCreatedGiftCardId(''); }}
              className="w-full py-3.5 bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-150"
            >
              Weiteren erstellen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const finalAmount = isCustomAmount && formData.customAmount ? parseFloat(formData.customAmount) : formData.amount;

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gutschein erstellen</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manuell einen Gutschein ausstellen</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Betrag</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleAmountSelect(amount)}
                className={`py-3 rounded-xl font-bold text-lg transition-all duration-150 border ${
                  !isCustomAmount && formData.amount === amount
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                    : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              >
                €{amount}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium">€</span>
            <input
              type="number"
              min={MIN_AMOUNT}
              step="1"
              value={formData.customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              placeholder={`Individuell (mind. €${MIN_AMOUNT})`}
              className={`w-full pl-8 pr-4 py-3 rounded-xl border text-sm transition-all duration-150 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none ${
                isCustomAmount
                  ? 'border-slate-900 dark:border-white'
                  : 'border-slate-200 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500'
              }`}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Empfänger <span className="font-normal normal-case text-slate-300 dark:text-slate-600">— Optional</span></p>
          <div className="space-y-3">
            <input
              type="text"
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              placeholder="Name"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-slate-400 dark:focus:border-slate-500 focus:outline-none transition-all duration-150"
            />
            <input
              type="email"
              value={formData.recipientEmail}
              onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
              placeholder="E-Mail"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-slate-400 dark:focus:border-slate-500 focus:outline-none transition-all duration-150"
            />
            <div className="relative">
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                maxLength={500}
                placeholder="Persönliche Nachricht..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-slate-400 dark:focus:border-slate-500 focus:outline-none transition-all duration-150 resize-none"
              />
              <span className="absolute bottom-3 right-4 text-xs text-slate-300 dark:text-slate-600">{formData.message.length}/500</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Gesamtbetrag</p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">Gültig für 1 Jahr</p>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            €{isNaN(finalAmount) ? '0.00' : finalAmount.toFixed(2)}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all duration-150 shadow-sm shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Wird erstellt...</span></>
          ) : (
            <><Gift className="w-4 h-4" /><span>Gutschein erstellen</span><ArrowRight className="w-4 h-4 ml-auto" /></>
          )}
        </button>
      </form>
    </div>
  );
}
