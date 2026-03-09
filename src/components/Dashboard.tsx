import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Calendar, Settings as SettingsIcon, Home, Sun, Moon, Users, Gift, CircleUser as UserCircle, ChevronRight, Sparkles, Shield } from 'lucide-react';
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
        className={`hidden lg:flex flex-col fixed top-0 left-0 h-full z-30 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 shadow-sm ${
          sidebarCollapsed ? 'w-16' : 'w-80'
        }`}
      >
        {/* Brand */}
        <div className={`relative flex items-center h-20 px-5 overflow-hidden ${sidebarCollapsed ? 'justify-center' : 'gap-4'}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-800 dark:to-slate-900" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 60%)' }} />
          <div className="relative w-11 h-11 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          {!sidebarCollapsed && (
            <div className="relative overflow-hidden">
              <p className="text-base font-bold text-white leading-tight truncate">{t('app.title')}</p>
              <p className="text-xs text-slate-300/80 truncate">{t('app.subtitle')}</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-6 space-y-0.5 px-3 overflow-y-auto">
          {!sidebarCollapsed && (
            <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Navigation</p>
          )}
          {NAV_ITEMS.map(({ view, icon: Icon, labelKey }) => {
            const active = currentView === view;
            return (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-800 dark:hover:text-slate-100'
                }`}
                title={sidebarCollapsed ? navLabel(labelKey) : undefined}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all duration-200 ${
                  active
                    ? 'bg-white/20'
                    : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                }`}>
                  <Icon style={{ width: 16, height: 16 }} className={active ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'} />
                </div>
                {!sidebarCollapsed && (
                  <span className={`text-sm font-semibold ${active ? 'text-white' : ''}`}>{navLabel(labelKey)}</span>
                )}
                {active && !sidebarCollapsed && (
                  <Sparkles style={{ width: 13, height: 13 }} className="ml-auto text-white/50" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Divider with label */}
        {!sidebarCollapsed && (
          <div className="px-6 mb-2">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Tools</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="p-3 pt-1 space-y-0.5">
          {onSwitchSystem && (
            <button
              onClick={onSwitchSystem}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? 'Gift Cards' : undefined}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-all duration-200">
                <Gift style={{ width: 16, height: 16 }} />
              </div>
              {!sidebarCollapsed && <span className="text-sm font-semibold">Gift Cards</span>}
            </button>
          )}
          <button
            onClick={() => window.open('https://patschi.services/crew-simple-install.html', '_blank')}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-700 dark:hover:text-sky-400 transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? 'Crew' : undefined}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 bg-slate-100 dark:bg-slate-800 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/30 transition-all duration-200">
              <Users style={{ width: 16, height: 16 }} />
            </div>
            {!sidebarCollapsed && <span className="text-sm font-semibold">Crew</span>}
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-400 transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 bg-slate-100 dark:bg-slate-800 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-all duration-200">
              {theme === 'dark' ? <Moon style={{ width: 16, height: 16 }} /> : <Sun style={{ width: 16, height: 16 }} />}
            </div>
            {!sidebarCollapsed && <span className="text-sm font-semibold">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>

          {/* Divider */}
          <div className="mx-3 my-2 h-px bg-slate-200 dark:bg-slate-800" />

          {/* User card */}
          <div className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
                <span className="text-white text-sm font-bold">
                  {adminUser?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{adminUser?.full_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield style={{ width: 10, height: 10 }} className="text-blue-500 flex-shrink-0" />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate capitalize">{adminUser?.role}</p>
                </div>
              </div>
            )}
          </div>

          <div className={`flex gap-1.5 mt-1 ${sidebarCollapsed ? 'flex-col' : 'flex-row'}`}>
            <button
              onClick={() => setCurrentView('user-management')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 text-xs font-semibold border border-slate-200/80 dark:border-slate-700/50"
              title="Admin Einstellungen"
            >
              <SettingsIcon style={{ width: 13, height: 13 }} />
              {!sidebarCollapsed && <span>Admin</span>}
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 transition-all duration-200 text-xs font-semibold border border-red-200/60 dark:border-red-800/40"
              title={t('nav.sign_out')}
            >
              <LogOut style={{ width: 13, height: 13 }} />
              {!sidebarCollapsed && <span>Abmelden</span>}
            </button>
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            className="w-full flex items-center justify-center py-2 mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors duration-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title={sidebarCollapsed ? 'Erweitern' : 'Minimieren'}
          >
            <ChevronRight
              style={{ width: 15, height: 15 }}
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
