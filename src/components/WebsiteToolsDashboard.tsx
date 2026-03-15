import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Globe, Briefcase, Code, Home, LogOut, Sun, Moon, ChevronRight, Plus, RefreshCw, Loader2, Menu, X, ArrowLeft } from 'lucide-react';
import { JobListings } from './JobListings';
import { JobWidgetSettings } from './JobWidgetSettings';
import { supabase } from '../lib/supabase';

type View = 'home' | 'jobs' | 'widget';

interface WebsiteToolsDashboardProps {
  onSwitchSystem?: () => void;
}

interface JobStats {
  total: number;
  active: number;
  inactive: number;
}

const NAV_ITEMS: { view: View; icon: React.ElementType; label: string }[] = [
  { view: 'home', icon: Home, label: 'Übersicht' },
  { view: 'jobs', icon: Briefcase, label: 'Offene Stellen' },
  { view: 'widget', icon: Code, label: 'Widget Einbindung' },
];

export function WebsiteToolsDashboard({ onSwitchSystem }: WebsiteToolsDashboardProps) {
  const { adminUser, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [currentView, setCurrentView] = useState<View>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<JobStats>({ total: 0, active: 0, inactive: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (currentView === 'home') loadStats();
  }, [currentView]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const { data } = await supabase.from('job_listings').select('is_active');
      if (data) {
        const active = data.filter(j => j.is_active).length;
        setStats({ total: data.length, active, inactive: data.length - active });
      }
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch { /* ignore */ }
  };

  const HomeView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Übersicht</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Website Tools auf einen Blick</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadStats}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-150"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setCurrentView('jobs')}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-all duration-150 shadow-sm shadow-teal-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Neue Stelle
          </button>
        </div>
      </div>

      {loadingStats ? (
        <div className="text-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Lade Daten...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/5 dark:bg-teal-400/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 bg-teal-50 dark:bg-teal-900/40 rounded-2xl flex items-center justify-center ring-1 ring-teal-100 dark:ring-teal-800/50">
                  <Briefcase className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/40 px-2.5 py-1 rounded-full">
                  Gesamt
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.total}</p>
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mt-1">Stellenanzeigen</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 dark:bg-emerald-400/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center ring-1 ring-emerald-100 dark:ring-emerald-800/50">
                  <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full">
                  Aktiv
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.active}</p>
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mt-1">Öffentlich sichtbar</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            onClick={() => setCurrentView('widget')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/5 dark:bg-blue-400/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center ring-1 ring-blue-100 dark:ring-blue-800/50">
                  <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Widget einbinden</p>
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mt-1">iFrame-Code anzeigen</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-4">Schnellzugriff</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => setCurrentView('jobs')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-500/30 hover:bg-teal-50/50 dark:hover:bg-teal-500/5 transition-all group text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Offene Stellen verwalten</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Stellen erstellen &amp; bearbeiten</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-auto group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={() => setCurrentView('widget')}
            className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all group text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Code className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Widget einbinden</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">iFrame-Code &amp; Anleitung</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-auto group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 h-full z-30 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-800 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <Globe className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">Website Tools</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">Stellenanzeigen & Widget</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-0.5">
          {NAV_ITEMS.map(({ view, icon: Icon, label }) => {
            const active = currentView === view;
            return (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  active
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
                }`}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-teal-600 dark:text-teal-400' : ''}`} />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
                {active && !sidebarCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="py-4 px-2 border-t border-slate-200 dark:border-slate-800 space-y-0.5">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-all duration-150"
            title="Theme wechseln"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5 flex-shrink-0" /> : <Moon className="w-4.5 h-4.5 flex-shrink-0" />}
            {!sidebarCollapsed && <span className="text-sm font-medium">{theme === 'dark' ? 'Hell' : 'Dunkel'}</span>}
          </button>

          {onSwitchSystem && (
            <button
              onClick={onSwitchSystem}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-all duration-150"
              title="System wechseln"
            >
              <ArrowLeft className="w-4.5 h-4.5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm font-medium">System wechseln</span>}
            </button>
          )}

          {!sidebarCollapsed && adminUser && (
            <div className="mx-1 mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{adminUser.full_name?.charAt(0) ?? 'A'}</span>
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{adminUser.full_name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 capitalize truncate">{adminUser.role}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
            title="Abmelden"
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="text-sm font-medium">Abmelden</span>}
          </button>
        </div>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
        >
          <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${sidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">Website Tools</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ view, icon: Icon, label }) => {
            const active = currentView === view;
            return (
              <button
                key={view}
                onClick={() => { setCurrentView(view); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                  active
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="py-4 px-2 border-t border-slate-200 dark:border-slate-800 space-y-0.5">
          {onSwitchSystem && (
            <button onClick={onSwitchSystem} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150">
              <ArrowLeft className="w-4.5 h-4.5 flex-shrink-0" />
              <span className="text-sm font-medium">System wechseln</span>
            </button>
          )}
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150">
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            <span className="text-sm font-medium">Abmelden</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 h-14 flex items-center px-4 gap-3">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-teal-600 rounded-md flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white text-sm">Website Tools</span>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          {currentView === 'home' && <HomeView />}
          {currentView === 'jobs' && <JobListings />}
          {currentView === 'widget' && <JobWidgetSettings />}
        </main>
      </div>
    </div>
  );
}
