import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Calendar, Settings as SettingsIcon, Home, Sun, Moon, Users, Gift, CircleUser as UserCircle, ChevronRight } from 'lucide-react';
import { DashboardHome } from './DashboardHome';
import { ReservationManager } from './ReservationManager';
import { Settings } from './Settings';
import { UserManagement } from './UserManagement';
import { GuestManager } from './GuestManager';

type View = 'home' | 'reservations' | 'guests' | 'settings' | 'user-management';

interface DashboardProps {
  onSwitchSystem?: () => void;
}

const NAV_ITEMS: { view: View; icon: React.ElementType; labelKey: string }[] = [
  { view: 'home', icon: Home, labelKey: 'nav.home' },
  { view: 'reservations', icon: Calendar, labelKey: 'nav.reservations' },
  { view: 'guests', icon: UserCircle, labelKey: 'nav.guests' },
  { view: 'settings', icon: SettingsIcon, labelKey: 'nav.settings' },
];

export function Dashboard({ onSwitchSystem }: DashboardProps) {
  const { adminUser, signOut } = useAuth();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [currentView, setCurrentView] = useState<View>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navLabel = (key: string) => {
    const map: Record<string, string> = {
      'nav.home': 'Übersicht',
      'nav.reservations': 'Reservierungen',
      'nav.guests': 'Gäste',
      'nav.settings': 'Einstellungen',
    };
    return map[key] ?? t(key);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 h-full z-30 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-80'
        }`}
      >
        {/* Brand */}
        <div className={`flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-800 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white dark:text-slate-900 font-bold text-base">P</span>
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">{t('app.title')}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{t('app.subtitle')}</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {NAV_ITEMS.map(({ view, icon: Icon, labelKey }) => {
            const active = currentView === view;
            return (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={sidebarCollapsed ? navLabel(labelKey) : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 dark:bg-blue-400 rounded-r-full" />
                )}
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} style={{ width: 18, height: 18 }} />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium">{navLabel(labelKey)}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-1">
          {onSwitchSystem && !sidebarCollapsed && (
            <button
              onClick={onSwitchSystem}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition text-sm"
            >
              <Gift style={{ width: 18, height: 18 }} className="flex-shrink-0" />
              <span className="font-medium">Gift Cards</span>
            </button>
          )}
          <button
            onClick={() => window.open('https://patschi.services/crew-simple-install.html', '_blank')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition text-sm"
            title={sidebarCollapsed ? 'Crew' : undefined}
          >
            <Users style={{ width: 18, height: 18 }} className="flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Crew</span>}
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition text-sm"
            title={sidebarCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          >
            {theme === 'dark' ? <Moon style={{ width: 18, height: 18 }} className="flex-shrink-0" /> : <Sun style={{ width: 18, height: 18 }} className="flex-shrink-0" />}
            {!sidebarCollapsed && <span className="font-medium">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>

          {/* User section */}
          <div className={`flex items-center gap-2 px-3 py-2 mt-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {adminUser?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
              </span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{adminUser?.full_name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{adminUser?.role}</p>
              </div>
            )}
          </div>

          <div className={`flex gap-1 ${sidebarCollapsed ? 'flex-col' : 'flex-row'}`}>
            <button
              onClick={() => setCurrentView('user-management')}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs"
              title="Admin Einstellungen"
            >
              <SettingsIcon style={{ width: 14, height: 14 }} />
              {!sidebarCollapsed && <span>Admin</span>}
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-xs"
              title={t('nav.sign_out')}
            >
              <LogOut style={{ width: 14, height: 14 }} />
              {!sidebarCollapsed && <span>Abmelden</span>}
            </button>
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            className="w-full flex items-center justify-center py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            title={sidebarCollapsed ? 'Erweitern' : 'Minimieren'}
          >
            <ChevronRight
              style={{ width: 16, height: 16 }}
              className={`transition-transform duration-300 ${sidebarCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center safe-bottom">
        {NAV_ITEMS.map(({ view, icon: Icon, labelKey }) => {
          const active = currentView === view;
          return (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition ${
                active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-500'
              }`}
            >
              <Icon style={{ width: 20, height: 20 }} />
              <span className="text-[10px] font-medium">{navLabel(labelKey).split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          className="flex-1 flex flex-col items-center py-2 gap-0.5 text-slate-500 dark:text-slate-500"
        >
          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
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
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-2xl p-6 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{adminUser?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}</span>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{adminUser?.full_name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{adminUser?.role}</p>
              </div>
            </div>
            {onSwitchSystem && (
              <button
                onClick={() => { onSwitchSystem(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-medium"
              >
                <Gift style={{ width: 18, height: 18 }} />
                Gift Cards
              </button>
            )}
            <button
              onClick={() => { window.open('https://patschi.services/crew-simple-install.html', '_blank'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-medium"
            >
              <Users style={{ width: 18, height: 18 }} />
              Crew Dashboard
            </button>
            <button
              onClick={() => { setCurrentView('user-management'); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-sm font-medium"
            >
              <SettingsIcon style={{ width: 18, height: 18 }} />
              Admin Einstellungen
            </button>
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
      <div className={`flex-1 min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-80'}`}>
        <main className="min-h-screen pb-20 lg:pb-0 px-4 sm:px-6 lg:px-8 py-6">
          {currentView === 'home' && <DashboardHome />}
          {currentView === 'reservations' && <ReservationManager />}
          {currentView === 'guests' && <GuestManager />}
          {currentView === 'settings' && <Settings />}
          {currentView === 'user-management' && <UserManagement />}
        </main>
      </div>
    </div>
  );
}
