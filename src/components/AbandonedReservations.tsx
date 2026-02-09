import { useState, useEffect } from 'react';
import { AlertCircle, TrendingDown, Clock, Users, Calendar, Mail, Phone, X, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AbandonedReservation {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  room_id: string | null;
  room_name: string | null;
  abandonment_stage: string;
  abandonment_reason: string | null;
  error_message: string | null;
  payment_intent_id: string | null;
  amount: number | null;
  created_at: string;
  updated_at: string;
  payment_link_sent_at: string | null;
  payment_link_sent: boolean | null;
  recovery_reservation_id: string | null;
}

interface Stats {
  total: number;
  formIncomplete: number;
  paymentInitiated: number;
  paymentFailed: number;
  cancelledBeforePayment: number;
}

const stageLabels: Record<string, string> = {
  form_incomplete: 'Formular nicht fertig',
  payment_initiated: 'Zahlung gestartet',
  payment_failed: 'Zahlung fehlgeschlagen',
  cancelled_before_payment: 'Vor Zahlung abgebrochen',
};

const stageColors: Record<string, string> = {
  form_incomplete: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  payment_initiated: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  payment_failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled_before_payment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export function AbandonedReservations() {
  const [reservations, setReservations] = useState<AbandonedReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    formIncomplete: 0,
    paymentInitiated: 0,
    paymentFailed: 0,
    cancelledBeforePayment: 0,
  });
  const [selectedReservation, setSelectedReservation] = useState<AbandonedReservation | null>(null);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    setSending(false);
    setSendSuccess(false);
    setSendError(null);
  }, [selectedReservation]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('abandoned_reservations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setReservations(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading abandoned reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: AbandonedReservation[]) => {
    const stats: Stats = {
      total: data.length,
      formIncomplete: data.filter(r => r.abandonment_stage === 'form_incomplete').length,
      paymentInitiated: data.filter(r => r.abandonment_stage === 'payment_initiated').length,
      paymentFailed: data.filter(r => r.abandonment_stage === 'payment_failed').length,
      cancelledBeforePayment: data.filter(r => r.abandonment_stage === 'cancelled_before_payment').length,
    };
    setStats(stats);
  };

  const filteredReservations = filterStage === 'all'
    ? reservations
    : reservations.filter(r => r.abandonment_stage === filterStage);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSendPaymentLink = async () => {
    if (!selectedReservation || !selectedReservation.customer_email) {
      setSendError('Keine gültige E-Mail-Adresse vorhanden');
      setTimeout(() => setSendError(null), 4000);
      return;
    }

    try {
      setSending(true);
      setSendSuccess(false);
      setSendError(null);

      const { data: { url: supabaseUrl } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-link`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: selectedReservation.customer_name,
          customer_email: selectedReservation.customer_email,
          customer_phone: selectedReservation.customer_phone || '',
          reservation_date: selectedReservation.reservation_date,
          reservation_time: selectedReservation.reservation_time,
          party_size: selectedReservation.party_size,
          room_id: selectedReservation.room_id,
          special_requests: '',
          payment_amount: selectedReservation.amount || (selectedReservation.party_size * 3500),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen des Zahlungslinks');
      }

      const result = await response.json();

      // Update abandoned reservation with payment link sent status
      if (result.reservation_id) {
        await supabase
          .from('abandoned_reservations')
          .update({
            payment_link_sent: true,
            payment_link_sent_at: new Date().toISOString(),
            recovery_reservation_id: result.reservation_id,
          })
          .eq('id', selectedReservation.id);
      }

      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
      }, 4000);

      await loadReservations();
    } catch (error: any) {
      console.error('Error sending payment link:', error);
      setSendError(error.message || 'Fehler beim Senden des Zahlungslinks');
      setTimeout(() => setSendError(null), 4000);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Abgebrochene Reservierungen
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Übersicht über nicht abgeschlossene Buchungsversuche
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Gesamt</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Formular</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.formIncomplete}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">Zahlung gestartet</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">{stats.paymentInitiated}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 dark:text-red-400">Fehlgeschlagen</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.paymentFailed}</p>
            </div>
            <X className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 dark:text-orange-400">Abgebrochen</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.cancelledBeforePayment}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStage('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filterStage === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Alle ({stats.total})
        </button>
        <button
          onClick={() => setFilterStage('form_incomplete')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filterStage === 'form_incomplete'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Formular ({stats.formIncomplete})
        </button>
        <button
          onClick={() => setFilterStage('payment_initiated')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filterStage === 'payment_initiated'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Gestartet ({stats.paymentInitiated})
        </button>
        <button
          onClick={() => setFilterStage('payment_failed')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filterStage === 'payment_failed'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Fehlgeschlagen ({stats.paymentFailed})
        </button>
        <button
          onClick={() => setFilterStage('cancelled_before_payment')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filterStage === 'cancelled_before_payment'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Abgebrochen ({stats.cancelledBeforePayment})
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Datum/Zeit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Kunde
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Reservierung
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Link gesendet
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Betrag
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    Keine abgebrochenen Reservierungen
                  </td>
                </tr>
              ) : (
                filteredReservations.map((reservation) => (
                  <tr
                    key={reservation.id}
                    onClick={() => setSelectedReservation(reservation)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white whitespace-nowrap">
                      {formatDateTime(reservation.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {reservation.customer_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {reservation.customer_email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-400">
                            {formatDate(reservation.reservation_date)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-400">
                            {reservation.party_size}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        stageColors[reservation.abandonment_stage] || stageColors.form_incomplete
                      }`}>
                        {stageLabels[reservation.abandonment_stage] || reservation.abandonment_stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {reservation.payment_link_sent ? (
                        <div className="flex items-center justify-center" title={reservation.payment_link_sent_at ? formatDateTime(reservation.payment_link_sent_at) : ''}>
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                      {reservation.amount ? `€${(reservation.amount / 100).toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReservation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Reservierungsdetails
              </h3>
              <button
                onClick={() => setSelectedReservation(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                  Kundeninformationen
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-900 dark:text-white">{selectedReservation.customer_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-900 dark:text-white">{selectedReservation.customer_email}</span>
                  </div>
                  {selectedReservation.customer_phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-900 dark:text-white">{selectedReservation.customer_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                  Reservierungsdetails
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Datum:</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {formatDate(selectedReservation.reservation_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Uhrzeit:</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {selectedReservation.reservation_time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Personen:</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {selectedReservation.party_size}
                    </span>
                  </div>
                  {selectedReservation.room_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Raum:</span>
                      <span className="text-slate-900 dark:text-white font-medium">
                        {selectedReservation.room_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                  Abbruchinformationen
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      stageColors[selectedReservation.abandonment_stage] || stageColors.form_incomplete
                    }`}>
                      {stageLabels[selectedReservation.abandonment_stage] || selectedReservation.abandonment_stage}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Zeitpunkt:</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {formatDateTime(selectedReservation.created_at)}
                    </span>
                  </div>
                  {selectedReservation.payment_link_sent && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Zahlungslink gesendet:</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-slate-900 dark:text-white font-medium">
                          {selectedReservation.payment_link_sent_at ? formatDateTime(selectedReservation.payment_link_sent_at) : 'Ja'}
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedReservation.abandonment_reason && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Grund:</span>
                      <span className="text-slate-900 dark:text-white font-medium">
                        {selectedReservation.abandonment_reason}
                      </span>
                    </div>
                  )}
                  {selectedReservation.error_message && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                        Fehlermeldung:
                      </p>
                      <p className="text-sm text-red-900 dark:text-red-300">
                        {selectedReservation.error_message}
                      </p>
                    </div>
                  )}
                  {selectedReservation.payment_intent_id && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Payment Intent:</span>
                      <span className="text-slate-900 dark:text-white font-mono text-xs">
                        {selectedReservation.payment_intent_id}
                      </span>
                    </div>
                  )}
                  {selectedReservation.amount && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Betrag:</span>
                      <span className="text-slate-900 dark:text-white font-bold">
                        €{(selectedReservation.amount / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                {selectedReservation.payment_link_sent && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Zahlungslink wurde bereits am {selectedReservation.payment_link_sent_at ? formatDateTime(selectedReservation.payment_link_sent_at) : 'unbekanntem Datum'} gesendet.
                    </p>
                  </div>
                )}
                <button
                  onClick={handleSendPaymentLink}
                  disabled={sending || !selectedReservation.customer_email || selectedReservation.payment_link_sent}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Senden...</span>
                    </>
                  ) : selectedReservation.payment_link_sent ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Bereits gesendet</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Zahlungslink schicken</span>
                    </>
                  )}
                </button>

                {sendSuccess && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        Zahlungslink erfolgreich gesendet!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                        Eine E-Mail wurde an {selectedReservation.customer_email} gesendet.
                      </p>
                    </div>
                  </div>
                )}

                {sendError && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        Fehler beim Senden
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        {sendError}
                      </p>
                    </div>
                  </div>
                )}

                {!selectedReservation.customer_email && (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                    Keine E-Mail-Adresse vorhanden
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
