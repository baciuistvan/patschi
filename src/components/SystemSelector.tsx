import { Calendar, Gift, Menu, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Globe, Sun, Moon } from 'lucide-react';
import { useState } from 'react';

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
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSettingsMenu(!showSettingsMenu);
                    setShowLanguageMenu(false);
                    setShowThemeMenu(false);
                  }}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                  title="Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                {showSettingsMenu && (
                  <div className="absolute left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-48">
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center space-x-2 text-slate-700 dark:text-slate-300"
                    >
                      <Settings className="w-4 h-4" />
                      <span>{t('nav.settings')}</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-lg">PB</span>
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{t('app.title')}</h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">{t('system_selector.select_system')}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{adminUser?.full_name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{adminUser?.role}</p>
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    setShowThemeMenu(!showThemeMenu);
                    setShowLanguageMenu(false);
                    setShowSettingsMenu(false);
                  }}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                  title="Theme"
                >
                  {theme === 'dark' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
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
                    setShowSettingsMenu(false);
                  }}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition flex items-center space-x-1"
                  title="Language"
                >
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
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
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                title={t('nav.sign_out')}
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {t('system_selector.title')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            {t('system_selector.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <button
            onClick={() => onSelectSystem('reservations')}
            className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 p-8 text-center hover:shadow-2xl hover:scale-105"
          >
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-500 transition-colors duration-300">
              <Calendar className="w-10 h-10 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors duration-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              {t('system_selector.reservation_title')}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {t('system_selector.reservation_desc')}
            </p>
          </button>

          <button
            onClick={() => onSelectSystem('gift-cards')}
            className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-slate-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 transition-all duration-300 p-8 text-center hover:shadow-2xl hover:scale-105"
          >
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-green-500 transition-colors duration-300">
              <Gift className="w-10 h-10 text-green-600 dark:text-green-400 group-hover:text-white transition-colors duration-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              {t('system_selector.gift_card_title')}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {t('system_selector.gift_card_desc')}
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}
