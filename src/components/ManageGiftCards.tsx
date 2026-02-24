import { useState, useEffect } from 'react';
import { Search, Loader2, Check, X, CreditCard, Calendar, DollarSign, User, Mail, Download, Edit2, Trash2 } from 'lucide-react';
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
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'redeemed':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'expired':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'cancelled':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-800';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-600';
    }
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const isValid = (card: GiftCard) => {
    return card.status === 'active' && card.current_balance > 0 && !isExpired(card.expiry_date);
  };

  const toggleValidity = async (card: GiftCard) => {
    try {
      setUpdatingValidity(card.id);

      const isCurrentlyValid = isValid(card);

      let updateData: any = {};

      if (isCurrentlyValid) {
        // Mark as cancelled (ungültig)
        updateData.status = 'cancelled';
      } else {
        // Mark as active (gültig) and restore balance to original amount
        updateData.status = 'active';
        updateData.current_balance = card.original_amount;
        updateData.is_redeemed = false;
        updateData.redeemed_at = null;
        updateData.redeemed_by = null;
      }

      const { error } = await supabase
        .from('gift_cards')
        .update(updateData)
        .eq('id', card.id);

      if (error) throw error;

      // Reload the cards
      await loadAllCards();

      // If this is the currently viewed card, update it
      if (giftCard?.id === card.id) {
        const updatedCard = { ...card, ...updateData };
        setGiftCard(updatedCard);
      }
    } catch (err) {
      console.error('Error updating validity:', err);
      alert('Fehler beim Aktualisieren der Gültigkeit. Bitte versuchen Sie es erneut.');
    } finally {
      setUpdatingValidity(null);
    }
  };

  const downloadPdf = async (giftCardId: string, code: string) => {
    try {
      setDownloadingPdf(giftCardId);

      const { data: giftCardData, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('id', giftCardId)
        .single();

      if (error || !giftCardData) {
        throw new Error('Gift card not found');
      }

      if (giftCardData.pdf_url) {
        const a = document.createElement('a');
        a.href = giftCardData.pdf_url;
        a.download = `gift-card-${code}.pdf`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const blob = await generateGiftCardPDF({
          ...giftCardData,
          showPurchaser: !!giftCardData.stripe_payment_intent_id
        });

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
      console.error('Error downloading PDF:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to download PDF. Please try again.';
      alert(errorMessage);
    } finally {
      setDownloadingPdf(null);
    }
  };

  const uploadPdfToHosting = async (giftCardId: string) => {
    try {
      setUploadingPdf(giftCardId);

      const { data: giftCardData, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('id', giftCardId)
        .single();

      if (error || !giftCardData) {
        throw new Error('Gift card not found');
      }

      const blob = await generateGiftCardPDF({
        ...giftCardData,
        showPurchaser: !!giftCardData.stripe_payment_intent_id
      });

      const formData = new FormData();
      formData.append('giftCardId', giftCardId);
      formData.append('pdf', blob, `gift-card-${giftCardData.code}.pdf`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-gift-card-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload PDF');
      }

      const result = await response.json();
      alert('PDF erfolgreich hochgeladen! URL: ' + result.pdf_url);

      await loadAllCards();
      if (giftCard?.id === giftCardId) {
        const { data: updated } = await supabase
          .from('gift_cards')
          .select('*')
          .eq('id', giftCardId)
          .single();
        if (updated) setGiftCard(updated);
      }
    } catch (err) {
      console.error('Error uploading PDF:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload PDF. Please try again.';
      alert(errorMessage);
    } finally {
      setUploadingPdf(null);
    }
  };

  const resendEmail = async (giftCardId: string) => {
    try {
      setSendingEmail(giftCardId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-gift-card-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ giftCardId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      alert('E-Mail erfolgreich gesendet!');
    } catch (err) {
      console.error('Error sending email:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send email. Please try again.';
      alert(errorMessage);
    } finally {
      setSendingEmail(null);
    }
  };

  const deleteGiftCard = async (card: GiftCard) => {
    if (!confirm(`Möchten Sie den Gutschein "${card.code}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      setDeletingCard(card.id);

      const { error } = await supabase
        .from('gift_cards')
        .delete()
        .eq('id', card.id);

      if (error) throw error;

      // Reload the cards
      await loadAllCards();

      // If this is the currently viewed card, clear it
      if (giftCard?.id === card.id) {
        setGiftCard(null);
      }

      alert('Gutschein erfolgreich gelöscht');
    } catch (err) {
      console.error('Error deleting gift card:', err);
      alert('Fehler beim Löschen des Gutscheins. Bitte versuchen Sie es erneut.');
    } finally {
      setDeletingCard(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Gutschein nach Barcode suchen</h2>
          <p className="text-slate-600 dark:text-slate-400">Geben Sie die Barcodenummer ein, um Gutscheindetails und Gültigkeit zu prüfen</p>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchBarcode}
              onChange={(e) => setSearchBarcode(e.target.value)}
              placeholder="Barcodenummer eingeben"
              className="flex-1 px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-green-500 focus:outline-none transition"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              <span>Suchen</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {giftCard && (
          <div className={`border-2 rounded-xl p-6 ${
            isValid(giftCard)
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {isValid(giftCard) ? (
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                )}
                <div>
                  <h3 className={`text-xl font-bold ${
                    isValid(giftCard) ? 'text-green-900 dark:text-green-400' : 'text-red-900 dark:text-red-400'
                  }`}>
                    {isValid(giftCard) ? 'Gültiger Gutschein' : 'Ungültiger Gutschein'}
                  </h3>
                  <p className={`text-sm ${
                    isValid(giftCard) ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'
                  }`}>
                    {isValid(giftCard) ? 'Dieser Gutschein kann verwendet werden' : 'Dieser Gutschein kann nicht verwendet werden'}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(giftCard.status)}`}>
                {giftCard.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Gutschein-Code</span>
                </div>
                <p className="font-mono font-bold text-slate-900 dark:text-white">{giftCard.code}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Ursprünglicher Betrag</span>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">€{Number(giftCard.original_amount).toFixed(2)}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Aktuelles Guthaben</span>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">€{Number(giftCard.current_balance).toFixed(2)}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Empfänger</span>
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">{giftCard.recipient_name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{giftCard.recipient_email}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Käufer</span>
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">{giftCard.purchaser_name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{giftCard.purchaser_email}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Kaufdatum</span>
                </div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {new Date(giftCard.purchase_date).toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Ablaufdatum</span>
                </div>
                <p className={`font-semibold ${
                  isExpired(giftCard.expiry_date)
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {new Date(giftCard.expiry_date).toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  {isExpired(giftCard.expiry_date) && ' (Abgelaufen)'}
                </p>
              </div>
            </div>

            {giftCard.message && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Nachricht</p>
                <p className="text-slate-900 dark:text-white">{giftCard.message}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => downloadPdf(giftCard.id, giftCard.code)}
                disabled={downloadingPdf === giftCard.id}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {downloadingPdf === giftCard.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>PDF wird erstellt...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Gutschein-PDF herunterladen</span>
                  </>
                )}
              </button>

              <button
                onClick={() => uploadPdfToHosting(giftCard.id)}
                disabled={uploadingPdf === giftCard.id}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {uploadingPdf === giftCard.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>PDF wird hochgeladen...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>PDF zu Hosting hochladen</span>
                  </>
                )}
              </button>

              <button
                onClick={() => resendEmail(giftCard.id)}
                disabled={sendingEmail === giftCard.id}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {sendingEmail === giftCard.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>E-Mail wird gesendet...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    <span>E-Mail erneut senden</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Aktuelle Gutscheine</h2>
          <p className="text-slate-600 dark:text-slate-400">Die letzten 10 erstellten Gutscheine</p>
        </div>

        {loadingAll ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          </div>
        ) : allCards.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Keine Gutscheine gefunden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white">Code</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white">Empfänger</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white">Guthaben</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white">Gültig</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {allCards.map((card) => (
                  <tr key={card.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                    <td className="py-3 px-4">
                      <p className="font-mono text-sm text-slate-900 dark:text-white">{card.code}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{card.recipient_name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{card.recipient_email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">€{Number(card.current_balance).toFixed(2)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleValidity(card)}
                        disabled={updatingValidity === card.id}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border-2 transition font-medium text-sm ${
                          isValid(card)
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {updatingValidity === card.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isValid(card) ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Gültig</span>
                            <Edit2 className="w-3 h-3 opacity-50" />
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            <span>Ungültig</span>
                            <Edit2 className="w-3 h-3 opacity-50" />
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => downloadPdf(card.id, card.code)}
                          disabled={downloadingPdf === card.id}
                          className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Download PDF"
                        >
                          {downloadingPdf === card.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => uploadPdfToHosting(card.id)}
                          disabled={uploadingPdf === card.id}
                          className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="PDF zu Hosting hochladen"
                        >
                          {uploadingPdf === card.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => resendEmail(card.id)}
                          disabled={sendingEmail === card.id}
                          className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="E-Mail erneut senden"
                        >
                          {sendingEmail === card.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteGiftCard(card)}
                          disabled={deletingCard === card.id}
                          className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Gutschein löschen"
                        >
                          {deletingCard === card.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
