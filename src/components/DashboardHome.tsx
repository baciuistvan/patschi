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
  { key: '7d', label: 'Letzte 7 Tage' },
  { key: '30d', label: 'Letzte 30 Tage' },
  { key: '90d', label: 'Letzte 90 Tage' },
  { key: 'thisMonth', label: 'Dieser Monat' },
  { key: 'lastMonth', label: 'Letzter Monat' },
  { key: 'custom', label: 'Benutzerdefiniert' },
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
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:border-blue-500 transition shadow-sm"
      >
        <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <span className="font-medium">{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl flex overflow-hidden">
          <div className="flex flex-col py-2 border-r border-slate-700 min-w-[160px]">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                className={[
                  'text-left px-4 py-2 text-sm transition',
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

export function DashboardHome() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-600 dark:text-slate-400">Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-600 dark:text-slate-400">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{t('dashboard.overview')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {dateFrom.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
            {' – '}
            {dateTo.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <DateRangePicker
          preset={preset}
          from={dateFrom}
          to={dateTo}
          onChange={handleRangeChange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{t('dashboard.total_reservations')}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalReservations}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{t('dashboard.total_guests')}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalGuests}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{t('dashboard.avg_per_booking')}: {stats.averagePartySize} {t('dashboard.per_booking')}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-600/20 rounded-lg flex items-center justify-center">
              <Euro className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{t('dashboard.total_revenue')}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">€{stats.totalRevenue}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{t('dashboard.avg_daily_revenue')}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              €{stats.dailyStats.length > 0
                ? Math.round(stats.totalRevenue / stats.dailyStats.length)
                : 0}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('dashboard.reservation_status')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t('dashboard.confirmed')}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('dashboard.active_bookings')}</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.confirmedReservations}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t('dashboard.pending')}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('dashboard.awaiting_confirmation')}</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-white">{stats.pendingReservations}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t('dashboard.cancelled')}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('dashboard.cancelled_bookings')}</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-white">{stats.cancelledReservations}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-400" />
            {t('dashboard.peak_booking_hours')}
          </h3>
          <div className="space-y-3">
            {stats.peakHours.map((peak) => (
              <div key={peak.hour}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{peak.hour}</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{peak.count} {t('dashboard.bookings')}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${(peak.count / stats.peakHours[0].count) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {stats.peakHours.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('dashboard.daily_breakdown')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.date')}</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.reservations')}</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.dailyStats.map((day) => (
                <tr key={day.date} className="border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition">
                  <td className="py-3 px-4 text-sm text-slate-900 dark:text-white">
                    {new Date(day.date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-slate-700 dark:text-slate-300">
                    {day.reservations}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-semibold text-emerald-400">
                    €{day.revenue}
                  </td>
                </tr>
              ))}
              {stats.dailyStats.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    Keine Reservierungen im ausgewählten Zeitraum
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
