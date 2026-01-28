import { useState, useEffect } from 'react';
import { Check, Download, Loader2, Mail, Gift } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function GiftCardSuccess() {
  const [loading, setLoading] = useState(true);
  const [giftCard, setGiftCard] = useState<any>(null);
  const [error, setError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const giftCardId = urlParams.get('gift_card_id');
    const sessionId = urlParams.get('session_id');

    if (!giftCardId || !sessionId) {
      setError('Ungültige Anfrage. Bitte versuchen Sie es erneut.');
      setLoading(false);
      return;
    }

    fetchGiftCard(giftCardId);
  }, []);

  const fetchGiftCard = async (giftCardId: string) => {
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('id', giftCardId)
        .single();

      if (error) throw error;

      setGiftCard(data);
    } catch (err) {
      console.error('Error fetching gift card:', err);
      setError('Gutschein konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!giftCard) return;

    setDownloadingPdf(true);
    try {
      const { data: giftCardData, error } = await supabase
        .from('gift_cards')
        .select('pdf_url')
        .eq('id', giftCard.id)
        .single();

      if (error) {
        throw error;
      }

      if (giftCardData?.pdf_url) {
        const a = document.createElement('a');
        a.href = giftCardData.pdf_url;
        a.download = `Geschenkgutschein-${giftCard.code}.pdf`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-gift-card-pdf`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ giftCardId: giftCard.id }),
          }
        );

        if (!response.ok) {
          throw new Error('PDF konnte nicht generiert werden');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Geschenkgutschein-${giftCard.code}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('PDF konnte nicht heruntergeladen werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Gutschein wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !giftCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Fehler</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <a
              href="/gift-card-widget"
              className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              Zurück
            </a>
          </div>
        </div>
      </div>
    );
  }

  const expiryDate = new Date(giftCard.expiry_date).toLocaleDateString('de-DE');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Zahlung erfolgreich!
          </h1>
          <p className="text-slate-600">
            Ihr Geschenkgutschein wurde erfolgreich erstellt
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-8 text-white mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 mr-2" />
              <h2 className="text-2xl font-bold">Geschenkgutschein</h2>
            </div>

            <div className="text-5xl font-bold mb-4">
              €{parseFloat(giftCard.current_balance).toFixed(2)}
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
              <p className="text-sm opacity-90 mb-2">Gutschein-Code</p>
              <p className="text-2xl font-mono font-bold tracking-wider break-all">
                {giftCard.code}
              </p>
            </div>

            <div className="text-sm opacity-90">
              <p className="mb-2">
                <strong>Für:</strong> {giftCard.recipient_name}
              </p>
              <p className="mb-2">
                <strong>Von:</strong> {giftCard.purchaser_name}
              </p>
              <p>
                <strong>Gültig bis:</strong> {expiryDate}
              </p>
            </div>
          </div>
        </div>

        {giftCard.message && (
          <div className="bg-slate-50 rounded-xl p-6 mb-6 border-l-4 border-green-600">
            <p className="text-sm font-semibold text-slate-700 mb-2">
              Persönliche Nachricht:
            </p>
            <p className="text-slate-600 italic">{giftCard.message}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={downloadPdf}
            disabled={downloadingPdf}
            className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start space-x-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 mb-1">
                E-Mail wurde versendet
              </p>
              <p className="text-blue-700">
                {giftCard.recipient_email ? (
                  <>
                    Der Gutschein wurde an{' '}
                    <strong>{giftCard.recipient_email}</strong> gesendet. Die
                    E-Mail enthält den Gutschein-Code und das PDF.
                  </>
                ) : (
                  <>
                    Eine Bestätigung wurde an{' '}
                    <strong>{giftCard.purchaser_email}</strong> gesendet.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-900 font-medium mb-2">
              Wichtige Hinweise:
            </p>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>Bewahren Sie den Gutschein-Code sicher auf</li>
              <li>Der Code kann nur einmal verwendet werden</li>
              <li>
                Das Restguthaben bleibt für weitere Buchungen verfügbar
              </li>
              <li>Behandeln Sie den Code wie Bargeld</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 text-center space-y-3">
          <a
            href="/gift-card-widget"
            className="inline-block px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
          >
            Weiteren Gutschein kaufen
          </a>
          <p className="text-xs text-slate-500">
            Bei Fragen kontaktieren Sie uns gerne
          </p>
        </div>
      </div>
    </div>
  );
}
