import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Users, Calendar, Euro, Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Stats {
  totalReservations: number;
  totalGuests: number;
  totalRevenue: number;
  confirmedReservations: number;
  pendingReservations: number;
  cancelledReservations: number;
  averagePartySize: number;
  peakHours: { hour: string; count: number }[];
  dailyStats: { date: string; reservations: number; revenue: number }[];
}

type PresetKey = '7d' | '30d' | '90d' | 'thisMonth' | 'lastMonth' | 'custom';

interface Preset {
  key: PresetKey;
  label: string;
}

const PRESETS: Preset[] = [
  { key: '7d', label: '7 Tage' },
  { key: '30d', label: '30 Tage' },
  { key: '90d', label: '90 Tage' },
  { key: 'thisMonth', label: 'Dieser Monat' },
  { key: 'lastMonth', label: 'Letzter Monat' },
  { key: 'custom', label: 'Eigener Zeitraum' },
];

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPresetRange(key: PresetKey): { from: Date; to: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = new Date(today);

  if (key === '7d') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from, to };
  }
  if (key === '30d') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from, to };
  }
  if (key === '90d') {
    const from = new Date(today);
    from.setDate(from.getDate() - 89);
    return { from, to };
  }
  if (key === 'thisMonth') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from, to };
  }
  if (key === 'lastMonth') {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastTo = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from, to: lastTo };
  }
  return { from: new Date(today.getTime() - 29 * 86400000), to };
}

function formatRangeLabel(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return `${from.toLocaleDateString('de-DE', opts)} – ${to.toLocaleDateString('de-DE', opts)}`;
}

interface MiniCalendarProps {
  year: number;
  month: number;
  selectingFrom: boolean;
  rangeFrom: Date | null;
  rangeTo: Date | null;
  hovered: Date | null;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}

function MiniCalendar({ year, month, rangeFrom, rangeTo, hovered, onDayClick, onDayHover, onPrev, onNext }: MiniCalendarProps) {
  const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  function isInRange(d: Date) {
    const end = rangeTo || hovered;
    if (!rangeFrom || !end) return false;
    const lo = rangeFrom <= end ? rangeFrom : end;
    const hi = rangeFrom <= end ? end : rangeFrom;
    return d > lo && d < hi;
  }

  function isStart(d: Date) {
    return rangeFrom ? formatDateLocal(d) === formatDateLocal(rangeFrom) : false;
  }

  function isEnd(d: Date) {
    const end = rangeTo || hovered;
    return end ? formatDateLocal(d) === formatDateLocal(end) : false;
  }

  const today = formatDateLocal(new Date());

  return (
    <div className="w-64">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-white">{monthNames[month]} {year}</span>
        <button onClick={onNext} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
          <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = formatDateLocal(d);
          const inRange = isInRange(d);
          const start = isStart(d);
          const end = isEnd(d);
          const isToday = ds === today;
          return (
            <button
              key={ds}
              onClick={() => onDayClick(d)}
              onMouseEnter={() => onDayHover(d)}
              className={[
                'text-xs py-1.5 rounded transition text-center w-full',
                start || end
                  ? 'bg-blue-500 text-white font-bold'
                  : inRange
                  ? 'bg-blue-500/20 text-blue-300'
                  : isToday
                  ? 'border border-blue-500/50 text-white'
                  : 'text-slate-300 hover:bg-slate-700',
              ].join(' ')}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DateRangePickerProps {
  preset: PresetKey;
  from: Date;
  to: Date;
  onChange: (preset: PresetKey, from: Date, to: Date) => void;
}

function DateRangePicker({ preset, from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey>(preset);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectingFrom, setSelectingFrom] = useState(true);
  const [rangeFrom, setRangeFrom] = useState<Date | null>(null);
  const [rangeTo, setRangeTo] = useState<Date | null>(null);
  const [hovered, setHovered] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handlePreset(key: PresetKey) {
    setActivePreset(key);
    if (key !== 'custom') {
      const { from: f, to: t } = getPresetRange(key);
      onChange(key, f, t);
      setOpen(false);
    } else {
      setRangeFrom(null);
      setRangeTo(null);
      setSelectingFrom(true);
    }
  }

  function handleDayClick(d: Date) {
    if (selectingFrom) {
      setRangeFrom(d);
      setRangeTo(null);
      setSelectingFrom(false);
    } else {
      let f = rangeFrom!;
      let t = d;
      if (t < f) { [f, t] = [t, f]; }
      setRangeFrom(f);
      setRangeTo(t);
      setSelectingFrom(true);
      onChange('custom', f, t);
      setOpen(false);
    }
  }

  const currentLabel = activePreset !== 'custom'
    ? PRESETS.find(p => p.key === activePreset)?.label ?? ''
    : formatRangeLabel(from, to);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500 transition shadow-sm font-medium"
      >
        <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span>{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-50 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl flex overflow-hidden">
          <div className="flex flex-col py-2 border-r border-slate-700 min-w-[160px]">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                className={[
                  'text-left px-4 py-2.5 text-sm transition',
                  activePreset === p.key
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-700',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>

          {activePreset === 'custom' && (
            <div className="p-4">
              <p className="text-xs text-slate-400 mb-3">
                {selectingFrom ? 'Startdatum wählen' : 'Enddatum wählen'}
              </p>
              <MiniCalendar
                year={calYear}
                month={calMonth}
                selectingFrom={selectingFrom}
                rangeFrom={rangeFrom}
                rangeTo={rangeTo}
                hovered={hovered}
                onDayClick={handleDayClick}
                onDayHover={setHovered}
                onPrev={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                  else setCalMonth(m => m - 1);
                }}
                onNext={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                  else setCalMonth(m => m + 1);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'emerald' | 'orange';
}

function StatCard({ label, value, sub, icon: Icon, color }: StatCardProps) {
  const colorMap = {
    blue: {
      iconBg: 'bg-blue-500',
      iconRing: 'ring-blue-400/30',
      icon: 'text-white',
      accent: 'text-blue-500 dark:text-blue-400',
      bar: 'from-blue-500/10 to-transparent',
    },
    green: {
      iconBg: 'bg-green-500',
      iconRing: 'ring-green-400/30',
      icon: 'text-white',
      accent: 'text-green-500 dark:text-green-400',
      bar: 'from-green-500/10 to-transparent',
    },
    emerald: {
      iconBg: 'bg-emerald-500',
      iconRing: 'ring-emerald-400/30',
      icon: 'text-white',
      accent: 'text-emerald-500 dark:text-emerald-400',
      bar: 'from-emerald-500/10 to-transparent',
    },
    orange: {
      iconBg: 'bg-orange-500',
      iconRing: 'ring-orange-400/30',
      icon: 'text-white',
      accent: 'text-orange-500 dark:text-orange-400',
      bar: 'from-orange-500/10 to-transparent',
    },
  };
  const c = colorMap[color];

  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
      <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${c.bar} pointer-events-none`} />
      <div className="relative flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-11 h-11 ${c.iconBg} rounded-xl flex items-center justify-center ring-4 ${c.iconRing} shadow-sm flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
        </div>
        <p className={`text-xs font-bold uppercase tracking-widest ${c.accent} mb-2`}>{label}</p>
        <p className="text-4xl font-black text-slate-900 dark:text-white leading-none tracking-tight tabular-nums">{value}</p>
        {sub && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2.5 font-medium">{sub}</p>
        )}
      </div>
    </div>
  );
}

export function DashboardHome() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyOpen, setDailyOpen] = useState(false);

  const defaultRange = getPresetRange('30d');
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [dateFrom, setDateFrom] = useState<Date>(defaultRange.from);
  const [dateTo, setDateTo] = useState<Date>(defaultRange.to);

  useEffect(() => {
    loadStats(dateFrom, dateTo);
  }, [dateFrom, dateTo]);

  const loadStats = async (from: Date, to: Date) => {
    setLoading(true);

    const { data: reservations } = await supabase
      .from('reservations')
      .select('*')
      .gte('reservation_date', formatDateLocal(from))
      .lte('reservation_date', formatDateLocal(to))
      .order('reservation_date', { ascending: true });

    if (reservations) {
      const totalReservations = reservations.length;
      const totalGuests = reservations.reduce((sum, r) => sum + r.party_size, 0);
      const totalRevenue = reservations
        .filter(r => r.payment_status === 'paid')
        .reduce((sum, r) => sum + (r.payment_amount || 0), 0);

      const confirmedReservations = reservations.filter(r => r.status === 'confirmed').length;
      const pendingReservations = reservations.filter(r => r.status === 'pending').length;
      const cancelledReservations = reservations.filter(r => r.status === 'cancelled').length;

      const averagePartySize = totalReservations > 0
        ? Math.round((totalGuests / totalReservations) * 10) / 10
        : 0;

      const hourCounts: { [key: string]: number } = {};
      reservations.forEach(r => {
        const hour = r.reservation_time.substring(0, 5);
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const peakHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const dailyMap: { [key: string]: { reservations: number; revenue: number } } = {};
      reservations.forEach(r => {
        if (!dailyMap[r.reservation_date]) {
          dailyMap[r.reservation_date] = { reservations: 0, revenue: 0 };
        }
        dailyMap[r.reservation_date].reservations += 1;
        if (r.payment_status === 'paid') {
          dailyMap[r.reservation_date].revenue += r.payment_amount || 0;
        }
      });

      const dailyStats = Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setStats({
        totalReservations,
        totalGuests,
        totalRevenue,
        confirmedReservations,
        pendingReservations,
        cancelledReservations,
        averagePartySize,
        peakHours,
        dailyStats,
      });
    }

    setLoading(false);
  };

  function handleRangeChange(newPreset: PresetKey, from: Date, to: Date) {
    setPreset(newPreset);
    setDateFrom(from);
    setDateTo(to);
  }

  const today = new Date();
  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  })();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Statistiken werden geladen…</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-500 dark:text-slate-400">Keine Daten verfügbar</p>
      </div>
    );
  }

  const maxPeak = stats.peakHours[0]?.count ?? 1;
  const statusTotal = stats.confirmedReservations + stats.pendingReservations + stats.cancelledReservations || 1;

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-8 px-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{greeting}</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mt-0.5">{t('dashboard.overview')}</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            {dateFrom.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
            {' – '}
            {dateTo.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <DateRangePicker preset={preset} from={dateFrom} to={dateTo} onChange={handleRangeChange} />
      </div>

      {/* Stat Cards */}
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={t('dashboard.total_reservations')}
            value={stats.totalReservations}
            icon={Calendar}
            color="blue"
          />
          <StatCard
            label={t('dashboard.total_guests')}
            value={stats.totalGuests}
            sub={`Ø ${stats.averagePartySize} ${t('dashboard.per_booking')}`}
            icon={Users}
            color="green"
          />
          <StatCard
            label={t('dashboard.total_revenue')}
            value={`€${stats.totalRevenue.toLocaleString('de-DE')}`}
            icon={Euro}
            color="emerald"
          />
          <StatCard
            label={t('dashboard.avg_daily_revenue')}
            value={`€${stats.dailyStats.length > 0 ? Math.round(stats.totalRevenue / stats.dailyStats.length).toLocaleString('de-DE') : 0}`}
            icon={TrendingUp}
            color="orange"
          />
        </div>
      </div>

      {/* Status + Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">{t('dashboard.reservation_status')}</h3>
          <div className="space-y-5">
            {[
              {
                label: t('dashboard.confirmed'),
                sub: t('dashboard.active_bookings'),
                count: stats.confirmedReservations,
                icon: CheckCircle,
                color: 'text-green-600 dark:text-green-400',
                bg: 'bg-green-50 dark:bg-green-900/20',
                bar: 'bg-green-500',
              },
              {
                label: t('dashboard.pending'),
                sub: t('dashboard.awaiting_confirmation'),
                count: stats.pendingReservations,
                icon: AlertCircle,
                color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-50 dark:bg-amber-900/20',
                bar: 'bg-amber-500',
              },
              {
                label: t('dashboard.cancelled'),
                sub: t('dashboard.cancelled_bookings'),
                count: stats.cancelledReservations,
                icon: XCircle,
                color: 'text-red-600 dark:text-red-400',
                bg: 'bg-red-50 dark:bg-red-900/20',
                bar: 'bg-red-500',
              },
            ].map(({ label, sub, count, icon: Icon, color, bg, bar }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
                    </div>
                  </div>
                  <span className={`text-2xl font-black ${color}`}>{count}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={`${bar} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${(count / statusTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak hours */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            {t('dashboard.peak_booking_hours')}
          </h3>
          {stats.peakHours.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-slate-400">Keine Daten verfügbar</div>
          ) : (
            <div className="space-y-4">
              {stats.peakHours.map((peak, idx) => (
                <div key={peak.hour} className="flex items-center gap-4">
                  <span className="text-sm font-mono font-bold text-slate-600 dark:text-slate-300 w-12 text-right flex-shrink-0">{peak.hour}</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ${
                        idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-blue-500' : idx === 2 ? 'bg-blue-400' : 'bg-blue-300 dark:bg-blue-600/60'
                      }`}
                      style={{ width: `${(peak.count / maxPeak) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-16 text-right flex-shrink-0">
                    {peak.count} {t('dashboard.bookings')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily breakdown */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <button
          onClick={() => setDailyOpen(o => !o)}
          className="w-full flex items-center justify-between px-8 py-5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.daily_breakdown')}</h3>
            {stats.dailyStats.length > 0 && (
              <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full">
                {stats.dailyStats.length} Tage
              </span>
            )}
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${dailyOpen ? 'rotate-180' : ''}`} />
        </button>

        {dailyOpen && (
          <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40">
                  <th className="text-left py-4 px-8 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('dashboard.date')}</th>
                  <th className="text-right py-4 px-8 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('dashboard.reservations')}</th>
                  <th className="text-right py-4 px-8 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('dashboard.revenue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {stats.dailyStats.map((day, idx) => (
                  <tr key={day.date} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition ${idx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-900/20'}`}>
                    <td className="py-4 px-8 text-sm font-semibold text-slate-900 dark:text-white">
                      {new Date(day.date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-8 text-sm text-right text-slate-600 dark:text-slate-300 font-semibold">
                      {day.reservations}
                    </td>
                    <td className="py-4 px-8 text-sm text-right font-bold text-emerald-600 dark:text-emerald-400">
                      €{day.revenue.toLocaleString('de-DE')}
                    </td>
                  </tr>
                ))}
                {stats.dailyStats.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-sm text-slate-400">
                      Keine Reservierungen im ausgewählten Zeitraum
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
