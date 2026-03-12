import { Calendar, Gift } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Globe, Sun, Moon, ArrowRight } from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 80);
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
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0a0a0b] transition-colors duration-300 font-sans">
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(300%) rotate(45deg); }
        }
        .card-shimmer::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%);
          transform: translateX(-100%) rotate(45deg);
          transition: none;
        }
        .card-shimmer:hover::after {
          animation: shimmer 0.7s ease forwards;
        }
      `}</style>

      <nav className="bg-white/70 dark:bg-black/60 backdrop-blur-xl border-b border-black/5 dark:border-white/5 sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-xs tracking-tight">PB</span>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">{t('app.title')}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-2 mr-3 px-3 py-1.5 rounded-lg bg-black/3 dark:bg-white/5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{adminUser?.full_name?.charAt(0) || 'A'}</span>
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{adminUser?.full_name}</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => { setShowThemeMenu(!showThemeMenu); setShowLanguageMenu(false); }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all duration-200"
                >
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
                {showThemeMenu && (
                  <div className="absolute right-0 mt-2 bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/10 rounded-xl shadow-2xl shadow-black/10 py-1 z-50 min-w-32">
                    <button onClick={() => { setTheme('light'); setShowThemeMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-black/4 dark:hover:bg-white/5 transition flex items-center gap-2.5 ${theme === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                      <Sun className="w-4 h-4" /><span>Light</span>
                    </button>
                    <button onClick={() => { setTheme('dark'); setShowThemeMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-black/4 dark:hover:bg-white/5 transition flex items-center gap-2.5 ${theme === 'dark' ? 'text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                      <Moon className="w-4 h-4" /><span>Dark</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => { setShowLanguageMenu(!showLanguageMenu); setShowThemeMenu(false); }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all duration-200 flex items-center gap-1"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-medium">{language.toUpperCase()}</span>
                </button>
                {showLanguageMenu && (
                  <div className="absolute right-0 mt-2 bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/10 rounded-xl shadow-2xl shadow-black/10 py-1 z-50 min-w-32">
                    <button onClick={() => { setLanguage('en'); setShowLanguageMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-black/4 dark:hover:bg-white/5 transition ${language === 'en' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>English</button>
                    <button onClick={() => { setLanguage('de'); setShowLanguageMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-black/4 dark:hover:bg-white/5 transition ${language === 'de' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>Deutsch</button>
                  </div>
                )}
              </div>

              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all duration-200"
                title={t('nav.sign_out')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-24">
        <div
          style={{ transition: 'opacity 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s, transform 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s' }}
          className={`mb-20 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`}
        >
          <p className="text-xs font-semibold tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-4">
            {t('app.title')}
          </p>
          <h2 className="text-5xl sm:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-none mb-4">
            {t('system_selector.title')}
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-lg font-light max-w-sm">
            {t('system_selector.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
          <button
            onClick={() => onSelectSystem('reservations')}
            style={{
              transitionDelay: mounted ? '0ms' : '0ms',
              transition: 'opacity 0.65s cubic-bezier(0.22,1,0.36,1) 0.35s, transform 0.65s cubic-bezier(0.22,1,0.36,1) 0.35s, box-shadow 0.3s ease, border-color 0.3s ease',
            }}
            className={`card-shimmer group relative overflow-hidden rounded-3xl text-left
              bg-white dark:bg-[#111113]
              border border-black/5 dark:border-white/8
              hover:border-blue-200/80 dark:hover:border-blue-500/30
              hover:shadow-2xl hover:shadow-blue-500/8 dark:hover:shadow-blue-500/15
              hover:-translate-y-1.5
              p-8
              ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
          >
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-blue-500/5 dark:bg-blue-500/8 blur-3xl -translate-y-12 translate-x-12 group-hover:bg-blue-500/10 dark:group-hover:bg-blue-500/15 transition-all duration-700" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 flex items-center justify-center mb-8 group-hover:bg-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-blue-500/30">
                <Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                {t('system_selector.reservation_title')}
              </h3>
              <p className="text-slate-400 dark:text-slate-500 text-sm leading-relaxed mb-8">
                {t('system_selector.reservation_desc')}
              </p>
              <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 text-sm font-medium">
                <span className="translate-x-0 group-hover:translate-x-0.5 transition-transform duration-300">Auswählen</span>
                <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectSystem('gift-cards')}
            style={{
              transition: 'opacity 0.65s cubic-bezier(0.22,1,0.36,1) 0.5s, transform 0.65s cubic-bezier(0.22,1,0.36,1) 0.5s, box-shadow 0.3s ease, border-color 0.3s ease',
            }}
            className={`card-shimmer group relative overflow-hidden rounded-3xl text-left
              bg-white dark:bg-[#111113]
              border border-black/5 dark:border-white/8
              hover:border-emerald-200/80 dark:hover:border-emerald-500/30
              hover:shadow-2xl hover:shadow-emerald-500/8 dark:hover:shadow-emerald-500/15
              hover:-translate-y-1.5
              p-8
              ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
          >
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-emerald-500/5 dark:bg-emerald-500/8 blur-3xl -translate-y-12 translate-x-12 group-hover:bg-emerald-500/10 dark:group-hover:bg-emerald-500/15 transition-all duration-700" />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center mb-8 group-hover:bg-emerald-500 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-emerald-500/30">
                <Gift className="w-5 h-5 text-emerald-500 dark:text-emerald-400 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                {t('system_selector.gift_card_title')}
              </h3>
              <p className="text-slate-400 dark:text-slate-500 text-sm leading-relaxed mb-8">
                {t('system_selector.gift_card_desc')}
              </p>
              <div className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400 text-sm font-medium">
                <span className="translate-x-0 group-hover:translate-x-0.5 transition-transform duration-300">Auswählen</span>
                <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
