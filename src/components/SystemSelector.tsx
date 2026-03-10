import { Calendar, Gift, Menu, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Globe, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SystemSelectorProps {
  onSelectSystem: (system: 'reservations' | 'gift-cards') => void;
}

export function SystemSelector({ onSelectSystem }: SystemSelectorProps) {
  const { adminUser, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors duration-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSettingsMenu(!showSettingsMenu);
                    setShowLanguageMenu(false);
                    setShowThemeMenu(false);
                  }}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  title="Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                {showSettingsMenu && (
                  <div className="absolute left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 min-w-48">
                    <button
                      onClick={() => setShowSettingsMenu(false)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center space-x-2 text-slate-700 dark:text-slate-300"
                    >
                      <Settings className="w-4 h-4" />
                      <span>{t('nav.settings')}</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">PB</span>
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">{t('app.title')}</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t('system_selector.select_system')}</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="hidden sm:block text-right mr-2">
                <p className="text-sm font-medium text-slate-800 dark:text-white leading-tight">{adminUser?.full_name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{adminUser?.role}</p>
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowThemeMenu(!showThemeMenu);
                    setShowLanguageMenu(false);
                    setShowSettingsMenu(false);
                  }}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  title="Theme"
                >
                  {theme === 'dark' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
                {showThemeMenu && (
                  <div className="absolute right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 min-w-32">
                    <button
                      onClick={() => { setTheme('light'); setShowThemeMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center space-x-2 ${theme === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      <Sun className="w-4 h-4" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => { setTheme('dark'); setShowThemeMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center space-x-2 ${theme === 'dark' ? 'text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
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
                    setShowSettingsMenu(false);
                  }}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition flex items-center space-x-1"
                  title="Language"
                >
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs font-medium">{language.toUpperCase()}</span>
                </button>
                {showLanguageMenu && (
                  <div className="absolute right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl py-1 z-50 min-w-32">
                    <button
                      onClick={() => { setLanguage('en'); setShowLanguageMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition ${language === 'en' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => { setLanguage('de'); setShowLanguageMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition ${language === 'de' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      Deutsch
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                title={t('nav.sign_out')}
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div
          className={`text-center mb-16 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-medium mb-6 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
            {t('app.title')}
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            {t('system_selector.title')}
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-lg max-w-md mx-auto">
            {t('system_selector.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <button
            onClick={() => onSelectSystem('reservations')}
            style={{ transitionDelay: '100ms' }}
            className={`group relative bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-500 ease-out p-8 text-left hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 overflow-hidden
              ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-blue-600/5 transition-all duration-500 rounded-2xl" />
            <div className="relative">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500 group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
                <Calendar className="w-7 h-7 text-blue-500 dark:text-blue-400 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                {t('system_selector.reservation_title')}
              </h3>
              <p className="text-slate-400 dark:text-slate-500 text-sm leading-relaxed">
                {t('system_selector.reservation_desc')}
              </p>
              <div className="mt-6 flex items-center text-blue-500 dark:text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                <span>Öffnen</span>
                <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectSystem('gift-cards')}
            style={{ transitionDelay: '200ms' }}
            className={`group relative bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-500 ease-out p-8 text-left hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 overflow-hidden
              ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-600/5 transition-all duration-500 rounded-2xl" />
            <div className="relative">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-300">
                <Gift className="w-7 h-7 text-emerald-500 dark:text-emerald-400 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                {t('system_selector.gift_card_title')}
              </h3>
              <p className="text-slate-400 dark:text-slate-500 text-sm leading-relaxed">
                {t('system_selector.gift_card_desc')}
              </p>
              <div className="mt-6 flex items-center text-emerald-500 dark:text-emerald-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                <span>Öffnen</span>
                <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
