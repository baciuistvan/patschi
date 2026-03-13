import { useState, useEffect } from 'react';
import { Search, Loader2, Check, X, CreditCard, Calendar, Euro, User, Mail, Download, Upload, Trash2, ChevronRight, RefreshCw, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateGiftCardPDF } from '../lib/pdfGenerator';

interface GiftCard {
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
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
  purchase_date: string;
  expiry_date: string;
  created_at: string;
  pdf_url?: string;
  stripe_payment_intent_id?: string;
}

const STATUS_CONFIG = {
  active: { label: 'Aktiv', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  redeemed: { label: 'Eingelöst', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  expired: { label: 'Abgelaufen', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' },
  cancelled: { label: 'Storniert', bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' },
};

export function ManageGiftCards() {
  const [searchBarcode, setSearchBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [giftCard, setGiftCard] = useState<GiftCard | null>(null);
  const [error, setError] = useState('');
  const [allCards, setAllCards] = useState<GiftCard[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [updatingValidity, setUpdatingValidity] = useState<string | null>(null);
  const [deletingCard, setDeletingCard] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);

  useEffect(() => {
    loadAllCards();
  }, []);

  const loadAllCards = async () => {
    try {
      setLoadingAll(true);
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllCards(data || []);
    } catch (err) {
      console.error('Error loading gift cards:', err);
    } finally {
      setLoadingAll(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setGiftCard(null);
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('barcode', searchBarcode.trim())
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setError('Gutschein mit diesem Barcode nicht gefunden');
      } else {
        setGiftCard(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (expiryDate: string) => new Date(expiryDate) < new Date();

  const isValid = (card: GiftCard) =>
    card.status === 'active' && card.current_balance > 0 && !isExpired(card.expiry_date);

  const toggleValidity = async (card: GiftCard) => {
    try {
      setUpdatingValidity(card.id);
      const isCurrentlyValid = isValid(card);
      const updateData: Record<string, unknown> = isCurrentlyValid
        ? { status: 'cancelled' }
        : { status: 'active', current_balance: card.original_amount, is_redeemed: false, redeemed_at: null, redeemed_by: null };

      const { error } = await supabase.from('gift_cards').update(updateData).eq('id', card.id);
      if (error) throw error;
      await loadAllCards();
      if (giftCard?.id === card.id) setGiftCard({ ...card, ...updateData } as GiftCard);
      if (selectedCard?.id === card.id) setSelectedCard({ ...card, ...updateData } as GiftCard);
    } catch (err) {
      console.error('Error updating validity:', err);
      alert('Fehler beim Aktualisieren der Gültigkeit.');
    } finally {
      setUpdatingValidity(null);
    }
  };

  const downloadPdf = async (giftCardId: string, code: string) => {
    try {
      setDownloadingPdf(giftCardId);
      const { data: giftCardData, error } = await supabase
        .from('gift_cards').select('*').eq('id', giftCardId).single();
      if (error || !giftCardData) throw new Error('Gift card not found');

      if (giftCardData.pdf_url) {
        const a = document.createElement('a');
        a.href = giftCardData.pdf_url;
        a.download = `gift-card-${code}.pdf`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const blob = await generateGiftCardPDF({ ...giftCardData, showPurchaser: !!giftCardData.stripe_payment_intent_id });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gift-card-${code}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'PDF-Download fehlgeschlagen.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const uploadPdfToHosting = async (giftCardId: string) => {
    try {
      setUploadingPdf(giftCardId);
      const { data: giftCardData, error } = await supabase
        .from('gift_cards').select('*').eq('id', giftCardId).single();
      if (error || !giftCardData) throw new Error('Gift card not found');

      const blob = await generateGiftCardPDF({ ...giftCardData, showPurchaser: !!giftCardData.stripe_payment_intent_id });
      const formData = new FormData();
      formData.append('giftCardId', giftCardId);
      formData.append('pdf', blob, `gift-card-${giftCardData.code}.pdf`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-gift-card-pdf`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` }, body: formData }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload fehlgeschlagen');
      }
      const result = await response.json();
      alert('PDF erfolgreich hochgeladen! URL: ' + result.pdf_url);
      await loadAllCards();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'PDF-Upload fehlgeschlagen.');
    } finally {
      setUploadingPdf(null);
    }
  };

  const resendEmail = async (giftCardId: string) => {
    try {
      setSendingEmail(giftCardId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gift-card-email`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ giftCardId }) }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'E-Mail senden fehlgeschlagen');
      }
      alert('E-Mail erfolgreich gesendet!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'E-Mail senden fehlgeschlagen.');
    } finally {
      setSendingEmail(null);
    }
  };

  const deleteGiftCard = async (card: GiftCard) => {
    if (!confirm(`Gutschein "${card.code}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    try {
      setDeletingCard(card.id);
      const { error } = await supabase.from('gift_cards').delete().eq('id', card.id);
      if (error) throw error;
      await loadAllCards();
      if (giftCard?.id === card.id) setGiftCard(null);
      if (selectedCard?.id === card.id) setSelectedCard(null);
    } catch (err) {
      alert('Fehler beim Löschen des Gutscheins.');
    } finally {
      setDeletingCard(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatCurrency = (amount: number) => `€${Number(amount).toFixed(2)}`;

  const activeCard = selectedCard || giftCard;

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Gutschein suchen</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Barcodenummer eingeben um Details zu prüfen</p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchBarcode}
                onChange={(e) => setSearchBarcode(e.target.value)}
                placeholder="Barcodenummer eingeben..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Suchen
            </button>
          </form>

          {error && (
            <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {giftCard && (
            <div className={`mt-5 rounded-xl border-2 p-5 transition-all ${
              isValid(giftCard)
                ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isValid(giftCard) ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {isValid(giftCard)
                      ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      : <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                    }
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${isValid(giftCard) ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                      {isValid(giftCard) ? 'Gültiger Gutschein' : 'Ungültiger Gutschein'}
                    </p>
                    <p className={`text-xs ${isValid(giftCard) ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                      {isValid(giftCard) ? 'Kann verwendet werden' : 'Kann nicht verwendet werden'}
                    </p>
                  </div>
                </div>
                {(() => {
                  const cfg = STATUS_CONFIG[giftCard.status] || STATUS_CONFIG.cancelled;
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Code', value: <span className="font-mono text-xs">{giftCard.code}</span> },
                  { label: 'Betrag', value: <span className="font-semibold">{formatCurrency(giftCard.original_amount)}</span> },
                  { label: 'Empfänger', value: <><p className="font-medium text-xs">{giftCard.recipient_name}</p><p className="text-slate-500 dark:text-slate-400 text-xs truncate">{giftCard.recipient_email}</p></> },
                  { label: 'Käufer', value: <><p className="font-medium text-xs">{giftCard.purchaser_name}</p><p className="text-slate-500 dark:text-slate-400 text-xs truncate">{giftCard.purchaser_email}</p></> },
                  { label: 'Kaufdatum', value: <span className="text-xs">{formatDate(giftCard.purchase_date)}</span> },
                  { label: 'Ablaufdatum', value: <span className={`text-xs font-medium ${isExpired(giftCard.expiry_date) ? 'text-red-600 dark:text-red-400' : ''}`}>{formatDate(giftCard.expiry_date)}{isExpired(giftCard.expiry_date) && ' (abgelaufen)'}</span> },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                    <div className="text-slate-900 dark:text-white">{value}</div>
                  </div>
                ))}
              </div>

              {giftCard.message && (
                <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/50 mb-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Nachricht</p>
                  <p className="text-sm text-slate-900 dark:text-white">{giftCard.message}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => downloadPdf(giftCard.id, giftCard.code)}
                  disabled={downloadingPdf === giftCard.id}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {downloadingPdf === giftCard.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  PDF herunterladen
                </button>
                <button
                  onClick={() => resendEmail(giftCard.id)}
                  disabled={sendingEmail === giftCard.id}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {sendingEmail === giftCard.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  E-Mail senden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All Cards Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Alle Gutscheine</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {loadingAll ? 'Wird geladen...' : `${allCards.length} Gutschein${allCards.length !== 1 ? 'e' : ''} gesamt`}
            </p>
          </div>
          <button
            onClick={loadAllCards}
            disabled={loadingAll}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAll ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>

        {loadingAll ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : allCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
              <CreditCard className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Keine Gutscheine gefunden</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Erstellen Sie Ihren ersten Gutschein</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Code</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Empfänger</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Betrag</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gültig</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Erstellt</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allCards.map((card) => {
                    const cfg = STATUS_CONFIG[card.status] || STATUS_CONFIG.cancelled;
                    const valid = isValid(card);
                    return (
                      <tr
                        key={card.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        <td className="py-3.5 px-6">
                          <span className="font-mono text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{card.code}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">{card.recipient_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{card.recipient_email}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(card.original_amount)}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => toggleValidity(card)}
                            disabled={updatingValidity === card.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
                              valid
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                            title={valid ? 'Klicken um zu deaktivieren' : 'Klicken um zu aktivieren'}
                          >
                            {updatingValidity === card.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : valid ? (
                              <ToggleRight className="w-3.5 h-3.5" />
                            ) : (
                              <ToggleLeft className="w-3.5 h-3.5" />
                            )}
                            {valid ? 'Gültig' : 'Ungültig'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(card.created_at)}</span>
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center justify-end gap-1">
                            <ActionButton
                              onClick={() => downloadPdf(card.id, card.code)}
                              disabled={downloadingPdf === card.id}
                              loading={downloadingPdf === card.id}
                              title="PDF herunterladen"
                              color="blue"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </ActionButton>
                            <ActionButton
                              onClick={() => uploadPdfToHosting(card.id)}
                              disabled={uploadingPdf === card.id}
                              loading={uploadingPdf === card.id}
                              title="PDF hochladen"
                              color="emerald"
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </ActionButton>
                            <ActionButton
                              onClick={() => resendEmail(card.id)}
                              disabled={sendingEmail === card.id}
                              loading={sendingEmail === card.id}
                              title="E-Mail senden"
                              color="slate"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </ActionButton>
                            <ActionButton
                              onClick={() => deleteGiftCard(card)}
                              disabled={deletingCard === card.id}
                              loading={deletingCard === card.id}
                              title="Löschen"
                              color="red"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {allCards.map((card) => {
                const cfg = STATUS_CONFIG[card.status] || STATUS_CONFIG.cancelled;
                const valid = isValid(card);
                return (
                  <div key={card.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 rounded-lg">{card.code}</span>
                        <p className="text-sm font-medium text-slate-900 dark:text-white mt-2">{card.recipient_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{card.recipient_email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white">{formatCurrency(card.original_amount)}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleValidity(card)}
                        disabled={updatingValidity === card.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border disabled:opacity-50 ${
                          valid
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {updatingValidity === card.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : valid ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {valid ? 'Gültig' : 'Ungültig'}
                      </button>
                      <div className="flex items-center gap-1">
                        <ActionButton onClick={() => downloadPdf(card.id, card.code)} disabled={downloadingPdf === card.id} loading={downloadingPdf === card.id} title="PDF" color="blue">
                          <Download className="w-3.5 h-3.5" />
                        </ActionButton>
                        <ActionButton onClick={() => resendEmail(card.id)} disabled={sendingEmail === card.id} loading={sendingEmail === card.id} title="E-Mail" color="slate">
                          <Mail className="w-3.5 h-3.5" />
                        </ActionButton>
                        <ActionButton onClick={() => deleteGiftCard(card)} disabled={deletingCard === card.id} loading={deletingCard === card.id} title="Löschen" color="red">
                          <Trash2 className="w-3.5 h-3.5" />
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const COLOR_MAP: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
  emerald: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  slate: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
  red: 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
};

function ActionButton({
  children,
  onClick,
  disabled,
  loading,
  title,
  color,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  title: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${COLOR_MAP[color] || COLOR_MAP.slate}`}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : children}
    </button>
  );
}
