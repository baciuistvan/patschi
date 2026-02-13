import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, LayoutGrid, Calendar, Settings as SettingsIcon, Menu, X, Home, Globe, Sun, Moon, Users, ChevronDown, Gift, UserCircle } from 'lucide-react';
import { DashboardHome } from './DashboardHome';
import { FloorPlanManager } from './FloorPlanManager';
import { ReservationManager } from './ReservationManager';
import { Settings } from './Settings';
import { UserManagement } from './UserManagement';
import { GuestManager } from './GuestManager';

type View = 'home' | 'floor-plan' | 'reservations' | 'guests' | 'settings' | 'user-management';

interface DashboardProps {
  onSwitchSystem?: () => void;
}

export function Dashboard({ onSwitchSystem }: DashboardProps) {
  const { adminUser, signOut } = useAuth();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [currentView, setCurrentView] = useState<View>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
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
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
                    <span className="text-white dark:text-slate-900 font-bold text-sm sm:text-lg">P</span>
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{t('app.title')}</h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t('app.subtitle')}</p>
                  </div>
                </div>
                {onSwitchSystem && (
                  <button
                    onClick={onSwitchSystem}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition text-slate-700 dark:text-slate-300 text-xs font-medium"
                    title="Switch to Gift Card System"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Gift Cards</span>
                  </button>
                )}
              </div>

              <div className="hidden lg:flex space-x-1">
                <button
                  onClick={() => setCurrentView('home')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition text-xs font-medium ${
                    currentView === 'home'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{t('nav.home')}</span>
                </button>
                <button
                  onClick={() => setCurrentView('floor-plan')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition text-xs font-medium ${
                    currentView === 'floor-plan'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{t('nav.floor_plan')}</span>
                </button>
                <button
                  onClick={() => setCurrentView('reservations')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition text-xs font-medium ${
                    currentView === 'reservations'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{t('nav.reservations')}</span>
                </button>
                <button
                  onClick={() => setCurrentView('guests')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition text-xs font-medium ${
                    currentView === 'guests'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <UserCircle className="w-3.5 h-3.5" />
                  <span>Guests</span>
                </button>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition text-xs font-medium ${
                    currentView === 'settings'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  <span>{t('nav.settings')}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAccountMenu(!showAccountMenu);
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
                    setShowAccountMenu(false);
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
              <button
                onClick={() => window.open('/crew-simple-install.html', '_blank')}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition flex items-center space-x-1"
                title="Open Crew Dashboard"
              >
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">Crew</span>
              </button>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                title={t('nav.sign_out')}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden py-4 space-y-2">
              <button
                onClick={() => {
                  setCurrentView('home');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg flex items-center space-x-2 transition ${
                  currentView === 'home'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>{t('nav.home')}</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('floor-plan');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg flex items-center space-x-2 transition ${
                  currentView === 'floor-plan'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
                <span>{t('nav.floor_plan')}</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('reservations');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg flex items-center space-x-2 transition ${
                  currentView === 'reservations'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>{t('nav.reservations')}</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('guests');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg flex items-center space-x-2 transition ${
                  currentView === 'guests'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span>Guests</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('settings');
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg flex items-center space-x-2 transition ${
                  currentView === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <SettingsIcon className="w-5 h-5" />
                <span>{t('nav.settings')}</span>
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
        {currentView === 'home' && <DashboardHome />}
        {currentView === 'floor-plan' && <FloorPlanManager />}
        {currentView === 'reservations' && <ReservationManager />}
        {currentView === 'guests' && <GuestManager />}
        {currentView === 'settings' && <Settings />}
        {currentView === 'user-management' && <UserManagement />}
      </main>
    </div>
  );
}
