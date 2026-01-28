import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Users, Calendar, Euro, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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

export function DashboardHome() {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadStats = async () => {
    setLoading(true);

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const dateFilter = formatDateLocal(tenDaysAgo);

    const { data: reservations } = await supabase
      .from('reservations')
      .select('*')
      .gte('reservation_date', dateFilter)
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
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('dashboard.overview')}</h2>
        <p className="text-slate-600 dark:text-slate-400">{t('dashboard.last_10_days')}</p>
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
            {stats.peakHours.map((peak, index) => (
              <div key={peak.hour}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{peak.hour}</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{peak.count} {t('dashboard.bookings')}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(peak.count / stats.peakHours[0].count) * 100}%`
                    }}
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
                    No reservations in the last 10 days
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
