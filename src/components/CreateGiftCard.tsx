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

      supabase.from('notifications').insert({
        type: 'gift_card_purchased',
        title: 'Gutschein erstellt',
        message: `${adminUser?.full_name || 'Admin'} erstellte einen Gutschein über €${finalAmount.toFixed(2)}${formData.recipientName ? ` für ${formData.recipientName}` : ''}`,
        related_id: giftCard.id,
      }).then(() => {});

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
      <div className="max-w-2xl mx-auto py-8 px-2">
        <div className="bg-white/70 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700/30 p-10 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 mb-6">
            <Check className="w-7 h-7 text-emerald-500 dark:text-emerald-400" strokeWidth={2} />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-1">Gutschein ausgestellt</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-10">Erfolgreich erstellt und gespeichert</p>

          <div className="bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-700/25 rounded-xl py-6 px-8 mb-8 w-full">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-amber-500/80 dark:text-amber-400/70 mb-3">Gutschein-Code</p>
            <p className="text-4xl font-mono font-bold text-amber-600/80 dark:text-amber-300/80 tracking-[0.25em]">{createdCode}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={downloadPdf}
              disabled={downloadingPdf}
              className="flex-1 h-11 bg-emerald-500/80 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-40 shadow-sm shadow-emerald-500/10"
            >
              {downloadingPdf ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Wird erstellt…</span></>
              ) : (
                <><Download className="w-4 h-4" /><span>PDF herunterladen</span></>
              )}
            </button>
            <button
              onClick={() => { setSuccess(false); setCreatedCode(''); setCreatedGiftCardId(''); }}
              className="flex-1 h-11 bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm font-medium rounded-xl transition-all duration-150 border border-slate-100 dark:border-slate-700/30"
            >
              Weiteren Gutschein erstellen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-2">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Gutschein erstellen</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manuell einen Gutschein ausstellen</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-5">

          <div className="bg-white/70 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700/30 p-5 sm:p-7 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-300 dark:text-slate-600 mb-4">Betrag</p>
            <div className="flex gap-2.5 mb-4">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleAmountSelect(amount)}
                  className={`flex-1 h-12 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    !isCustomAmount && formData.amount === amount
                      ? 'bg-amber-400/70 text-white shadow-sm shadow-amber-400/15'
                      : 'bg-slate-50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 hover:bg-amber-50/70 dark:hover:bg-amber-900/10 hover:text-amber-500 dark:hover:text-amber-400 border border-slate-100 dark:border-slate-700/30 hover:border-amber-100 dark:hover:border-amber-700/30'
                  }`}
                >
                  €{amount}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 text-sm pointer-events-none">€</span>
              <input
                type="number"
                min={MIN_AMOUNT}
                step="1"
                value={formData.customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder={`Individueller Betrag (mind. €${MIN_AMOUNT})`}
                className={`w-full pl-7 pr-4 py-3 rounded-xl text-sm transition-all duration-150 focus:outline-none ${
                  isCustomAmount
                    ? 'bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-600/30 text-slate-700 dark:text-slate-200'
                    : 'bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/30 text-slate-600 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 focus:bg-amber-50/60 dark:focus:bg-amber-900/10 focus:border-amber-200/60 dark:focus:border-amber-600/30'
                }`}
              />
            </div>

            <div className="mt-5 pt-5 border-t border-slate-50 dark:border-slate-700/20 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Gesamtbetrag</p>
                <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">Gültig für 1 Jahr</p>
              </div>
              <p className="text-5xl font-bold text-amber-400/80 dark:text-amber-400/70 tracking-tight tabular-nums">
                €{isNaN(finalAmount) ? '0' : finalAmount.toFixed(0)}
              </p>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-700/30 p-5 sm:p-7 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-300 dark:text-slate-600 mb-4">
              Empfänger <span className="font-normal normal-case tracking-normal text-slate-200 dark:text-slate-700 ml-1">— Optional</span>
            </p>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  placeholder="z.B. Maria Muster"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/30 text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 text-sm focus:outline-none focus:border-sky-200/60 dark:focus:border-sky-600/30 focus:bg-sky-50/40 dark:focus:bg-sky-900/10 transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">E-Mail</label>
                <input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                  placeholder="empfaenger@beispiel.de"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/30 text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 text-sm focus:outline-none focus:border-sky-200/60 dark:focus:border-sky-600/30 focus:bg-sky-50/40 dark:focus:bg-sky-900/10 transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Persönliche Nachricht</label>
                <div className="relative">
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                    maxLength={500}
                    placeholder="Eine persönliche Nachricht für den Empfänger…"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/30 text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 text-sm focus:outline-none focus:border-sky-200/60 dark:focus:border-sky-600/30 focus:bg-sky-50/40 dark:focus:bg-sky-900/10 transition-all duration-150 resize-none"
                  />
                  <span className="absolute bottom-2.5 right-3 text-xs text-slate-200 dark:text-slate-700">{formData.message.length}/500</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50/60 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20 text-red-500/80 dark:text-red-400/70 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-emerald-500/80 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-sm shadow-emerald-500/10 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
