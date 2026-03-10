import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Gift, Plus, Home, CreditCard, Settings as SettingsIcon, BarChart, DollarSign, Loader2, Search, X, Mail, RefreshCw, LogOut, Sun, Moon, ChevronRight, Calendar, Users, Shield, Palette } from 'lucide-react';
import { GiftCardTemplates } from './GiftCardTemplates';
import { CreateGiftCard } from './CreateGiftCard';
import { ManageGiftCards } from './ManageGiftCards';
import { SettingsPage } from './SettingsPage';
import { UserManagement } from './UserManagement';
import { supabase } from '../lib/supabase';

type View = 'home' | 'create-card' | 'manage-cards' | 'templates' | 'settings' | 'user-management';
type StatusFilter = 'all' | 'active' | 'redeemed' | 'expired' | 'cancelled';

interface GiftCardStats {
  totalValue: number;
  totalCards: number;
  activeCards: number;
  redeemedCards: number;
}

interface RecentGiftCard {
  id: string;
  code: string;
  original_amount: number;
  current_balance: number;
  recipient_name: string;
  recipient_email: string;
  status: string;
  created_at: string;
}

interface GiftCardDashboardProps {
  onSwitchSystem?: () => void;
}

const NAV_ITEMS: { view: View; icon: React.ElementType; label: string }[] = [
  { view: 'home', icon: Home, label: 'Übersicht' },
  { view: 'create-card', icon: Plus, label: 'Gutschein erstellen' },
  { view: 'manage-cards', icon: CreditCard, label: 'Gutscheine verwalten' },
  { view: 'templates', icon: Palette, label: 'Vorlagen' },
  { view: 'settings', icon: SettingsIcon, label: 'Einstellungen' },
];

export function GiftCardDashboard({ onSwitchSystem }: GiftCardDashboardProps) {
  const { adminUser, signOut } = useAuth();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [currentView, setCurrentView] = useState<View>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-l-emerald-500';
      case 'redeemed': return 'border-l-sky-500';
      case 'expired': return 'border-l-red-400';
      case 'cancelled': return 'border-l-red-500';
      default: return 'border-l-slate-300 dark:border-l-slate-600';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/40';
      case 'redeemed': return 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-700/40';
      case 'expired': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700/40';
      case 'cancelled': return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700/40';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'redeemed': return 'Eingelöst';
      case 'expired': return 'Abgelaufen';
      case 'cancelled': return 'Storniert';
      default: return status;
    }
  };

  const getFilteredCards = () => {
    let filtered = recentCards;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(card => card.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(card =>
        card.code.toLowerCase().includes(q) ||
        card.recipient_name?.toLowerCase().includes(q) ||
        card.recipient_email?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Alle' },
    { key: 'active', label: 'Aktiv' },
    { key: 'redeemed', label: 'Eingelöst' },
    { key: 'expired', label: 'Abgelaufen' },
    { key: 'cancelled', label: 'Storniert' },
  ];

  const filteredCards = getFilteredCards();

  const HomeView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-600 dark:text-slate-300 tracking-tight">Gutschein-Dashboard</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {stats.totalCards > 0 && <span className="text-slate-600 dark:text-slate-400 font-medium">{stats.totalCards} </span>}
            Gutscheine
          </p>
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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all duration-150 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Neuer Gutschein
          </button>
        </div>
      </div>

      {loadingStats ? (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Lade Dashboard-Daten...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-md hover:shadow-xl border border-slate-200/80 dark:border-slate-700/60 p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl" />
              <div className="flex items-center justify-between mb-3 pl-1">
                <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">Gesamtwert</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white pl-1">€{stats.totalValue.toFixed(2)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 pl-1">Aktive Gutscheine</p>
            </div>

            <div className="relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-md hover:shadow-xl border border-slate-200/80 dark:border-slate-700/60 p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 rounded-l-2xl" />
              <div className="flex items-center justify-between mb-3 pl-1">
                <div className="w-9 h-9 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                </div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">Gutscheine Gesamt</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white pl-1">{stats.totalCards}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 pl-1">Ausgestellte Gutscheine</p>
            </div>

            <div className="relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-md hover:shadow-xl border border-slate-200/80 dark:border-slate-700/60 p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-2xl" />
              <div className="flex items-center justify-between mb-3 pl-1">
                <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <BarChart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">Eingelöst</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white pl-1">{stats.redeemedCards}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 pl-1">Verwendete Gutscheine</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Code, Name oder E-Mail..."
                className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-slate-900 dark:focus:ring-white/20 focus:border-transparent transition-all duration-150 shadow-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all duration-150">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {statusTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-200 whitespace-nowrap border ${
                    statusFilter === tab.key
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md scale-[1.03]'
                      : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {recentCards.length === 0 ? (
            <div className="py-16 text-center">
              <Gift className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-sm text-slate-400 mb-3">Noch keine Gutscheine erstellt</p>
              <button
                onClick={() => setCurrentView('create-card')}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-all duration-150 underline underline-offset-2"
              >
                Ersten Gutschein erstellen
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredCards.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-400">Keine Gutscheine gefunden</p>
                </div>
              ) : (
                filteredCards.map(card => (
                  <div
                    key={card.id}
                    className={`group relative bg-gradient-to-r from-white to-slate-50/50 dark:from-slate-800/90 dark:to-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 border-l-4 ${getStatusBorderColor(card.status)} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default`}
                  >
                    <div className="flex items-center gap-4 px-4 py-3.5">
                      <div className="flex-shrink-0 w-12 h-12 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700/60 rounded-xl text-center">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-none">
                          {new Date(card.created_at).toLocaleDateString('de-DE', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-slate-700 dark:text-slate-200 leading-tight">
                          {new Date(card.created_at).getDate()}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-none">
                          {new Date(card.created_at).getFullYear()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white tracking-wider">{card.code}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeColor(card.status)}`}>
                            {getStatusText(card.status)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {card.recipient_name && (
                            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium truncate max-w-[160px]">{card.recipient_name}</span>
                          )}
                          {card.recipient_email && (
                            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              {card.recipient_email}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <p className="text-xl font-bold text-slate-900 dark:text-white">€{Number(card.current_balance).toFixed(2)}</p>
                        {card.original_amount !== card.current_balance && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 line-through">€{Number(card.original_amount).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
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
          {currentView === 'templates' && <GiftCardTemplates />}
          {currentView === 'settings' && <SettingsPage />}
          {currentView === 'user-management' && <UserManagement />}
        </main>
      </div>
    </div>
  );
}
