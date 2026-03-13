import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Gift, Plus, Home, CreditCard, Settings as SettingsIcon, BarChart, DollarSign, Loader2, RefreshCw, LogOut, Sun, Moon, ChevronRight, Calendar, Users, Shield } from 'lucide-react';
import { CreateGiftCard } from './CreateGiftCard';
import { ManageGiftCards } from './ManageGiftCards';
import { SettingsPage } from './SettingsPage';
import { UserManagement } from './UserManagement';
import { supabase } from '../lib/supabase';

type View = 'home' | 'create-card' | 'manage-cards' | 'settings' | 'user-management';

interface GiftCardStats {
  totalValue: number;
  totalCards: number;
  activeCards: number;
  redeemedCards: number;
}

interface RecentGiftCard {
  id: string;
  status: string;
}

interface GiftCardDashboardProps {
  onSwitchSystem?: () => void;
}

const NAV_ITEMS: { view: View; icon: React.ElementType; label: string }[] = [
  { view: 'home', icon: Home, label: 'Übersicht' },
  { view: 'create-card', icon: Plus, label: 'Gutschein erstellen' },
  { view: 'manage-cards', icon: CreditCard, label: 'Gutscheine verwalten' },
  { view: 'settings', icon: SettingsIcon, label: 'Einstellungen' },
];

export function GiftCardDashboard({ onSwitchSystem }: GiftCardDashboardProps) {
  const { adminUser, signOut } = useAuth();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [currentView, setCurrentView] = useState<View>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<GiftCardStats>({
    totalValue: 0,
    totalCards: 0,
    activeCards: 0,
    redeemedCards: 0
  });
  const [recentCards, setRecentCards] = useState<RecentGiftCard[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (currentView === 'home') {
      loadDashboardData();
    }
  }, [currentView]);

  const loadDashboardData = async () => {
    try {
      setLoadingStats(true);
      const { data: cards, error } = await supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (cards) {
        const activeCards = cards.filter(card => card.status === 'active' && card.current_balance > 0);
        const redeemedCards = cards.filter(card => card.status === 'redeemed' || card.current_balance === 0);
        const totalValue = activeCards.reduce((sum, card) => sum + Number(card.current_balance), 0);

        setStats({
          totalValue,
          totalCards: cards.length,
          activeCards: activeCards.length,
          redeemedCards: redeemedCards.length
        });

        setRecentCards(cards);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };


  const activeRate = stats.totalCards > 0 ? Math.round((stats.activeCards / stats.totalCards) * 100) : 0;
  const redeemedRate = stats.totalCards > 0 ? Math.round((stats.redeemedCards / stats.totalCards) * 100) : 0;

  const HomeView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Übersicht</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Gutschein-Performance auf einen Blick</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-150"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setCurrentView('create-card')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all duration-150 shadow-sm shadow-emerald-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Neuer Gutschein
          </button>
        </div>
      </div>

      {loadingStats ? (
        <div className="text-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Lade Dashboard-Daten...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 - Total Value */}
          <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 dark:bg-emerald-400/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center ring-1 ring-emerald-100 dark:ring-emerald-800/50">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full">
                  {stats.activeCards} aktiv
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  €{stats.totalValue.toFixed(2)}
                </p>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Offenes Guthaben</p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-1.5">
                  <span>Ausschöpfungsrate</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-400">{activeRate}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${activeRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 - Total Cards */}
          <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/5 dark:bg-sky-400/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 bg-sky-50 dark:bg-sky-900/40 rounded-2xl flex items-center justify-center ring-1 ring-sky-100 dark:ring-sky-800/50">
                  <CreditCard className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/40 px-2.5 py-1 rounded-full">
                  Gesamt
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {stats.totalCards}
                </p>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Ausgestellte Gutscheine</p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.activeCards}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Aktiv</p>
                  </div>
                  <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.redeemedCards}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Eingelöst</p>
                  </div>
                  <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.totalCards - stats.activeCards - stats.redeemedCards}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Sonstige</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 - Redeemed */}
          <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 dark:bg-amber-400/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 bg-amber-50 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center ring-1 ring-amber-100 dark:ring-amber-800/50">
                  <BarChart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 px-2.5 py-1 rounded-full">
                  {redeemedRate}% Quote
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {stats.redeemedCards}
                </p>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Eingelöste Gutscheine</p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-1.5">
                  <span>Einlösequote</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-400">{redeemedRate}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-700"
                    style={{ width: `${redeemedRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 h-full z-30 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand */}
        <div className={`flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-800 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <Gift className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">Gutscheinsystem</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">Geschenkgutscheine & Voucher</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-0.5">
          {NAV_ITEMS.map(({ view, icon: Icon, label }) => {
            const active = currentView === view;
            return (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
                }`}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon
                  style={{ width: 17, height: 17 }}
                  className={`flex-shrink-0 transition-colors duration-150 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}
                />
                {!sidebarCollapsed && (
                  <span className={`text-sm font-medium ${active ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}`}>
                    {label}
                  </span>
                )}
                {active && !sidebarCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4 mb-2 h-px bg-slate-200 dark:bg-slate-800" />

        {/* Bottom controls */}
        <div className="p-2 pb-4 space-y-0.5">
          {onSwitchSystem && (
            <button
              onClick={onSwitchSystem}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-700 dark:hover:text-sky-400 transition-all duration-150 group ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? 'Reservierungen' : undefined}
            >
              <Calendar style={{ width: 17, height: 17 }} className="flex-shrink-0 text-slate-400 group-hover:text-sky-600 transition-colors" />
              {!sidebarCollapsed && <span className="text-sm font-medium">Reservierungen</span>}
            </button>
          )}
          <button
            onClick={() => window.open('https://patschi.services/crew-simple-install.html', '_blank')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-700 dark:hover:text-sky-400 transition-all duration-150 group ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? 'Crew Dashboard' : undefined}
          >
            <Users style={{ width: 17, height: 17 }} className="flex-shrink-0 text-slate-400 group-hover:text-sky-600 transition-colors" />
            {!sidebarCollapsed && <span className="text-sm font-medium">Crew Dashboard</span>}
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400 transition-all duration-150 group ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          >
            {theme === 'dark'
              ? <Moon style={{ width: 17, height: 17 }} className="flex-shrink-0 text-slate-400 group-hover:text-amber-500 transition-colors" />
              : <Sun style={{ width: 17, height: 17 }} className="flex-shrink-0 text-slate-400 group-hover:text-amber-500 transition-colors" />
            }
            {!sidebarCollapsed && <span className="text-sm font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>

          <div className="mx-2 my-2 h-px bg-slate-200 dark:bg-slate-800" />

          {/* User card */}
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {adminUser?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{adminUser?.full_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield style={{ width: 9, height: 9 }} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate capitalize">{adminUser?.role}</p>
                </div>
              </div>
            )}
          </div>

          <div className={`flex gap-1.5 ${sidebarCollapsed ? 'flex-col' : 'flex-row'} px-1`}>
            <button
              onClick={() => setCurrentView('user-management')}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-150 text-xs font-medium border border-slate-200 dark:border-slate-700"
              title="Admin Einstellungen"
            >
              <SettingsIcon style={{ width: 12, height: 12 }} />
              {!sidebarCollapsed && <span>Admin</span>}
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 text-xs font-medium border border-red-200/60 dark:border-red-800/40"
              title="Abmelden"
            >
              <LogOut style={{ width: 12, height: 12 }} />
              {!sidebarCollapsed && <span>Abmelden</span>}
            </button>
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            className="w-full flex items-center justify-center py-2 mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-150 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title={sidebarCollapsed ? 'Erweitern' : 'Minimieren'}
          >
            <ChevronRight
              style={{ width: 14, height: 14 }}
              className={`transition-transform duration-300 ${sidebarCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center safe-bottom">
        {NAV_ITEMS.slice(0, 4).map(({ view, icon: Icon, label }) => {
          const active = currentView === view;
          return (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition ${
                active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon style={{ width: 20, height: 20 }} />
              <span className="text-[10px] font-medium">{label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          className="flex-1 flex flex-col items-center py-2 gap-0.5 text-slate-400 dark:text-slate-500"
        >
          <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">
              {adminUser?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
            </span>
          </div>
          <span className="text-[10px] font-medium">Mehr</span>
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-2xl p-6 space-y-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">{adminUser?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}</span>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{adminUser?.full_name}</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">{adminUser?.role}</p>
              </div>
            </div>
            <button
              onClick={() => { setCurrentView('settings'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-medium"
            >
              <SettingsIcon style={{ width: 18, height: 18 }} />
              Einstellungen
            </button>
            {onSwitchSystem && (
              <button
                onClick={() => { onSwitchSystem(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-medium"
              >
                <Calendar style={{ width: 18, height: 18 }} />
                Reservierungen
              </button>
            )}
            <button
              onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-medium"
            >
              {theme === 'dark' ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 transition text-sm font-medium"
            >
              <LogOut style={{ width: 18, height: 18 }} />
              Abmelden
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <main className="min-h-screen pb-20 lg:pb-0 px-4 sm:px-6 lg:px-8 py-6">
          {currentView === 'home' && <HomeView />}
          {currentView === 'create-card' && <CreateGiftCard />}
          {currentView === 'manage-cards' && <ManageGiftCards />}
          {currentView === 'settings' && <SettingsPage />}
          {currentView === 'user-management' && <UserManagement />}
        </main>
      </div>
    </div>
  );
}
