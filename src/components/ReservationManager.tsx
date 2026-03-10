import { useState, useEffect, useRef } from 'react';
import { supabase, Reservation, Table, Room } from '../lib/supabase';
import {
  Calendar, Clock, Users, Mail, Phone, CheckCircle, XCircle,
  Trash2, Plus, CreditCard as Edit2, Printer, RefreshCw, Search,
  Copy, Send, AlertCircle, List, LayoutGrid, ArrowRight,
  CalendarDays, CreditCard, ChevronDown, ChevronUp, X, StickyNote,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ReservationFloorPlanView } from './ReservationFloorPlanView';
import { useAuth } from '../contexts/AuthContext';

type ReservationWithTable = Reservation & {
  table?: Table;
  reservation_tables?: Array<{ table_id: string; tables: Table }>;
};

function StatusDot({ status }: { status: string }) {
  const cls =
    status === 'confirmed' ? 'bg-emerald-500' :
    status === 'cancelled' ? 'bg-red-500' :
    status === 'completed' ? 'bg-sky-500' :
    'bg-amber-400';
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />;
}

function ReservationCard({
  reservation,
  onSelect,
  onEdit,
  onDelete,
  onCopyLink,
  onResendEmail,
  onRegenerateLink,
  copyingLinkFor,
  resendingEmailFor,
  regeneratingLinkFor,
  isUpdating,
  t,
}: {
  reservation: ReservationWithTable;
  onSelect: (r: ReservationWithTable) => void;
  onEdit: (r: ReservationWithTable) => void;
  onDelete: (id: string) => void;
  onCopyLink: (url: string, id: string) => void;
  onResendEmail: (id: string) => void;
  onRegenerateLink: (id: string) => void;
  copyingLinkFor: string | null;
  resendingEmailFor: string | null;
  regeneratingLinkFor: string | null;
  isUpdating: boolean;
  t: (k: string) => string;
}) {
  const bm = (reservation as any).booking_method;
  const pm = (reservation as any).payment_method;
  const isOnline = bm === 'online' || bm === 'payment_link' || pm === 'stripe';
  const isPaid = reservation.payment_status === 'paid';
  const isUnpaidLink = (reservation as any).payment_link_url && !isPaid;

  const tableNumbers = reservation.reservation_tables && reservation.reservation_tables.length > 0
    ? reservation.reservation_tables.map((rt: any) => rt.tables?.table_number).filter(Boolean).join(', ')
    : (reservation as any).table?.table_number || null;

  const formattedDate = (() => {
    const d = new Date(reservation.reservation_date + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  })();

  const paymentText =
    bm === 'payment_link' && isPaid ? `€${reservation.payment_amount?.toFixed(2)} · Online`
    : bm === 'payment_link' && !isPaid && reservation.payment_amount > 0 ? `€${reservation.payment_amount?.toFixed(2)} · ausstehend`
    : pm === 'stripe' && isPaid ? `€${reservation.payment_amount?.toFixed(2)} · Online`
    : bm === 'manual' && reservation.payment_amount > 0 ? `€${reservation.payment_amount?.toFixed(2)} · Bar`
    : 'Kostenlos';

  const paymentTextCls =
    isOnline && isPaid ? 'text-sky-500 dark:text-sky-400'
    : isOnline && !isPaid ? 'text-amber-500 dark:text-amber-400'
    : bm === 'manual' && isPaid ? 'text-emerald-500 dark:text-emerald-400'
    : 'text-slate-400 dark:text-slate-500';

  return (
    <div className="group flex items-start gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all duration-150 print:bg-white print:border-gray-200 print:rounded-none print:break-inside-avoid">
      <div className="flex-shrink-0 mt-0.5">
        <StatusDot status={reservation.status} />
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(reservation)}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1.5">
          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{reservation.customer_name}</span>
          {(reservation as any).booking_code && (
            <span className="font-mono text-xs text-slate-400 dark:text-slate-500">#{(reservation as any).booking_code}</span>
          )}
          <span className={`text-xs font-medium ${paymentTextCls} ml-auto flex-shrink-0`}>{paymentText}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 flex-shrink-0" />
            {reservation.reservation_time}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 flex-shrink-0" />
            {reservation.party_size}
          </span>
          {tableNumbers && (
            <span className="text-sky-600 dark:text-sky-400 font-medium">T {tableNumbers}</span>
          )}
          <span className="flex items-center gap-1 print:hidden">
            <Mail className="w-3 h-3 flex-shrink-0" />
            {reservation.customer_email}
          </span>
          {reservation.customer_phone && (
            <span className="flex items-center gap-1 print:hidden">
              <Phone className="w-3 h-3 flex-shrink-0" />
              {reservation.customer_phone}
            </span>
          )}
        </div>

        {reservation.special_requests && (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 italic print:text-gray-700">
            <span className="not-italic text-slate-300 dark:text-slate-600 mr-1">"</span>{reservation.special_requests}<span className="not-italic text-slate-300 dark:text-slate-600 ml-0.5">"</span>
          </p>
        )}

        {isUnpaidLink && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 print:hidden">
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3 h-3" />Wartet auf Zahlung
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onCopyLink((reservation as any).payment_link_url, reservation.id); }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            >
              {copyingLinkFor === reservation.id ? <><CheckCircle className="w-3 h-3 text-emerald-500" />Kopiert</> : <><Copy className="w-3 h-3" />Link</>}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onResendEmail(reservation.id); }}
              disabled={resendingEmailFor === reservation.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition disabled:opacity-50"
            >
              {resendingEmailFor === reservation.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              E-Mail
            </button>
            {(reservation as any).payment_link_url?.includes('/test_') && (
              <button
                onClick={(e) => { e.stopPropagation(); onRegenerateLink(reservation.id); }}
                disabled={regeneratingLinkFor === reservation.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition disabled:opacity-50"
              >
                {regeneratingLinkFor === reservation.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Live-Link
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-1 print:hidden">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(reservation); }}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          title="Bearbeiten"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(reservation.id); }}
          disabled={isUpdating}
          className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
          title="Löschen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

export function ReservationManager() {
  const { t } = useLanguage();
  const { adminUser } = useAuth();

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [reservations, setReservations] = useState<ReservationWithTable[]>([]);
  const [allReservationsForConflicts, setAllReservationsForConflicts] = useState<ReservationWithTable[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'today' | 'date' | 'monthly' | 'payment_link'>('monthly');
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithTable | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [newReservation, setNewReservation] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    party_size: 2,
    reservation_date: '',
    reservation_time: '',
    room_id: '',
    special_requests: '',
    status: 'confirmed' as const,
    payment_status: 'unpaid' as const,
    payment_amount: 0,
  });
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservationWithTable | null>(null);
  const [allTables, setAllTables] = useState<Table[]>([]);
  const [multipleDays, setMultipleDays] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [paidWithCash, setPaidWithCash] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [dayAmounts, setDayAmounts] = useState<Record<string, number>>({});
  const [bookingMethod, setBookingMethod] = useState<'free' | 'manual'>('free');
  const [tableRoomFilter, setTableRoomFilter] = useState<string | null>(null);
  const [isCreatingWithPaymentLink, setIsCreatingWithPaymentLink] = useState(false);
  const [resendingEmailFor, setResendingEmailFor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [unpaidPaymentLinkCount, setUnpaidPaymentLinkCount] = useState(0);
  const [copyingLinkFor, setCopyingLinkFor] = useState<string | null>(null);
  const [regeneratingLinkFor, setRegeneratingLinkFor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'floor-plan'>('list');
  const [showPaymentAmountInput, setShowPaymentAmountInput] = useState(false);
  const [paymentAmountDraft, setPaymentAmountDraft] = useState(0);

  const createFormRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showCreateForm && createFormRef.current) createFormRef.current.scrollTop = 0;
  }, [showCreateForm]);

  useEffect(() => {
    if (showEditForm && editFormRef.current) editFormRef.current.scrollTop = 0;
  }, [showEditForm]);

  useEffect(() => {
    loadReservations();
    loadRooms();
    loadAllTables();
  }, [filter, selectedDate]);

  useEffect(() => {
    if (rooms.length > 0 && !tableRoomFilter) setTableRoomFilter(rooms[0].id);
  }, [rooms]);

  useEffect(() => {
    if (newReservation.room_id) loadTables(newReservation.room_id);
  }, [newReservation.room_id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker]);

  const loadRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').eq('is_active', true).order('name');
    if (data) setRooms(data);
  };

  const loadTables = async (roomId: string) => {
    const { data } = await supabase.from('tables').select('*').eq('room_id', roomId).eq('is_active', true).order('table_number');
    if (data) setTables(data);
  };

  const loadAllTables = async () => {
    const { data } = await supabase.from('tables').select('*').order('table_number');
    if (data) setAllTables(data);
  };

  const getReservedTablesForDateTime = (date: string, time: string, excludeReservationId?: string): Set<string> => {
    const reservedTableIds = new Set<string>();
    const inputStart = new Date(`${date}T${time}`);
    const inputEnd = new Date(inputStart.getTime() + 120 * 60000);

    allReservationsForConflicts.forEach(res => {
      if (excludeReservationId && res.id === excludeReservationId) return;
      if (res.status === 'cancelled') return;
      if (res.reservation_date !== date) return;

      const resStart = new Date(`${res.reservation_date}T${res.reservation_time}`);
      const resDuration = res.duration_minutes || 120;
      const resEnd = new Date(resStart.getTime() + resDuration * 60000);
      const hasOverlap = inputStart < resEnd && inputEnd > resStart;

      if (hasOverlap && res.reservation_tables && Array.isArray(res.reservation_tables)) {
        res.reservation_tables.forEach((rt: any) => reservedTableIds.add(rt.table_id));
      }
    });

    return reservedTableIds;
  };

  const loadReservations = async () => {
    let query = supabase
      .from('reservations')
      .select('*, reservation_tables(*, tables(*))')
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true });

    const today = formatDateLocal(new Date());
    if (filter === 'today') query = query.eq('reservation_date', today);
    else if (filter === 'upcoming') query = query.gte('reservation_date', today);
    else if (filter === 'date' && selectedDate) query = query.eq('reservation_date', selectedDate);
    else if (filter === 'payment_link') query = query.not('payment_link_url', 'is', null).neq('payment_status', 'paid');

    const { data, error } = await query;
    let formatted: any[] = [];
    if (!error && data) {
      formatted = data.map(r => ({ ...r, reservation_tables: r.reservation_tables as any }));
    }

    if (filter === 'payment_link') {
      const { data: abandonedData, error: abandonedError } = await supabase
        .from('abandoned_reservations')
        .select('*')
        .eq('payment_link_sent', true)
        .is('recovery_reservation_id', null)
        .order('reservation_date', { ascending: true });

      if (!abandonedError && abandonedData) {
        const abandonedFormatted = abandonedData.map(a => ({
          id: a.id, customer_name: a.customer_name, customer_email: a.customer_email,
          customer_phone: a.customer_phone, reservation_date: a.reservation_date,
          reservation_time: a.reservation_time, party_size: a.party_size, room_id: a.room_id,
          status: 'pending' as const, payment_status: 'unpaid', booking_method: 'payment_link',
          created_at: a.created_at, notes: 'Zahlungslink gesendet - wartet auf Zahlung',
          reservation_tables: [], is_abandoned: true,
        }));
        formatted = [...formatted, ...abandonedFormatted];
        formatted.sort((a, b) => {
          const dc = a.reservation_date.localeCompare(b.reservation_date);
          return dc !== 0 ? dc : a.reservation_time.localeCompare(b.reservation_time);
        });
      }
    }

    setReservations(formatted);

    const { data: allData } = await supabase
      .from('reservations')
      .select('*, reservation_tables(*, tables(*))')
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true });

    if (allData) {
      setAllReservationsForConflicts(allData.map(r => ({ ...r, reservation_tables: r.reservation_tables as any })));
    }

    const unpaidCount = formatted.filter(r => (r.payment_link_url && r.payment_status !== 'paid') || r.is_abandoned).length;
    setUnpaidPaymentLinkCount(unpaidCount);

    if (filter === 'monthly' && formatted.length > 0) {
      const monthKeys = new Set<string>();
      formatted.forEach(reservation => {
        const date = new Date(reservation.reservation_date);
        monthKeys.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      });
      setExpandedMonths(monthKeys);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setFilter('date');
    setShowDatePicker(false);
  };

  const handleUpdateStatus = async (reservationId: string, status: Reservation['status']) => {
    const { error } = await supabase.from('reservations').update({ status }).eq('id', reservationId);
    if (!error) { loadReservations(); setSelectedReservation(null); }
  };

  const handleDeleteReservation = async (reservationId: string) => {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) { alert('Reservierung nicht gefunden.'); return; }

    const isOnlineBooking = (reservation as any).booking_method === 'stripe' ||
                           (reservation as any).payment_method === 'stripe' ||
                           (reservation as any).stripe_payment_intent_id;

    let confirmMessage = t('reservations.confirm_delete');
    if (isOnlineBooking) {
      const amount = (reservation as any).deposit_amount || 0;
      confirmMessage = `WARNUNG: Dies ist eine bezahlte Online-Reservierung!\n\nBetrag: €${amount.toFixed(2)}\n\nDas Löschen erstattet NICHT automatisch die Zahlung.\n\nFortfahren?`;
    }

    if (!confirm(confirmMessage)) return;

    if (isOnlineBooking) {
      if (!confirm('LETZTE BESTÄTIGUNG: Haben Sie die Zahlung bereits in Stripe erstattet?')) return;
    }

    setIsUpdating(true);
    try {
      const isAbandoned = (reservation as any).is_abandoned;
      const tableName = isAbandoned ? 'abandoned_reservations' : 'reservations';
      const { error: deleteError } = await supabase.from(tableName).delete().eq('id', reservationId);
      if (deleteError) { alert('Fehler beim Löschen: ' + deleteError.message); return; }

      if (!isAbandoned) {
        supabase.from('activity_logs').insert({
          event_type: 'reservation_deleted', actor_type: 'admin',
          actor_id: adminUser?.id ?? null, actor_name: adminUser?.full_name ?? adminUser?.email ?? null,
          entity_type: 'reservation', entity_id: reservationId,
          description: `Admin gelöscht: ${reservation.customer_name} (${reservation.party_size} Gäste) am ${reservation.reservation_date}`,
          metadata: { customer_name: reservation.customer_name, reservation_date: reservation.reservation_date, reservation_time: reservation.reservation_time, status: reservation.status, is_online_booking: isOnlineBooking },
        }).then(() => {});
      }

      await loadReservations();
      setSelectedReservation(null);
    } catch (error: any) {
      alert('Fehler: ' + (error.message || 'Bitte versuchen Sie es erneut.'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateReservationWithPaymentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingWithPaymentLink(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-link`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: newReservation.customer_name, customer_email: newReservation.customer_email,
          customer_phone: newReservation.customer_phone, party_size: newReservation.party_size,
          reservation_date: newReservation.reservation_date, reservation_time: newReservation.reservation_time,
          special_requests: newReservation.special_requests, duration_minutes: 120, table_ids: selectedTables,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create payment link');

      let message = `Reservierung erstellt! Buchungsnummer: ${data.booking_code}\n\nZahlungslink: ${data.payment_link_url}`;
      if (!data.email_sent) message += `\n\nWARNUNG: E-Mail konnte nicht gesendet werden. Bitte manuell senden.`;
      alert(message);

      resetCreateForm();
      loadReservations();
    } catch (error: any) {
      alert('Fehler: ' + error.message);
    } finally {
      setIsCreatingWithPaymentLink(false);
    }
  };

  const resetCreateForm = () => {
    setShowCreateForm(false);
    setSelectedTables([]);
    setMultipleDays(false);
    setSelectedDays([]);
    setPaidWithCash(false);
    setCashAmount(0);
    setDayAmounts({});
    setBookingMethod('free');
    setNewReservation({ customer_name: '', customer_email: '', customer_phone: '', party_size: 2, reservation_date: '', reservation_time: '', room_id: '', special_requests: '', status: 'confirmed', payment_status: 'unpaid', payment_amount: 0 });
  };

  const resetEditForm = () => {
    setShowEditForm(false);
    setEditingReservation(null);
    setSelectedTables([]);
    setMultipleDays(false);
    setSelectedDays([]);
    setPaidWithCash(false);
    setCashAmount(0);
    setBookingMethod('free');
    setNewReservation({ customer_name: '', customer_email: '', customer_phone: '', party_size: 2, reservation_date: '', reservation_time: '', room_id: '', special_requests: '', status: 'confirmed', payment_status: 'unpaid', payment_amount: 0 });
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    const datesToBook: string[] = [];
    if (multipleDays) {
      datesToBook.push(newReservation.reservation_date);
      selectedDays.forEach(day => { if (!datesToBook.includes(day)) datesToBook.push(day); });
    } else {
      datesToBook.push(newReservation.reservation_date);
    }
    datesToBook.sort();

    if (selectedTables.length > 0) {
      for (const date of datesToBook) {
        const { data: existingReservations } = await supabase.from('reservations').select('id').eq('reservation_date', date).eq('reservation_time', newReservation.reservation_time).in('status', ['confirmed', 'pending']);
        if (existingReservations && existingReservations.length > 0) {
          const { data: reservationTables } = await supabase.from('reservation_tables').select('table_id').in('reservation_id', existingReservations.map(r => r.id));
          const bookedTableIds = reservationTables?.map(rt => rt.table_id) || [];
          const conflictingTables = selectedTables.filter(tableId => bookedTableIds.includes(tableId));
          if (conflictingTables.length > 0) {
            const { data: conflictTables } = await supabase.from('tables').select('table_number, custom_label').in('id', conflictingTables);
            const tableNames = conflictTables?.map(t => t.custom_label || `Tisch ${t.table_number}`).join(', ') || 'Ausgewählte Tische';
            alert(`${tableNames} bereits gebucht für ${date} um ${newReservation.reservation_time} Uhr.`);
            return;
          }
        }
      }
    }

    const isPerDayMode = paidWithCash && multipleDays && selectedDays.length > 0;

    for (const date of datesToBook) {
      const perDayAmount = isPerDayMode ? (dayAmounts[date] ?? 0) : (paidWithCash ? cashAmount : 0);
      const { data: reservation, error } = await supabase.from('reservations').insert([{
        customer_name: newReservation.customer_name, customer_email: newReservation.customer_email,
        customer_phone: newReservation.customer_phone, party_size: newReservation.party_size,
        reservation_date: date, reservation_time: newReservation.reservation_time,
        special_requests: newReservation.special_requests, status: 'confirmed',
        payment_status: paidWithCash ? 'paid' : 'unpaid', payment_amount: perDayAmount,
        payment_method: paidWithCash ? 'cash' : 'none', duration_minutes: 120,
        stripe_payment_intent_id: null,
        booking_method: bookingMethod === 'free' ? 'free' : (paidWithCash ? 'manual' : 'free'),
      }]).select().single();

      if (!error && reservation) {
        supabase.from('activity_logs').insert({
          event_type: 'reservation_created', actor_type: 'admin',
          actor_id: adminUser?.id ?? null, actor_name: adminUser?.full_name ?? adminUser?.email ?? null,
          entity_type: 'reservation', entity_id: reservation.id,
          description: `Admin erstellt: ${reservation.customer_name} (${reservation.party_size} Gäste) am ${date}`,
          metadata: { customer_name: reservation.customer_name, customer_email: reservation.customer_email, party_size: reservation.party_size, reservation_date: date, reservation_time: newReservation.reservation_time, payment_method: paidWithCash ? 'cash' : 'none' },
        }).then(() => {});

        if (selectedTables.length > 0) {
          const tableLinks = selectedTables.map(tableId => ({ reservation_id: reservation.id, table_id: tableId, assigned_by_type: 'admin', assigned_by_id: adminUser?.id ?? null, assigned_by_name: adminUser?.full_name ?? adminUser?.email ?? null }));
          await supabase.from('reservation_tables').insert(tableLinks);

          try {
            const { data: assignedTables } = await supabase.from('reservation_tables').select('table_id, tables(table_number)').eq('reservation_id', reservation.id);
            const tableNumbers = assignedTables?.map((rt: any) => rt.tables?.table_number).filter(Boolean) || [];
            await supabase.functions.invoke('notify-admins-new-reservation', { body: { reservation: { id: reservation.id, customer_name: reservation.customer_name, party_size: reservation.party_size, reservation_date: reservation.reservation_date, reservation_time: reservation.reservation_time, table_numbers: tableNumbers, special_requests: reservation.special_requests } } });
          } catch {}
        }
      }
    }

    resetCreateForm();
    loadReservations();
  };

  const handleUpdatePayment = async (reservationId: string, paymentStatus: 'unpaid' | 'paid' | 'refunded', amount?: number) => {
    const updates: any = { payment_status: paymentStatus };
    if (amount !== undefined) updates.payment_amount = amount;
    const { error } = await supabase.from('reservations').update(updates).eq('id', reservationId);
    if (!error) { loadReservations(); setSelectedReservation(null); }
  };

  const handleMarkPaymentLinkAsPaid = async () => {
    if (!editingReservation || isUpdating) return;
    setIsUpdating(true);
    const { error } = await supabase.from('reservations').update({ payment_status: 'paid', status: 'confirmed' }).eq('id', editingReservation.id);
    if (error) { alert('Fehler beim Aktualisieren'); }
    else { setEditingReservation({ ...editingReservation, payment_status: 'paid', status: 'confirmed' }); loadReservations(); }
    setIsUpdating(false);
  };

  const handleEditReservation = (reservation: ReservationWithTable) => {
    setEditingReservation(reservation);
    const assignedTables: string[] = [];
    let roomIdFromTables = '';
    if (reservation.reservation_tables && reservation.reservation_tables.length > 0) {
      reservation.reservation_tables.forEach((rt: any) => {
        assignedTables.push(rt.table_id);
        if (!roomIdFromTables && rt.tables?.room_id) roomIdFromTables = rt.tables.room_id;
      });
    }
    const finalRoomId = roomIdFromTables || reservation.table?.room_id || '';
    setNewReservation({ customer_name: reservation.customer_name, customer_email: reservation.customer_email || '', customer_phone: reservation.customer_phone || '', party_size: reservation.party_size, reservation_date: reservation.reservation_date, reservation_time: reservation.reservation_time, room_id: finalRoomId, special_requests: reservation.special_requests || '', status: reservation.status, payment_status: reservation.payment_status, payment_amount: reservation.payment_amount || 0 });
    setSelectedTables(assignedTables);
    if (finalRoomId) setTableRoomFilter(finalRoomId);

    const bm = (reservation as any).booking_method;
    const pm = (reservation as any).payment_method;
    if (bm === 'online' || bm === 'payment_link' || pm === 'stripe') {
      setBookingMethod('free'); setPaidWithCash(false); setCashAmount(0);
    } else if (bm === 'manual' || (reservation.payment_status === 'paid' && reservation.payment_amount && reservation.payment_amount > 0)) {
      setBookingMethod('manual'); setPaidWithCash(true); setCashAmount(reservation.payment_amount || 0);
    } else {
      setBookingMethod('free'); setPaidWithCash(false); setCashAmount(0);
    }
    setShowEditForm(true);
  };

  const handleUpdateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReservation || isUpdating) return;
    setIsUpdating(true);
    try {
      const originalBookingMethod = (editingReservation as any).booking_method;
      const originalPaymentMethod = (editingReservation as any).payment_method;
      let paymentStatus, paymentAmount, finalBookingMethod, paymentMethod;

      if (originalBookingMethod === 'online' || originalBookingMethod === 'payment_link' || originalPaymentMethod === 'stripe') {
        paymentStatus = editingReservation.payment_status;
        paymentAmount = editingReservation.payment_amount;
        finalBookingMethod = originalBookingMethod;
        paymentMethod = originalPaymentMethod;
      } else {
        paymentStatus = bookingMethod === 'free' ? 'unpaid' : (paidWithCash ? 'paid' : 'unpaid');
        paymentAmount = bookingMethod === 'free' ? 0 : (paidWithCash ? cashAmount : 0);
        finalBookingMethod = bookingMethod === 'free' ? 'free' : (paidWithCash ? 'manual' : 'free');
        paymentMethod = paidWithCash ? 'cash' : 'none';
      }

      const updateData: any = { customer_name: newReservation.customer_name, customer_email: newReservation.customer_email, customer_phone: newReservation.customer_phone, party_size: newReservation.party_size, reservation_date: newReservation.reservation_date, reservation_time: newReservation.reservation_time, special_requests: newReservation.special_requests, status: 'confirmed', payment_status: paymentStatus, payment_amount: paymentAmount, booking_method: finalBookingMethod };
      if (originalBookingMethod === 'online' || originalBookingMethod === 'payment_link' || originalPaymentMethod === 'stripe') updateData.payment_method = paymentMethod;

      const { error } = await supabase.from('reservations').update(updateData).eq('id', editingReservation.id).select();
      if (error) { alert('Fehler: ' + error.message); return; }

      await supabase.from('reservation_tables').delete().eq('reservation_id', editingReservation.id);
      if (selectedTables.length > 0) {
        const tableLinks = selectedTables.map(tableId => ({ reservation_id: editingReservation.id, table_id: tableId, assigned_by_type: 'admin', assigned_by_id: adminUser?.id ?? null, assigned_by_name: adminUser?.full_name ?? adminUser?.email ?? null }));
        const { error: insertError } = await supabase.from('reservation_tables').insert(tableLinks);
        if (insertError) { alert('Fehler beim Zuweisen der Tische: ' + insertError.message); return; }
      }

      if (selectedDays.length > 0) {
        const additionalReservations = selectedDays.map(date => ({ customer_name: newReservation.customer_name, customer_email: newReservation.customer_email, customer_phone: newReservation.customer_phone, party_size: newReservation.party_size, reservation_date: date, reservation_time: newReservation.reservation_time, special_requests: newReservation.special_requests, status: 'confirmed', payment_status: paymentStatus, payment_amount: paymentAmount, booking_method: finalBookingMethod }));
        const { data: newReservationsData, error: insertError } = await supabase.from('reservations').insert(additionalReservations).select();
        if (!insertError && newReservationsData && selectedTables.length > 0) {
          const allTableLinks = newReservationsData.flatMap(reservation => selectedTables.map(tableId => ({ reservation_id: reservation.id, table_id: tableId, assigned_by_type: 'admin', assigned_by_id: adminUser?.id ?? null, assigned_by_name: adminUser?.full_name ?? adminUser?.email ?? null })));
          await supabase.from('reservation_tables').insert(allTableLinks);
        }
      }

      resetEditForm();
      await loadReservations();
    } catch (error) {
      alert('Fehler beim Aktualisieren.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getFilteredReservations = () => {
    if (!searchQuery.trim()) return reservations;
    const query = searchQuery.toLowerCase().trim();
    return reservations.filter(reservation => {
      const bookingCode = (reservation as any).booking_code?.toLowerCase() || '';
      return bookingCode.includes(query) || reservation.customer_name.toLowerCase().includes(query);
    });
  };

  const groupReservationsByMonth = () => {
    const grouped: { [key: string]: ReservationWithTable[] } = {};
    getFilteredReservations().forEach(reservation => {
      const date = new Date(reservation.reservation_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(reservation);
    });
    return Object.keys(grouped).sort().reverse().map(monthKey => ({
      monthKey,
      monthName: new Date(monthKey + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
      reservations: grouped[monthKey]
    }));
  };

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) newExpanded.delete(monthKey);
    else newExpanded.add(monthKey);
    setExpandedMonths(newExpanded);
  };

  const copyPaymentLink = async (paymentLinkUrl: string, reservationId: string) => {
    try {
      setCopyingLinkFor(reservationId);
      await navigator.clipboard.writeText(paymentLinkUrl);
      setTimeout(() => setCopyingLinkFor(null), 2000);
    } catch { alert('Fehler beim Kopieren'); }
  };

  const resendPaymentLinkEmail = async (reservationId: string) => {
    try {
      setResendingEmailFor(reservationId);
      const { data, error } = await supabase.functions.invoke('resend-payment-link-email', { body: { reservationId } });
      if (error) throw error;
      alert('E-Mail erfolgreich gesendet!');
    } catch { alert('Fehler beim Senden'); } finally { setResendingEmailFor(null); }
  };

  const regeneratePaymentLink = async (reservationId: string) => {
    if (!confirm('Neuen Zahlungslink erstellen? Der alte Link wird ersetzt.')) return;
    try {
      setRegeneratingLinkFor(reservationId);
      const { data, error } = await supabase.functions.invoke('regenerate-payment-link', { body: { reservationId } });
      if (error) throw error;
      alert(`Neuer Link erstellt (${data.stripe_mode} Modus).`);
      loadReservations();
    } catch (error: any) {
      alert('Fehler: ' + (error.message || 'Unbekannter Fehler'));
    } finally { setRegeneratingLinkFor(null); }
  };

  const filterTabs = [
    { key: 'today' as const, label: 'Heute' },
    { key: 'upcoming' as const, label: 'Bevorstehend' },
    { key: 'monthly' as const, label: 'Monatlich' },
    { key: 'all' as const, label: 'Alle' },
  ];

  const TableGrid = ({ excludeId }: { excludeId?: string }) => (
    <div>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {rooms.map(room => (
          <button
            key={room.id}
            type="button"
            onClick={() => { setTableRoomFilter(room.id); loadAllTables(); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${tableRoomFilter === room.id ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            {room.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
        {allTables
          .filter(table => table.capacity > 0 && table.room_id === tableRoomFilter)
          .sort((a, b) => (parseInt(a.table_number) || 0) - (parseInt(b.table_number) || 0))
          .map(table => {
            const isSelected = selectedTables.includes(table.id);
            const reservedTables = (newReservation.reservation_date && newReservation.reservation_time)
              ? getReservedTablesForDateTime(newReservation.reservation_date, newReservation.reservation_time, excludeId)
              : new Set<string>();
            const isReserved = reservedTables.has(table.id);
            const isNonBookable = !table.is_bookable;
            return (
              <button
                key={table.id}
                type="button"
                disabled={isReserved}
                onClick={() => {
                  if (isReserved) return;
                  setSelectedTables(isSelected ? selectedTables.filter(id => id !== table.id) : [...selectedTables, table.id]);
                }}
                className={`p-2 rounded-lg border transition-all text-center ${
                  isReserved ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-400 cursor-not-allowed opacity-60'
                  : isSelected ? 'bg-blue-600 border-blue-600 text-white'
                  : isNonBookable ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-bold">{table.table_number || table.custom_label || `T${table.id.slice(0, 4)}`}</div>
                <div className="text-[10px] opacity-70">{table.capacity}p</div>
              </button>
            );
          })}
      </div>
      {allTables.filter(t => t.capacity > 0 && t.room_id === tableRoomFilter).length === 0 && (
        <p className="text-sm text-slate-400 py-2">{t('reservations.no_tables_available')}</p>
      )}
      {selectedTables.length > 0 && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{selectedTables.length} Tisch{selectedTables.length > 1 ? 'e' : ''} ausgewählt</p>
      )}
    </div>
  );

  const DayPicker = () => {
    const startDate = new Date(newReservation.reservation_date || new Date());
    const days: JSX.Element[] = [];
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - 7);
    for (let i = 0; i < 38; i++) {
      const dateStr = formatDateLocal(currentDate);
      const isSelected = selectedDays.includes(dateStr);
      const isOriginalDate = dateStr === newReservation.reservation_date;
      days.push(
        <button key={dateStr} type="button" onClick={() => {
          if (isOriginalDate) return;
          setSelectedDays(isSelected ? selectedDays.filter(d => d !== dateStr) : [...selectedDays, dateStr].sort());
        }}
          className={`p-1.5 rounded-lg text-center transition min-w-[44px] ${isOriginalDate ? 'bg-emerald-600 text-white cursor-default' : isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
          <div className="text-[10px] font-medium">{currentDate.toLocaleDateString('de-DE', { weekday: 'short' })}</div>
          <div className="text-xs font-bold">{currentDate.getDate()}</div>
        </button>
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[330px]">{days}</div>
        {selectedDays.length > 0 && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{selectedDays.length} zusätzliche Tag{selectedDays.length > 1 ? 'e' : ''} ausgewählt</p>}
      </div>
    );
  };

  const FormBody = ({ isEdit }: { isEdit: boolean }) => {
    const bm = (editingReservation as any)?.booking_method;
    const pm = (editingReservation as any)?.payment_method;
    const isOnlineEdit = isEdit && (bm === 'online' || bm === 'payment_link' || pm === 'stripe');

    return (
      <div className="space-y-5">
        {isEdit && (
          <div className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
            isOnlineEdit ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700'
            : bm === 'manual' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}>
            <span>{isOnlineEdit ? 'Online gebucht' : bm === 'manual' ? 'Bar bezahlt' : 'Kostenlos / Frei'}</span>
            {isEdit && editingReservation && editingReservation.payment_amount > 0 && (
              <span className="font-bold">€{editingReservation.payment_amount?.toFixed(2)} · {editingReservation.payment_status === 'paid' ? 'Bezahlt' : 'Ausstehend'}</span>
            )}
          </div>
        )}

        {isEdit && editingReservation && editingReservation.payment_status !== 'paid' && bm === 'payment_link' && (
          <button
            type="button"
            onClick={handleMarkPaymentLinkAsPaid}
            disabled={isUpdating}
            className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            {isUpdating ? 'Wird aktualisiert...' : 'Als bezahlt markieren'}
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>{t('reservation_widget.name')}</label>
            <input type="text" required value={newReservation.customer_name} onChange={e => setNewReservation({ ...newReservation, customer_name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('reservation_widget.email')}</label>
            <input type="email" required={!isEdit} value={newReservation.customer_email} onChange={e => setNewReservation({ ...newReservation, customer_email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('reservation_widget.phone')}</label>
            <input type="tel" value={newReservation.customer_phone} onChange={e => setNewReservation({ ...newReservation, customer_phone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('reservation_widget.select_date')}</label>
            <input type="date" required value={newReservation.reservation_date} onChange={e => setNewReservation({ ...newReservation, reservation_date: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('reservation_widget.select_time')}</label>
            <input type="time" required value={newReservation.reservation_time} onChange={e => setNewReservation({ ...newReservation, reservation_time: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('reservation_widget.party_size')}</label>
            <input type="number" required min="1" value={newReservation.party_size} onChange={e => setNewReservation({ ...newReservation, party_size: parseInt(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Raum</label>
            <select required value={newReservation.room_id} onChange={e => { setNewReservation({ ...newReservation, room_id: e.target.value }); setTableRoomFilter(e.target.value); }} className={inputCls}>
              <option value="">Bitte wählen...</option>
              {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('reservation_widget.special_requests')}</label>
          <textarea value={newReservation.special_requests} onChange={e => setNewReservation({ ...newReservation, special_requests: e.target.value })} rows={2} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Tische <span className="normal-case font-normal text-slate-400">(optional)</span></label>
          <TableGrid excludeId={editingReservation?.id} />
        </div>

        <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-3 space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div className={`w-8 h-4.5 rounded-full transition-colors relative ${multipleDays ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} style={{ height: '18px', width: '32px' }}>
              <div className={`absolute top-0.5 rounded-full bg-white shadow transition-transform ${multipleDays ? 'translate-x-3.5' : 'translate-x-0.5'}`} style={{ width: '14px', height: '14px' }} />
            </div>
            <input type="checkbox" checked={multipleDays} onChange={e => { setMultipleDays(e.target.checked); if (!e.target.checked) { setSelectedDays([]); setDayAmounts({}); } }} className="sr-only" />
            <span className="text-sm text-slate-700 dark:text-slate-300">{isEdit ? t('crew.book_additional_days') : t('crew.book_multiple_days')}</span>
          </label>
          {multipleDays && <DayPicker />}
        </div>

        {!isOnlineEdit && (
          <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-3 space-y-3">
            <p className={labelCls}>{isEdit ? 'Zahlungsstatus' : 'Buchungsart'}</p>
            <div className="flex gap-2">
              {(['free', 'manual'] as const).map(bmt => (
                <button key={bmt} type="button" onClick={() => { setBookingMethod(bmt); if (bmt === 'free') { setPaidWithCash(false); setCashAmount(0); } }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${bookingMethod === bmt ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  {bmt === 'free' ? 'Kostenlos' : 'Mit Zahlung'}
                </button>
              ))}
            </div>
            {bookingMethod === 'manual' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className={`rounded-full transition-colors relative flex-shrink-0 ${paidWithCash ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`} style={{ height: '18px', width: '32px' }}>
                    <div className={`absolute top-0.5 rounded-full bg-white shadow transition-transform ${paidWithCash ? 'translate-x-3.5' : 'translate-x-0.5'}`} style={{ width: '14px', height: '14px' }} />
                  </div>
                  <input type="checkbox" checked={paidWithCash} onChange={e => { setPaidWithCash(e.target.checked); if (!e.target.checked) setCashAmount(0); }} className="sr-only" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{t('crew.paid_with_cash')}</span>
                </label>
                {paidWithCash && (
                  <>
                    {multipleDays && selectedDays.length > 0 ? (
                      <div className="space-y-1.5">
                        {[newReservation.reservation_date, ...selectedDays].filter(Boolean).sort().map(dateStr => {
                          const [y, m, d] = dateStr.split('-').map(Number);
                          const label = new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                          const isMain = dateStr === newReservation.reservation_date;
                          return (
                            <div key={dateStr} className="flex items-center gap-2">
                              <span className="text-xs text-slate-600 dark:text-slate-400 flex-1">{label}{isMain && <span className="text-emerald-500 ml-1">(Haupttag)</span>}</span>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                                <input type="number" min="0" step="0.01" value={dayAmounts[dateStr] ?? 0} onChange={e => setDayAmounts(prev => ({ ...prev, [dateStr]: parseFloat(e.target.value) || 0 }))} className="w-24 pl-6 pr-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-right text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                        <input type="number" min="0" step="0.01" value={cashAmount} onChange={e => setCashAmount(parseFloat(e.target.value) || 0)} className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">{t('reservations.title')}</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {getFilteredReservations().length > 0 && <span className="text-slate-600 dark:text-slate-400 font-medium">{getFilteredReservations().length} </span>}
            Reservierungen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} title="Liste">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('floor-plan')} className={`p-1.5 rounded transition ${viewMode === 'floor-plan' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} title="Grundriss">
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => window.print()} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition" title="Drucken">
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setNewReservation(prev => ({ ...prev, reservation_date: selectedDate || formatDateLocal(new Date()) })); setShowCreateForm(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Neue Reservierung
          </button>
        </div>
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-2 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Name oder Buchungscode…"
            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => setFilter('payment_link')}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'payment_link'
                ? 'bg-amber-500 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Zahlung
            {unpaidPaymentLinkCount > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full ${filter === 'payment_link' ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'}`}>
                {unpaidPaymentLinkCount}
              </span>
            )}
          </button>

          <div className="relative flex-shrink-0" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                filter === 'date'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {filter === 'date' && selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : 'Datum'}
            </button>
            {showDatePicker && (
              <div className="absolute right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 z-30 w-56">
                <input type="date" value={selectedDate} onChange={e => handleDateSelect(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                {selectedDate && (
                  <button onClick={() => { setSelectedDate(''); setFilter('upcoming'); setShowDatePicker(false); }} className="w-full mt-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition">
                    Datum zurücksetzen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unpaid banner */}
      {filter === 'payment_link' && unpaidPaymentLinkCount > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl text-sm no-print">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-amber-700 dark:text-amber-300 font-medium">{unpaidPaymentLinkCount} Reservierung{unpaidPaymentLinkCount > 1 ? 'en' : ''} warte{unpaidPaymentLinkCount > 1 ? 'n' : 't'} auf Zahlung</span>
        </div>
      )}

      {/* Content */}
      {viewMode === 'floor-plan' ? (
        <ReservationFloorPlanView
          selectedDate={selectedDate || formatDateLocal(new Date())}
          selectedTime={newReservation.reservation_time || '18:00'}
          onTableClick={(tableId, reservation) => { if (reservation) setSelectedReservation(reservation as any); }}
          onCreateReservation={tableId => { setNewReservation({ ...newReservation, reservation_date: selectedDate || formatDateLocal(new Date()) }); setSelectedTables([tableId]); setShowCreateForm(true); }}
        />
      ) : (
        <div className="space-y-1 printable-reservations">
          {filter === 'monthly' ? (
            groupReservationsByMonth().map(monthGroup => {
              const isExpanded = expandedMonths.has(monthGroup.monthKey);
              return (
                <div key={monthGroup.monthKey}>
                  <button
                    onClick={() => toggleMonth(monthGroup.monthKey)}
                    className="w-full flex items-center justify-between py-2 px-1 group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{monthGroup.monthName}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-600">{monthGroup.reservations.length}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800 mx-3 w-20" />
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="space-y-1 mb-4">
                      {monthGroup.reservations.map(reservation => (
                        <ReservationCard
                          key={reservation.id}
                          reservation={reservation}
                          onSelect={setSelectedReservation}
                          onEdit={handleEditReservation}
                          onDelete={handleDeleteReservation}
                          onCopyLink={copyPaymentLink}
                          onResendEmail={resendPaymentLinkEmail}
                          onRegenerateLink={regeneratePaymentLink}
                          copyingLinkFor={copyingLinkFor}
                          resendingEmailFor={resendingEmailFor}
                          regeneratingLinkFor={regeneratingLinkFor}
                          isUpdating={isUpdating}
                          t={t}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            getFilteredReservations().map(reservation => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                onSelect={setSelectedReservation}
                onEdit={handleEditReservation}
                onDelete={handleDeleteReservation}
                onCopyLink={copyPaymentLink}
                onResendEmail={resendPaymentLinkEmail}
                onRegenerateLink={regeneratePaymentLink}
                copyingLinkFor={copyingLinkFor}
                resendingEmailFor={resendingEmailFor}
                regeneratingLinkFor={regeneratingLinkFor}
                isUpdating={isUpdating}
                t={t}
              />
            ))
          )}

          {reservations.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-400">{t('reservations.no_reservations')}</p>
              <button
                onClick={() => { setNewReservation(prev => ({ ...prev, reservation_date: selectedDate || formatDateLocal(new Date()) })); setShowCreateForm(true); }}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Erste Reservierung erstellen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Drawer */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={resetCreateForm} />
          <div ref={createFormRef} className="w-full max-w-md bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-950 z-10">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Neue Reservierung</h2>
              <button onClick={resetCreateForm} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 px-5 py-5">
              <form id="create-form" onSubmit={handleCreateReservation}>
                <FormBody isEdit={false} />
              </form>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-950 flex flex-col gap-2">
              <button form="create-form" type="submit" className="w-full py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-lg transition">
                Reservierung erstellen
              </button>
              <button
                type="button"
                onClick={handleCreateReservationWithPaymentLink}
                disabled={isCreatingWithPaymentLink}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {isCreatingWithPaymentLink ? 'Wird erstellt...' : 'Mit Zahlungslink'}
              </button>
              <button type="button" onClick={resetCreateForm} className="w-full py-2 text-slate-500 dark:text-slate-400 text-sm hover:text-slate-700 dark:hover:text-slate-200 transition">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Drawer */}
      {showEditForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={resetEditForm} />
          <div ref={editFormRef} className="w-full max-w-md bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-950 z-10">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Reservierung bearbeiten</h2>
              <button onClick={resetEditForm} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 px-5 py-5">
              <form id="edit-form" onSubmit={handleUpdateReservation}>
                <FormBody isEdit={true} />
              </form>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-950 flex flex-col gap-2">
              <button
                form="edit-form"
                type="submit"
                disabled={isUpdating}
                className="w-full py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 disabled:opacity-50 text-white dark:text-slate-900 text-sm font-medium rounded-lg transition"
              >
                {isUpdating ? 'Wird gespeichert...' : 'Änderungen speichern'}
              </button>
              <button type="button" onClick={resetEditForm} className="w-full py-2 text-slate-500 dark:text-slate-400 text-sm hover:text-slate-700 dark:hover:text-slate-200 transition">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedReservation.customer_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(selectedReservation.reservation_date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })} · {selectedReservation.reservation_time} · {selectedReservation.party_size} Pers.
                </p>
              </div>
              <button onClick={() => setSelectedReservation(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">{t('reservations.payment_management')}</p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={selectedReservation.payment_amount}
                      id="payment-amount"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-1">
                    {(['unpaid', 'paid', 'refunded'] as const).map(ps => (
                      <button
                        key={ps}
                        onClick={() => { const a = parseFloat((document.getElementById('payment-amount') as HTMLInputElement).value); handleUpdatePayment(selectedReservation.id, ps, a); }}
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium transition ${ps === 'paid' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50' : ps === 'refunded' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'}`}
                      >
                        {ps === 'paid' ? 'Bezahlt' : ps === 'refunded' ? 'Erstattet' : 'Ausstehend'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">{t('reservations.update_status')}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { status: 'confirmed' as const, label: t('reservations.confirm'), cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50' },
                    { status: 'completed' as const, label: t('reservations.complete'), cls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/50' },
                    { status: 'cancelled' as const, label: t('reservations.cancel'), cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50' },
                  ].map(({ status, label, cls }) => (
                    <button key={status} onClick={() => handleUpdateStatus(selectedReservation.id, status)} className={`py-2 rounded-lg text-xs font-medium transition ${cls}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <button
                  onClick={() => handleDeleteReservation(selectedReservation.id)}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isUpdating ? 'Löschen...' : t('reservations.delete')}
                </button>
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  {t('reservations.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
