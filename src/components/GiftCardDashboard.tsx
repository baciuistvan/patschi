import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Gift, Plus, Menu, X, Home, Globe, Sun, Moon, ChevronDown, Users, CreditCard, Palette, Settings, BarChart, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { GiftCardTemplates } from './GiftCardTemplates';
import { CreateGiftCard } from './CreateGiftCard';
import { ManageGiftCards } from './ManageGiftCards';
import { SettingsPage } from './SettingsPage';
import { supabase } from '../lib/supabase';

type View = 'home' | 'create-card' | 'manage-cards' | 'templates' | 'settings' | 'user-management';

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

export function GiftCardDashboard({ onSwitchSystem }: GiftCardDashboardProps) {
  const { adminUser, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [currentView, setCurrentView] = useState<View>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
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

      // Load all gift cards
      const { data: cards, error } = await supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (cards) {
        // Calculate statistics
        const activeCards = cards.filter(card => card.status === 'active' && card.current_balance > 0);
        const redeemedCards = cards.filter(card => card.status === 'redeemed' || card.current_balance === 0);
        const totalValue = activeCards.reduce((sum, card) => sum + Number(card.current_balance), 0);

        setStats({
          totalValue,
          totalCards: cards.length,
          activeCards: activeCards.length,
          redeemedCards: redeemedCards.length
        });

        // Get recent cards (last 5)
        setRecentCards(cards.slice(0, 5));
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'redeemed':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'expired':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktiv';
      case 'redeemed':
        return 'Eingelöst';
      case 'expired':
        return 'Abgelaufen';
      case 'cancelled':
        return 'Storniert';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 sm:space-x-8">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <Gift className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{t('gift_card.title')}</h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t('gift_card.subtitle')}</p>
                  </div>
                </div>
                {onSwitchSystem && (
                  <button
                    onClick={onSwitchSystem}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition text-slate-700 dark:text-slate-300 text-xs font-medium"
                    title="Switch to Table Reservation System"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{t('nav.reservations')}</span>
                  </button>
                )}
              </div>

              <div className="hidden md:flex space-x-1">
                <button
                  onClick={() => setCurrentView('home')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition text-xs font-medium ${
                    currentView === 'home'
                      ? 'bg-green-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{t('gift_card.home')}</span>
                </button>
                <button
                  onClick={() => setCurrentView('create-card')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition text-xs font-medium ${
                    currentView === 'create-card'
                      ? 'bg-green-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('gift_card.create_card')}</span>
                </button>
                <button
                  onClick={() => setCurrentView('manage-cards')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition text-xs font-medium ${
                    currentView === 'manage-cards'
                      ? 'bg-green-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{t('gift_card.manage_cards')}</span>
                </button>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition text-xs font-medium ${
                    currentView === 'settings'
                      ? 'bg-green-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{t('gift_card.settings')}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAccountMenu(!showAccountMenu);
                    setShowSettingsMenu(false);
                    setShowLanguageMenu(false);
                    setShowThemeMenu(false);
                  }}
                  className="hidden sm:flex items-center space-x-1.5 text-right hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg px-2.5 py-1.5 transition"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">{adminUser?.full_name}</p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400">{adminUser?.role}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </button>
                {showAccountMenu && (
                  <div className="absolute right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-48">
                    <button
                      onClick={() => {
                        setCurrentView('user-management');
                        setShowAccountMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center space-x-2 text-slate-700 dark:text-slate-300"
                    >
                      <Users className="w-4 h-4" />
                      <span>Admin Settings</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowThemeMenu(!showThemeMenu);
                    setShowLanguageMenu(false);
                    setShowAccountMenu(false);
                    setShowSettingsMenu(false);
                  }}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                  title="Theme"
                >
                  {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </button>
                {showThemeMenu && (
                  <div className="absolute right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-32">
                    <button
                      onClick={() => {
                        setTheme('light');
                        setShowThemeMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center space-x-2 ${
                        theme === 'light' ? 'text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-700' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => {
                        setTheme('dark');
                        setShowThemeMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition flex items-center space-x-2 ${
                        theme === 'dark' ? 'text-blue-400 bg-slate-700' : 'text-slate-300'
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      <span>Dark</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowLanguageMenu(!showLanguageMenu);
                    setShowThemeMenu(false);
                    setShowAccountMenu(false);
                    setShowSettingsMenu(false);
                  }}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition flex items-center space-x-1"
                  title="Language"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{language.toUpperCase()}</span>
                </button>
                {showLanguageMenu && (
                  <div className="absolute right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-32">
                    <button
                      onClick={() => {
                        setLanguage('en');
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition ${
                        language === 'en' ? 'text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-700' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('de');
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition ${
                        language === 'de' ? 'text-blue-600 dark:text-blue-400 bg-slate-100 dark:bg-slate-700' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Deutsch
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                title={t('nav.sign_out')}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-2">
              <button
                onClick={() => {
                  setCurrentView('home');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg flex items-center space-x-2 transition ${
                  currentView === 'home'
                    ? 'bg-green-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>{t('gift_card.home')}</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('create-card');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg flex items-center space-x-2 transition ${
                  currentView === 'create-card'
                    ? 'bg-green-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span>{t('gift_card.create_card')}</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('manage-cards');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg flex items-center space-x-2 transition ${
                  currentView === 'manage-cards'
                    ? 'bg-green-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>{t('gift_card.manage_cards')}</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('settings');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg flex items-center space-x-2 transition ${
                  currentView === 'settings'
                    ? 'bg-green-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>{t('gift_card.settings')}</span>
              </button>
              <div className="sm:hidden border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                <p className="text-sm font-medium text-slate-900 dark:text-white px-4">{adminUser?.full_name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 px-4">{adminUser?.role}</p>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {currentView === 'home' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Gift className="w-8 h-8 text-green-600" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('gift_card.dashboard')}</h2>
                  <p className="text-slate-600 dark:text-slate-400">{t('gift_card.overview')}</p>
                </div>
              </div>
            </div>

            {loadingStats ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Lade Dashboard-Daten...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <DollarSign className="w-8 h-8 text-green-600" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{t('gift_card.total_value')}</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">€{stats.totalValue.toFixed(2)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('gift_card.active_gift_cards')}</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <CreditCard className="w-8 h-8 text-blue-600" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{t('gift_card.total_cards')}</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalCards}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('gift_card.issued_cards')}</p>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <BarChart className="w-8 h-8 text-purple-600" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{t('gift_card.redeemed')}</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.redeemedCards}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('gift_card.cards_used')}</p>
                  </div>
                </div>

                {recentCards.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Aktuelle Gutscheine</h3>
                      <button
                        onClick={() => setCurrentView('manage-cards')}
                        className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
                      >
                        Alle anzeigen →
                      </button>
                    </div>
                    <div className="space-y-4">
                      {recentCards.map((card) => (
                        <div
                          key={card.id}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-1">
                              <p className="font-mono font-bold text-slate-900 dark:text-white">{card.code}</p>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeColor(card.status)}`}>
                                {getStatusText(card.status)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{card.recipient_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">{card.recipient_email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-slate-900 dark:text-white">€{Number(card.current_balance).toFixed(2)}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(card.created_at).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recentCards.length === 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <Gift className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Noch keine Gutscheine erstellt
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      Erstellen Sie Ihren ersten Gutschein, um loszulegen
                    </p>
                    <button
                      onClick={() => setCurrentView('create-card')}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium inline-flex items-center space-x-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Ersten Gutschein erstellen</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {currentView === 'create-card' && <CreateGiftCard />}
        {currentView === 'manage-cards' && <ManageGiftCards />}
        {currentView === 'templates' && <GiftCardTemplates />}
        {currentView === 'settings' && <SettingsPage />}
        {currentView === 'user-management' && <UserManagement />}
      </main>
    </div>
  );
}
