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
    } finally {
      setDownloadingPdf(false);
    }
  };

  const finalAmount = isCustomAmount && formData.customAmount ? parseFloat(formData.customAmount) : formData.amount;

  if (success) {
    return (
      <div className="max-w-md mx-auto py-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Gutschein ausgestellt</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">Erfolgreich erstellt und gespeichert</p>
        </div>

        <div className="mb-10">
          <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-amber-500 dark:text-amber-400 text-center mb-4">Code</p>
          <div className="border-t border-b border-amber-200 dark:border-amber-800/50 py-5 text-center bg-amber-50/50 dark:bg-amber-900/10 rounded-sm">
            <p className="text-3xl font-mono font-bold text-amber-700 dark:text-amber-300 tracking-[0.2em]">{createdCode}</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={downloadPdf}
            disabled={downloadingPdf}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {downloadingPdf ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Wird erstellt…</span></>
            ) : (
              <><Download className="w-4 h-4" /><span>PDF herunterladen</span></>
            )}
          </button>
          <button
            onClick={() => { setSuccess(false); setCreatedCode(''); setCreatedGiftCardId(''); }}
            className="w-full h-12 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors duration-150"
          >
            Weiteren Gutschein erstellen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-2">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Gutschein erstellen</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manuell einen Gutschein ausstellen</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-8">

          {/* Amount */}
          <div>
            <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-slate-400 dark:text-slate-500 mb-4">Betrag</p>
            <div className="flex gap-2 mb-4">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleAmountSelect(amount)}
                  className={`flex-1 h-11 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    !isCustomAmount && formData.amount === amount
                      ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                      : 'bg-transparent border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-600 dark:hover:text-amber-400'
                  }`}
                >
                  €{amount}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="number"
                min={MIN_AMOUNT}
                step="1"
                value={formData.customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder={`Individuell (mind. €${MIN_AMOUNT})`}
                className={`w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none pb-2 border-b transition-colors duration-150 ${
                  isCustomAmount
                    ? 'border-amber-500 dark:border-amber-400'
                    : 'border-slate-200 dark:border-slate-700 focus:border-amber-400 dark:focus:border-amber-500'
                }`}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Recipient */}
          <div>
            <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-slate-400 dark:text-slate-500 mb-4">
              Empfänger <span className="font-normal normal-case tracking-normal text-slate-300 dark:text-slate-600">— Optional</span>
            </p>
            <div className="space-y-5">
              <div className="relative">
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  placeholder="Name"
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none pb-2 border-b border-slate-200 dark:border-slate-700 focus:border-sky-400 dark:focus:border-sky-500 transition-colors duration-150"
                />
              </div>
              <div className="relative">
                <input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                  placeholder="E-Mail"
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none pb-2 border-b border-slate-200 dark:border-slate-700 focus:border-sky-400 dark:focus:border-sky-500 transition-colors duration-150"
                />
              </div>
              <div className="relative">
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  maxLength={500}
                  placeholder="Persönliche Nachricht…"
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none pb-2 border-b border-slate-200 dark:border-slate-700 focus:border-sky-400 dark:focus:border-sky-500 transition-colors duration-150 resize-none"
                />
                <span className="absolute bottom-3 right-0 text-[11px] text-slate-300 dark:text-slate-600">{formData.message.length}/500</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Total */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Gesamtbetrag</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Gültig für 1 Jahr</p>
            </div>
            <p className="text-4xl font-bold text-amber-500 dark:text-amber-400 tracking-tight tabular-nums">
              €{isNaN(finalAmount) ? '0' : finalAmount.toFixed(2)}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-emerald-600/20 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Wird erstellt…</span></>
            ) : (
              <><Gift className="w-4 h-4" /><span>Gutschein erstellen</span></>
            )}
          </button>

        </div>
      </form>
    </div>
  );
}
