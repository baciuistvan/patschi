import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Search, Download, Users, Mail, Phone, Calendar, Euro,
  TrendingUp, Star, ChevronDown, ChevronUp, X, Clock,
  Hash, ArrowUpDown, SlidersHorizontal,
} from 'lucide-react';

interface Guest {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  reservation_count: number;
  total_spent: string;
  last_visit_date: string;
  first_visit_date: string;
}

interface Reservation {
  id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  payment_amount: string;
  payment_status: string;
  special_requests: string;
  booking_code: string;
}

type FilterType = 'all' | 'new' | 'returning' | 'vip';
type SortField = 'name' | 'visits' | 'spent' | 'last_visit';
type SortOrder = 'asc' | 'desc';

const tierConfig = {
  vip: {
    label: 'VIP',
    ring: 'ring-2 ring-amber-400/60',
    avatarBg: 'bg-amber-50 dark:bg-amber-900/30',
    avatarText: 'text-amber-700 dark:text-amber-300',
    bar: 'bg-amber-400',
    badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40',
  },
  returning: {
    label: 'Stammgast',
    ring: 'ring-2 ring-sky-400/40',
    avatarBg: 'bg-sky-50 dark:bg-sky-900/30',
    avatarText: 'text-sky-700 dark:text-sky-300',
    bar: 'bg-sky-500',
    badge: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700/40',
  },
  new: {
    label: 'Neu',
    ring: 'ring-2 ring-slate-200 dark:ring-slate-700',
    avatarBg: 'bg-slate-100 dark:bg-slate-800',
    avatarText: 'text-slate-600 dark:text-slate-300',
    bar: 'bg-slate-300 dark:bg-slate-600',
    badge: 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/40',
  },
};

const statusConfig = {
  confirmed: { bar: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/40', label: 'Bestätigt' },
  pending:   { bar: 'bg-amber-400',   badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/40',   label: 'Ausstehend' },
  cancelled: { bar: 'bg-red-500',     badge: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700/40',         label: 'Storniert' },
  completed: { bar: 'bg-sky-500',     badge: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700/40',         label: 'Abgeschlossen' },
};

function getTier(guest: Guest): 'vip' | 'returning' | 'new' {
  if (guest.reservation_count >= 5 || parseFloat(guest.total_spent) >= 1000) return 'vip';
  if (guest.reservation_count >= 2) return 'returning';
  return 'new';
}

function formatDate(dateString: string) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('de-AT', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateShort(dateString: string) {
  if (!dateString) return '—';
  const d = new Date(dateString + 'T00:00:00');
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('de-DE', { month: 'short' }),
    weekday: d.toLocaleDateString('de-DE', { weekday: 'short' }),
  };
}

function daysSince(dateString: string): number {
  if (!dateString) return 0;
  const diff = Date.now() - new Date(dateString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-32" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-48" />
      </div>
      <div className="hidden sm:flex gap-6">
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-10" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-14" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-20" />
      </div>
    </div>
  );
}

function GuestCard({ guest, selected, onClick }: { guest: Guest; selected: boolean; onClick: () => void }) {
  const tier = getTier(guest);
  const cfg = tierConfig[tier];
  const initials = guest.customer_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const days = daysSince(guest.last_visit_date);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-4 rounded-2xl border transition-all duration-150 p-4 group
        ${selected
          ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-md'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'
        }`}
    >
      <div className={`relative flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${cfg.ring} ${selected ? 'ring-offset-2 ring-offset-slate-900 dark:ring-offset-white' : ''}`}>
        <div className={`w-full h-full rounded-full flex items-center justify-center text-sm font-semibold ${selected ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900' : `${cfg.avatarBg} ${cfg.avatarText}`}`}>
          {initials}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold truncate ${selected ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>
            {guest.customer_name}
          </span>
          {tier === 'vip' && <Star className={`w-3 h-3 flex-shrink-0 fill-current ${selected ? 'text-amber-400' : 'text-amber-400'}`} />}
        </div>
        <p className={`text-xs mt-0.5 truncate ${selected ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>
          {guest.customer_email}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-5 flex-shrink-0">
        <div className="text-right">
          <p className={`text-sm font-semibold tabular-nums ${selected ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>
            {guest.reservation_count}
          </p>
          <p className={`text-xs ${selected ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'}`}>Besuche</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold tabular-nums ${selected ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>
            €{parseFloat(guest.total_spent).toFixed(0)}
          </p>
          <p className={`text-xs ${selected ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'}`}>Ausgaben</p>
        </div>
        <div className="text-right min-w-[56px]">
          <p className={`text-sm font-medium tabular-nums ${selected ? 'text-white dark:text-slate-900' : days > 90 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
            {days === 0 ? 'Heute' : `${days}T`}
          </p>
          <p className={`text-xs ${selected ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'}`}>zuletzt</p>
        </div>
      </div>
    </button>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function ReservationEntry({ res }: { res: Reservation }) {
  const dt = formatDateShort(res.reservation_date);
  const cfg = statusConfig[(res.status as keyof typeof statusConfig)] ?? statusConfig.pending;

  return (
    <div className="flex items-stretch gap-0 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className={`w-1 flex-shrink-0 ${cfg.bar}`} />
      <div className="flex items-center gap-3 px-3 py-3 flex-1 min-w-0">
        <div className="flex-shrink-0 w-10 text-center">
          <p className="text-base font-bold text-slate-900 dark:text-white leading-none">{dt.day}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase">{dt.month}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{res.reservation_time}</span>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Users className="w-3 h-3" />
              <span>{res.party_size}</span>
            </div>
            {res.booking_code && (
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{res.booking_code}</span>
            )}
          </div>
          {res.special_requests && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{res.special_requests}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {parseFloat(res.payment_amount || '0') > 0 && (
            <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
              €{parseFloat(res.payment_amount).toFixed(2)}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
        </div>
      </div>
    </div>
  );
}

function GuestDetailPanel({ guest, reservations, loading, onClose }: {
  guest: Guest;
  reservations: Reservation[] | undefined;
  loading: boolean;
  onClose: () => void;
}) {
  const tier = getTier(guest);
  const cfg = tierConfig[tier];
  const initials = guest.customer_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const avg = guest.reservation_count > 0 ? parseFloat(guest.total_spent) / guest.reservation_count : 0;
  const days = daysSince(guest.last_visit_date);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${cfg.ring} ${cfg.avatarBg} ${cfg.avatarText}`}>
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{guest.customer_name}</h3>
                {tier === 'vip' && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
              </div>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <a href={`mailto:${guest.customer_email}`} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors group">
            <Mail className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 flex-shrink-0" />
            <span className="truncate">{guest.customer_email}</span>
          </a>
          {guest.customer_phone && (
            <a href={`tel:${guest.customer_phone}`} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors group">
              <Phone className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 flex-shrink-0" />
              <span>{guest.customer_phone}</span>
            </a>
          )}
          <div className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>Gast seit {formatDate(guest.first_visit_date)}</span>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Besuche gesamt" value={String(guest.reservation_count)} />
          <StatTile label="Ausgaben gesamt" value={`€${parseFloat(guest.total_spent).toFixed(2)}`} />
          <StatTile label="Ø pro Besuch" value={`€${avg.toFixed(2)}`} />
          <StatTile
            label="Letzter Besuch"
            value={days === 0 ? 'Heute' : `vor ${days}T`}
            sub={formatDate(guest.last_visit_date)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Reservierungsverlauf
        </h4>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : reservations && reservations.length > 0 ? (
          <div className="space-y-2">
            {reservations.map(res => (
              <ReservationEntry key={res.id} res={res} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Keine Reservierungen</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function GuestManager() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('last_visit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [guestReservations, setGuestReservations] = useState<Record<string, Reservation[]>>({});
  const [loadingReservations, setLoadingReservations] = useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_guest_statistics');

      if (error) {
        const { data: reservations, error: reservationError } = await supabase
          .from('reservations')
          .select('customer_name, customer_email, customer_phone, payment_amount, reservation_date')
          .not('customer_email', 'is', null)
          .neq('customer_email', '');

        if (reservationError) throw reservationError;

        const guestMap = new Map<string, Guest>();
        reservations?.forEach((res) => {
          const key = res.customer_email;
          if (guestMap.has(key)) {
            const g = guestMap.get(key)!;
            g.reservation_count += 1;
            g.total_spent = (parseFloat(g.total_spent) + parseFloat(res.payment_amount || '0')).toFixed(2);
            if (res.reservation_date > g.last_visit_date) g.last_visit_date = res.reservation_date;
            if (res.reservation_date < g.first_visit_date) g.first_visit_date = res.reservation_date;
          } else {
            guestMap.set(key, {
              customer_name: res.customer_name,
              customer_email: res.customer_email,
              customer_phone: res.customer_phone || '',
              reservation_count: 1,
              total_spent: (parseFloat(res.payment_amount || '0')).toFixed(2),
              last_visit_date: res.reservation_date,
              first_visit_date: res.reservation_date,
            });
          }
        });
        setGuests(Array.from(guestMap.values()));
      } else {
        setGuests(data || []);
      }
    } catch (err) {
      console.error('Error fetching guests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuestReservations = useCallback(async (email: string) => {
    if (guestReservations[email]) return;
    setLoadingReservations(email);
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, reservation_date, reservation_time, party_size, status, payment_amount, payment_status, special_requests, booking_code')
        .eq('customer_email', email)
        .order('reservation_date', { ascending: false });

      if (error) throw error;
      setGuestReservations(prev => ({ ...prev, [email]: data || [] }));
    } catch (err) {
      console.error('Error fetching guest reservations:', err);
    } finally {
      setLoadingReservations(null);
    }
  }, [guestReservations]);

  const selectGuest = useCallback((email: string) => {
    if (selectedGuest === email) {
      setSelectedGuest(null);
    } else {
      setSelectedGuest(email);
      fetchGuestReservations(email);
    }
  }, [selectedGuest, fetchGuestReservations]);

  const filteredAndSortedGuests = useMemo(() => {
    let filtered = guests.filter(g => {
      const s = searchTerm.toLowerCase();
      const matchesSearch = !s ||
        g.customer_name.toLowerCase().includes(s) ||
        g.customer_email.toLowerCase().includes(s) ||
        g.customer_phone.toLowerCase().includes(s);

      if (!matchesSearch) return false;

      switch (filterType) {
        case 'new': return g.reservation_count === 1;
        case 'returning': return g.reservation_count >= 2 && g.reservation_count < 5;
        case 'vip': return g.reservation_count >= 5 || parseFloat(g.total_spent) >= 1000;
        default: return true;
      }
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.customer_name.localeCompare(b.customer_name); break;
        case 'visits': cmp = a.reservation_count - b.reservation_count; break;
        case 'spent': cmp = parseFloat(a.total_spent) - parseFloat(b.total_spent); break;
        case 'last_visit': cmp = new Date(a.last_visit_date).getTime() - new Date(b.last_visit_date).getTime(); break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [guests, searchTerm, filterType, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(s => s === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
    setShowSortMenu(false);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'E-Mail', 'Telefon', 'Besuche', 'Ausgaben', 'Erster Besuch', 'Letzter Besuch'];
    const rows = filteredAndSortedGuests.map(g => [
      `"${g.customer_name}"`, `"${g.customer_email}"`, `"${g.customer_phone}"`,
      g.reservation_count, g.total_spent, g.first_visit_date, g.last_visit_date,
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `gaeste-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalSpend = guests.reduce((s, g) => s + parseFloat(g.total_spent), 0);
  const vipCount = guests.filter(g => getTier(g) === 'vip').length;
  const avgSpend = guests.length > 0 ? totalSpend / guests.length : 0;

  const sortLabels: Record<SortField, string> = {
    last_visit: 'Letzter Besuch',
    name: 'Name',
    visits: 'Besuche',
    spent: 'Ausgaben',
  };

  const selectedGuestData = guests.find(g => g.customer_email === selectedGuest);

  return (
    <div className="flex flex-col h-full min-h-0 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gästeverwaltung</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {guests.length} {guests.length === 1 ? 'Gast' : 'Gäste'} insgesamt
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredAndSortedGuests.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>CSV Export</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Gäste</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{guests.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">VIPs</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{vipCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Euro className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Ø Ausgaben</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">€{avgSpend.toFixed(0)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Name, E-Mail oder Telefon..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 focus:border-slate-300 dark:focus:border-slate-600 transition-all"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'new', 'returning', 'vip'] as FilterType[]).map(f => {
            const labels = { all: 'Alle', new: 'Neu', returning: 'Stammgast', vip: 'VIP' };
            return (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  filterType === f
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {labels[f]}
              </button>
            );
          })}

          <div className="relative">
            <button
              onClick={() => setShowSortMenu(s => !s)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{sortLabels[sortField]}</span>
              <SlidersHorizontal className="w-3.5 h-3.5 md:hidden" />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-20 py-1 overflow-hidden">
                {(Object.entries(sortLabels) as [SortField, string][]).map(([f, label]) => (
                  <button
                    key={f}
                    onClick={() => handleSort(f)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                      sortField === f
                        ? 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{label}</span>
                    {sortField === f && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSortMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filteredAndSortedGuests.length} {filteredAndSortedGuests.length === 1 ? 'Gast' : 'Gäste'}
              {searchTerm || filterType !== 'all' ? ' gefunden' : ''}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            ) : filteredAndSortedGuests.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Keine Gäste gefunden</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                  {searchTerm || filterType !== 'all'
                    ? 'Suche oder Filter anpassen'
                    : 'Gästeliste erscheint, sobald Reservierungen vorliegen'}
                </p>
              </div>
            ) : (
              filteredAndSortedGuests.map(guest => (
                <GuestCard
                  key={guest.customer_email}
                  guest={guest}
                  selected={selectedGuest === guest.customer_email}
                  onClick={() => selectGuest(guest.customer_email)}
                />
              ))
            )}
          </div>
        </div>

        {selectedGuestData && (
          <div className="w-80 xl:w-96 flex-shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <GuestDetailPanel
              guest={selectedGuestData}
              reservations={guestReservations[selectedGuestData.customer_email]}
              loading={loadingReservations === selectedGuestData.customer_email}
              onClose={() => setSelectedGuest(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
