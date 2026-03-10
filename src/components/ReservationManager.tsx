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

const statusConfig = {
  confirmed: { dot: 'bg-emerald-500', bar: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/40', label: 'Bestätigt' },
  cancelled:  { dot: 'bg-red-500',     bar: 'bg-red-500',     badge: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/40',         label: 'Storniert' },
  completed:  { dot: 'bg-sky-500',     bar: 'bg-sky-500',     badge: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700/40',         label: 'Abgeschlossen' },
  pending:    { dot: 'bg-amber-400',   bar: 'bg-amber-400',   badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/40', label: 'Ausstehend' },
};

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

  const d = new Date(reservation.reservation_date + 'T00:00:00');
  const dayNum = d.getDate();
  const monthAbbr = d.toLocaleDateString('de-DE', { month: 'short' });
  const weekday = d.toLocaleDateString('de-DE', { weekday: 'short' });

  const paymentText =
    bm === 'payment_link' && isPaid ? `€${reservation.payment_amount?.toFixed(2)}`
    : bm === 'payment_link' && !isPaid && reservation.payment_amount > 0 ? `€${reservation.payment_amount?.toFixed(2)}`
    : pm === 'stripe' && isPaid ? `€${reservation.payment_amount?.toFixed(2)}`
    : bm === 'manual' && reservation.payment_amount > 0 ? `€${reservation.payment_amount?.toFixed(2)}`
    : null;

  const cfg = statusConfig[(reservation.status as keyof typeof statusConfig)] ?? statusConfig.pending;

  return (
    <div className="group relative flex items-stretch gap-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden print:bg-white print:shadow-none print:break-inside-avoid border border-white/80 dark:border-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600 hover:-translate-y-0.5">
      <div className={`w-1.5 flex-shrink-0 ${cfg.bar}`} />

      <div
        className="flex items-stretch gap-5 flex-1 px-5 py-5 cursor-pointer"
        onClick={() => onSelect(reservation)}
      >
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-14 bg-gradient-to-b from-sky-500 to-blue-600 rounded-2xl py-3 px-2 text-center shadow-sm">
          <span className="text-[11px] font-semibold text-sky-200 uppercase tracking-wide leading-none">{weekday}</span>
          <span className="text-2xl font-bold text-white leading-tight mt-1">{dayNum}</span>
          <span className="text-[11px] font-medium text-sky-200 leading-none mt-0.5 uppercase">{monthAbbr}</span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-slate-900 dark:text-white truncate leading-tight">{reservation.customer_name}</span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${cfg.badge}`}>
                  {cfg.label}
                </span>
                {paymentText && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${
                    isOnline && isPaid ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/40'
                    : isOnline && !isPaid ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                  }`}>
                    <CreditCard className="w-3.5 h-3.5" />
                    {paymentText}
                    {isOnline && !isPaid && <span className="opacity-70">· ausstehend</span>}
                  </span>
                )}
                {(reservation as any).booking_code && (
                  <span className="font-mono text-sm font-semibold text-slate-600 dark:text-slate-300 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                    #{(reservation as any).booking_code}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {reservation.customer_email && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[180px]">{reservation.customer_email}</span>
                  </span>
                )}
                {reservation.customer_phone && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{reservation.customer_phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3" />{reservation.reservation_time}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Users className="w-3 h-3" />{reservation.party_size} {reservation.party_size === 1 ? 'Person' : 'Personen'}
            </span>
            {tableNumbers && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-xs font-medium text-sky-500 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40">
                Tisch {tableNumbers}
              </span>
            )}
          </div>

          {reservation.special_requests && (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic border-l-2 border-slate-200 dark:border-slate-700 pl-3 leading-relaxed print:text-gray-600">
              {reservation.special_requests}
            </p>
          )}

          {isUnpaidLink && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5 print:hidden">
              <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 font-semibold">
                <AlertCircle className="w-4 h-4" />Wartet auf Zahlung
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onCopyLink((reservation as any).payment_link_url, reservation.id); }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all duration-150 font-medium"
              >
                {copyingLinkFor === reservation.id ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" />Kopiert</> : <><Copy className="w-3.5 h-3.5" />Link kopieren</>}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onResendEmail(reservation.id); }}
                disabled={resendingEmailFor === reservation.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all duration-150 disabled:opacity-50 font-medium"
              >
                {resendingEmailFor === reservation.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                E-Mail senden
              </button>
              {(reservation as any).payment_link_url?.includes('/test_') && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRegenerateLink(reservation.id); }}
                  disabled={regeneratingLinkFor === reservation.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all duration-150 disabled:opacity-50 font-medium"
                >
                  {regeneratingLinkFor === reservation.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Live-Link
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 pr-4 pl-2 print:hidden">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(reservation); }}
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-150"
          title="Bearbeiten"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(reservation.id); }}
          disabled={isUpdating}
          className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-150 disabled:opacity-50"
          title="Löschen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-150 outline-none";
const labelCls = "block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-1 tracking-wide";

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
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
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
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);

  const MODAL_POS_KEY = 'reservation_modal_pos';
  const getSavedModalPos = () => {
    try {
      const saved = localStorage.getItem(MODAL_POS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };
  const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(getSavedModalPos);
  const modalDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleModalDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = modalRef.current?.getBoundingClientRect();
    modalDragRef.current = {
      startX: clientX,
      startY: clientY,
      origX: rect ? rect.left : (modalPos?.x ?? window.innerWidth / 2 - 340),
      origY: rect ? rect.top : (modalPos?.y ?? window.innerHeight * 0.08),
    };

    const onMove = (me: MouseEvent | TouchEvent) => {
      if (!modalDragRef.current) return;
      const mx = 'touches' in me ? (me as TouchEvent).touches[0].clientX : (me as MouseEvent).clientX;
      const my = 'touches' in me ? (me as TouchEvent).touches[0].clientY : (me as MouseEvent).clientY;
      const dx = mx - modalDragRef.current.startX;
      const dy = my - modalDragRef.current.startY;
      const newX = modalDragRef.current.origX + dx;
      const newY = modalDragRef.current.origY + dy;
      setModalPos({ x: newX, y: newY });
    };

    const onUp = (me: MouseEvent | TouchEvent) => {
      if (!modalDragRef.current) return;
      const mx = 'touches' in me ? (me as TouchEvent).changedTouches[0].clientX : (me as MouseEvent).clientX;
      const my = 'touches' in me ? (me as TouchEvent).changedTouches[0].clientY : (me as MouseEvent).clientY;
      const dx = mx - modalDragRef.current.startX;
      const dy = my - modalDragRef.current.startY;
      const newX = modalDragRef.current.origX + dx;
      const newY = modalDragRef.current.origY + dy;
      const pos = { x: newX, y: newY };
      setModalPos(pos);
      localStorage.setItem(MODAL_POS_KEY, JSON.stringify(pos));
      modalDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  const createFormRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showCreateForm) {
      setTimeout(() => setDrawerVisible(true), 10);
      if (createFormRef.current) createFormRef.current.scrollTop = 0;
    } else {
      setDrawerVisible(false);
    }
  }, [showCreateForm]);

  useEffect(() => {
    if (showEditForm) {
      setTimeout(() => setEditDrawerVisible(true), 10);
      if (editFormRef.current) editFormRef.current.scrollTop = 0;
    } else {
      setEditDrawerVisible(false);
    }
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
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClickOutside); };
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
    setDrawerVisible(false);
    setTimeout(() => {
      setShowCreateForm(false);
      setSelectedTables([]);
      setMultipleDays(false);
      setSelectedDays([]);
      setPaidWithCash(false);
      setCashAmount(0);
      setDayAmounts({});
      setBookingMethod('free');
      setNewReservation({ customer_name: '', customer_email: '', customer_phone: '', party_size: 2, reservation_date: '', reservation_time: '', room_id: '', special_requests: '', status: 'confirmed', payment_status: 'unpaid', payment_amount: 0 });
    }, 280);
  };

  const resetEditForm = () => {
    setEditDrawerVisible(false);
    setTimeout(() => {
      setShowEditForm(false);
      setEditingReservation(null);
      setSelectedTables([]);
      setMultipleDays(false);
      setSelectedDays([]);
      setPaidWithCash(false);
      setCashAmount(0);
      setBookingMethod('free');
      setNewReservation({ customer_name: '', customer_email: '', customer_phone: '', party_size: 2, reservation_date: '', reservation_time: '', room_id: '', special_requests: '', status: 'confirmed', payment_status: 'unpaid', payment_amount: 0 });
    }, 280);
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
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${tableRoomFilter === room.id ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
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
                className={`p-2 rounded-xl border transition-all duration-150 text-center ${
                  isReserved ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-400 cursor-not-allowed opacity-60'
                  : isSelected ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900'
                  : isNonBookable ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
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
          className={`p-1.5 rounded-xl text-center transition-all duration-150 min-w-[44px] ${isOriginalDate ? 'bg-emerald-600 text-white cursor-default' : isSelected ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
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

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'}`}
        style={{ width: 32, height: 18 }}
      >
        <div
          className={`absolute top-0.5 rounded-full bg-white dark:bg-slate-900 shadow transition-transform duration-200 ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}`}
          style={{ width: 14, height: 14 }}
        />
      </div>
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </label>
  );

  const FormSectionDivider = ({ label }: { label: string }) => (
    <div className="flex items-center gap-2.5 pt-1 pb-0.5">
      <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 uppercase tracking-[0.15em] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/80" />
    </div>
  );

  const FormBody = ({ isEdit }: { isEdit: boolean }) => {
    const bm = (editingReservation as any)?.booking_method;
    const pm = (editingReservation as any)?.payment_method;
    const isOnlineEdit = isEdit && (bm === 'online' || bm === 'payment_link' || pm === 'stripe');

    return (
      <div className="space-y-4">
        {isEdit && (
          <div className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
            isOnlineEdit ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700/40'
            : bm === 'manual' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/40'
            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/60'
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
            className="w-full px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-2xl flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 shadow-sm"
          >
            <CheckCircle className="w-4 h-4" />
            {isUpdating ? 'Wird aktualisiert...' : 'Als bezahlt markieren'}
          </button>
        )}

        <FormSectionDivider label="Gast" />

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
        </div>

        <FormSectionDivider label="Termin" />

        <div className="grid grid-cols-2 gap-3">
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

        <FormSectionDivider label="Tische" />

        <TableGrid excludeId={editingReservation?.id} />

        <FormSectionDivider label="Optionen" />

        <div className="space-y-3">
          <Toggle
            checked={multipleDays}
            onChange={v => { setMultipleDays(v); if (!v) { setSelectedDays([]); setDayAmounts({}); } }}
            label={isEdit ? t('crew.book_additional_days') : t('crew.book_multiple_days')}
          />
          {multipleDays && <DayPicker />}
        </div>

        {!isOnlineEdit && (
          <div className="space-y-3">
            <FormSectionDivider label="Buchungsart" />
            <div className="flex gap-2">
              {(['free', 'manual'] as const).map(bmt => (
                <button key={bmt} type="button" onClick={() => { setBookingMethod(bmt); if (bmt === 'free') { setPaidWithCash(false); setCashAmount(0); } }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${bookingMethod === bmt ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                >
                  {bmt === 'free' ? 'Kostenlos' : 'Mit Zahlung'}
                </button>
              ))}
            </div>
            {bookingMethod === 'manual' && (
              <div className="space-y-2.5">
                <Toggle
                  checked={paidWithCash}
                  onChange={v => { setPaidWithCash(v); if (!v) setCashAmount(0); }}
                  label={t('crew.paid_with_cash')}
                />
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
                                <input type="number" min="0" step="0.01" value={dayAmounts[dateStr] ?? 0} onChange={e => setDayAmounts(prev => ({ ...prev, [dateStr]: parseFloat(e.target.value) || 0 }))} className="w-24 pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm text-right text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white/30 focus:border-transparent transition-all duration-150" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                        <input type="number" min="0" step="0.01" value={cashAmount} onChange={e => setCashAmount(parseFloat(e.target.value) || 0)} className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-150" />
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

  const drawerPanelCls = (visible: boolean) =>
    `w-full max-w-md bg-white dark:bg-slate-950 flex flex-col h-full shadow-2xl transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-semibold text-slate-600 dark:text-slate-300 tracking-tight">{t('reservations.title')}</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {getFilteredReservations().length > 0 && <span className="text-slate-600 dark:text-slate-400 font-medium">{getFilteredReservations().length} </span>}
            Reservierungen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all duration-150 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} title="Liste">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('floor-plan')} className={`p-1.5 rounded-lg transition-all duration-150 ${viewMode === 'floor-plan' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`} title="Grundriss">
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => window.print()} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-150" title="Drucken">
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setNewReservation(prev => ({ ...prev, reservation_date: selectedDate || formatDateLocal(new Date()) })); setShowCreateForm(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 dark:bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-white dark:text-white rounded-xl text-sm font-semibold transition-all duration-150 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Neue Reservierung
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Name oder Buchungscode…"
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-slate-900 dark:focus:ring-white/20 focus:border-transparent transition-all duration-150 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all duration-150">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-200 whitespace-nowrap border ${
                filter === tab.key
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/30 scale-[1.03]'
                  : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => setFilter('payment_link')}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 border ${
              filter === 'payment_link'
                ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30 scale-[1.03]'
                : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700'
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
          </div>

          <div className="relative flex-shrink-0" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap border ${
                filter === 'date'
                  ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/30 scale-[1.03]'
                  : 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {filter === 'date' && selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : 'Datum'}
            </button>
            {showDatePicker && (() => {
              const { year, month } = calendarMonth;
              const firstDay = new Date(year, month, 1).getDay();
              const startOffset = (firstDay + 6) % 7;
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
              const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
              const cells: (number|null)[] = [...Array(startOffset).fill(null), ...Array.from({length: daysInMonth}, (_,i) => i+1)];
              while (cells.length % 7 !== 0) cells.push(null);
              return (
                <div className="absolute right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 z-30 w-64" onMouseDown={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-2.5">
                    <button onMouseDown={e => { e.preventDefault(); setCalendarMonth(p => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; }); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">‹</button>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{monthNames[month]} {year}</span>
                    <button onMouseDown={e => { e.preventDefault(); setCalendarMonth(p => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; }); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">›</button>
                  </div>
                  <div className="grid grid-cols-7 mb-1">
                    {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => <div key={d} className="text-center text-xs font-medium text-slate-400 dark:text-slate-500 py-1">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-y-0.5">
                    {cells.map((day, i) => {
                      if (!day) return <div key={i} />;
                      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                      const isSelected = dateStr === selectedDate;
                      const isToday = dateStr === todayStr;
                      return (
                        <button
                          key={i}
                          onMouseDown={e => { e.preventDefault(); handleDateSelect(dateStr); }}
                          className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all duration-150 ${
                            isSelected
                              ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/40'
                              : isToday
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400'
                          }`}
                        >{day}</button>
                      );
                    })}
                  </div>
                  {selectedDate && (
                    <button onMouseDown={e => { e.preventDefault(); setSelectedDate(''); setFilter('upcoming'); setShowDatePicker(false); }} className="w-full mt-2.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs transition-all duration-150 font-medium">
                      Datum zurücksetzen
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {filter === 'payment_link' && unpaidPaymentLinkCount > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl text-sm no-print">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-amber-700 dark:text-amber-300 font-medium">{unpaidPaymentLinkCount} Reservierung{unpaidPaymentLinkCount > 1 ? 'en' : ''} warte{unpaidPaymentLinkCount > 1 ? 'n' : 't'} auf Zahlung</span>
        </div>
      )}

      {viewMode === 'floor-plan' ? (
        <ReservationFloorPlanView
          selectedDate={selectedDate || formatDateLocal(new Date())}
          selectedTime={newReservation.reservation_time || '18:00'}
          onTableClick={(tableId, reservation) => { if (reservation) setSelectedReservation(reservation as any); }}
          onCreateReservation={tableId => { setNewReservation({ ...newReservation, reservation_date: selectedDate || formatDateLocal(new Date()) }); setSelectedTables([tableId]); setShowCreateForm(true); }}
        />
      ) : (
        <div className="space-y-1.5 printable-reservations">
          {filter === 'monthly' ? (
            groupReservationsByMonth().map(monthGroup => {
              const isExpanded = expandedMonths.has(monthGroup.monthKey);
              return (
                <div key={monthGroup.monthKey}>
                  <button
                    onClick={() => toggleMonth(monthGroup.monthKey)}
                    className="w-full flex items-center gap-3 py-2.5 px-1 group"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 whitespace-nowrap">{monthGroup.monthName}</span>
                    <span className="text-[11px] text-slate-300 dark:text-slate-600 font-medium">({monthGroup.reservations.length})</span>
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                    {isExpanded
                      ? <ChevronUp className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                      : <ChevronDown className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="space-y-1.5 mb-5">
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
                className="mt-3 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-all duration-150 underline underline-offset-2"
              >
                Erste Reservierung erstellen
              </button>
            </div>
          )}
        </div>
      )}

      {showCreateForm && (
        <div
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all duration-300 ${drawerVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
          onClick={resetCreateForm}
        >
          <div
            ref={createFormRef}
            className={`bg-white dark:bg-[#0f1117] rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-0 sm:mx-4 shadow-2xl border-t border-x sm:border border-slate-200/60 dark:border-white/[0.06] flex flex-col transition-all duration-300 ${drawerVisible ? 'scale-100 translate-y-0' : 'scale-[0.98] translate-y-3'}`}
            style={{ maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white tracking-tight">Neue Reservierung</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Manuelle Buchung erfassen</p>
              </div>
              <button onClick={resetCreateForm} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-all duration-150">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-px bg-slate-100 dark:bg-white/[0.06] mx-5" />
            <div className="flex-1 px-5 py-4 overflow-y-auto">
              <form id="create-form" onSubmit={handleCreateReservation}>
                <FormBody isEdit={false} />
              </form>
            </div>
            <div className="h-px bg-slate-100 dark:bg-white/[0.06] mx-5" />
            <div className="px-5 py-4 flex flex-col gap-2">
              {selectedTables.length === 0 && (
                <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug">
                    Kein Tisch ausgewählt. Die Reservierung wird ohne Tischzuweisung erstellt.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <button form="create-form" type="submit" className="flex-1 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold rounded-lg transition-all duration-150">
                  Erstellen
                </button>
                <button
                  type="button"
                  onClick={handleCreateReservationWithPaymentLink}
                  disabled={isCreatingWithPaymentLink}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {isCreatingWithPaymentLink ? 'Erstellt...' : 'Zahlungslink'}
                </button>
              </div>
              <button type="button" onClick={resetCreateForm} className="w-full py-1.5 text-slate-400 dark:text-slate-600 text-xs hover:text-slate-600 dark:hover:text-slate-400 transition-all duration-150">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditForm && (
        <div
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all duration-300 ${editDrawerVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
          onClick={resetEditForm}
        >
          <div
            ref={editFormRef}
            className={`bg-white dark:bg-[#0f1117] rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-0 sm:mx-4 shadow-2xl border-t border-x sm:border border-slate-200/60 dark:border-white/[0.06] flex flex-col transition-all duration-300 ${editDrawerVisible ? 'scale-100 translate-y-0' : 'scale-[0.98] translate-y-3'}`}
            style={{ maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white tracking-tight">Reservierung bearbeiten</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Änderungen werden sofort gespeichert</p>
              </div>
              <button onClick={resetEditForm} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-all duration-150">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-px bg-slate-100 dark:bg-white/[0.06] mx-5" />
            <div className="flex-1 px-5 py-4 overflow-y-auto">
              <form id="edit-form" onSubmit={handleUpdateReservation}>
                <FormBody isEdit={true} />
              </form>
            </div>
            <div className="h-px bg-slate-100 dark:bg-white/[0.06] mx-5" />
            <div className="px-5 py-4 flex flex-col gap-2">
              <button
                form="edit-form"
                type="submit"
                disabled={isUpdating}
                className="w-full py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 disabled:opacity-50 text-white dark:text-slate-900 text-sm font-semibold rounded-lg transition-all duration-150"
              >
                {isUpdating ? 'Wird gespeichert...' : 'Änderungen speichern'}
              </button>
              <button type="button" onClick={resetEditForm} className="w-full py-1.5 text-slate-400 dark:text-slate-600 text-xs hover:text-slate-600 dark:hover:text-slate-400 transition-all duration-150">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReservation && (() => {
        const selCfg = statusConfig[(selectedReservation.status as keyof typeof statusConfig)] ?? statusConfig.pending;
        const selBm = (selectedReservation as any).booking_method;
        const selPm = (selectedReservation as any).payment_method;
        const selIsOnline = selBm === 'online' || selBm === 'payment_link' || selPm === 'stripe';
        const selIsPaid = selectedReservation.payment_status === 'paid';
        const selTableNumbers = selectedReservation.reservation_tables && selectedReservation.reservation_tables.length > 0
          ? selectedReservation.reservation_tables.map((rt: any) => rt.tables?.table_number).filter(Boolean).join(', ')
          : (selectedReservation as any).table?.table_number || null;
        const selDate = new Date(selectedReservation.reservation_date + 'T00:00:00');
        const bookingMethodLabel = selBm === 'payment_link' ? 'Zahlungslink' : selBm === 'online' || selPm === 'stripe' ? 'Online' : selBm === 'manual' ? 'Manuell / Bar' : 'Kostenlos';

        const isDragged = modalPos !== null;
        return (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            style={isDragged ? {} : { display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setSelectedReservation(null)}
          >
            <div
              ref={modalRef}
              className="bg-white dark:bg-slate-950 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800/80"
              style={isDragged
                ? { position: 'absolute', left: modalPos.x, top: modalPos.y, maxHeight: '92vh', width: 'min(100vw - 32px, 672px)' }
                : { maxHeight: '92vh', marginBottom: '5vh', borderRadius: '1.5rem 1.5rem 0 0' }
              }
              onClick={e => e.stopPropagation()}
            >
              <div
                className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleModalDragStart}
                onTouchStart={handleModalDragStart}
              >
                <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>

              <div className={`px-6 pt-4 pb-5 border-b border-slate-100 dark:border-slate-800/80`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${selCfg.badge}`}>
                        <span className={`w-2 h-2 rounded-full ${selCfg.dot}`} />
                        {selCfg.label}
                      </span>
                      {(selectedReservation as any).booking_code && (
                        <span className="font-mono text-sm text-slate-400 dark:text-slate-500 px-2.5 py-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                          #{(selectedReservation as any).booking_code}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{selectedReservation.customer_name}</h2>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1 capitalize">
                      {selDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => setSelectedReservation(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all duration-150 flex-shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-4 py-3 text-center">
                    <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedReservation.reservation_time}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Uhrzeit</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-4 py-3 text-center">
                    <Users className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedReservation.party_size}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Personen</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl px-4 py-3 text-center">
                    <CalendarDays className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{selTableNumbers ?? '—'}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Tisch</p>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 260px)' }}>
                <div className="px-6 py-5 space-y-5">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedReservation.customer_email && (
                      <a href={`mailto:${selectedReservation.customer_email}`} className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 group">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-all duration-150">
                          <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">E-Mail</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{selectedReservation.customer_email}</p>
                        </div>
                      </a>
                    )}
                    {selectedReservation.customer_phone && (
                      <a href={`tel:${selectedReservation.customer_phone}`} className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150 group">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-all duration-150">
                          <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Telefon</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{selectedReservation.customer_phone}</p>
                        </div>
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="px-4 py-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Buchungsart</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{bookingMethodLabel}</p>
                    </div>
                    <div className="px-4 py-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Zahlung</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {selectedReservation.payment_amount > 0 ? `€${selectedReservation.payment_amount.toFixed(2)}` : '—'}
                        </p>
                        {selectedReservation.payment_amount > 0 && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            selIsPaid ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/40'
                            : selectedReservation.payment_status === 'refunded' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border-red-200 dark:border-red-700/40'
                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/40'
                          }`}>
                            {selIsPaid ? 'Bezahlt' : selectedReservation.payment_status === 'refunded' ? 'Erstattet' : 'Ausstehend'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Erstellt am</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {selectedReservation.created_at ? new Date(selectedReservation.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    {selIsOnline && (selectedReservation as any).stripe_payment_intent_id && (
                      <div className="px-4 py-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Stripe</p>
                        <p className="text-sm font-mono text-slate-500 dark:text-slate-400 truncate">{(selectedReservation as any).stripe_payment_intent_id}</p>
                      </div>
                    )}
                  </div>

                  {selectedReservation.special_requests && (
                    <div className="px-4 py-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl">
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1.5">Besondere Anfragen</p>
                      <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{selectedReservation.special_requests}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-3">{t('reservations.update_status')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { status: 'confirmed' as const, label: t('reservations.confirm'), cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/40' },
                        { status: 'completed' as const, label: t('reservations.complete'), cls: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/30 border border-sky-200 dark:border-sky-700/40' },
                        { status: 'cancelled' as const, label: t('reservations.cancel'), cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700/40' },
                      ].map(({ status, label, cls }) => (
                        <button key={status} onClick={() => handleUpdateStatus(selectedReservation.id, status)} className={`py-3 rounded-2xl text-sm font-semibold transition-all duration-150 ${cls} ${selectedReservation.status === status ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-3">{t('reservations.payment_management')}</p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">€</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={selectedReservation.payment_amount}
                          id="payment-amount"
                          className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white/20 focus:border-transparent transition-all duration-150"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['unpaid', 'paid', 'refunded'] as const).map(ps => (
                        <button
                          key={ps}
                          onClick={() => { const a = parseFloat((document.getElementById('payment-amount') as HTMLInputElement).value); handleUpdatePayment(selectedReservation.id, ps, a); }}
                          className={`py-3 rounded-2xl text-sm font-semibold transition-all duration-150 border ${
                            ps === 'paid' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-700/40'
                            : ps === 'refunded' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-200 dark:border-red-700/40'
                            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-amber-200 dark:border-amber-700/40'
                          } ${selectedReservation.payment_status === ps ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                        >
                          {ps === 'paid' ? 'Bezahlt' : ps === 'refunded' ? 'Erstattet' : 'Ausstehend'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pb-2">
                    <button
                      onClick={() => { setSelectedReservation(null); handleEditReservation(selectedReservation); }}
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 transition-all duration-150"
                    >
                      <Edit2 className="w-4 h-4" />
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => setSelectedReservation(null)}
                      className="py-3 rounded-2xl text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-all duration-150"
                    >
                      {t('reservations.close')}
                    </button>
                    <button
                      onClick={() => handleDeleteReservation(selectedReservation.id)}
                      disabled={isUpdating}
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700/40 transition-all duration-150 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isUpdating ? '...' : t('reservations.delete')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
