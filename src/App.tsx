import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { ReservationWidget } from './components/ReservationWidget';
import { GiftCardWidget } from './components/GiftCardWidget';
import { GiftCardSuccess } from './components/GiftCardSuccess';
import { SystemSelector } from './components/SystemSelector';
import { GiftCardDashboard } from './components/GiftCardDashboard';
import { WebsiteToolsDashboard } from './components/WebsiteToolsDashboard';
import { ConfigurationWizard } from './components/ConfigurationWizard';
import { StandaloneCrewDashboard } from './components/StandaloneCrewDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isConfigured } from './lib/supabase';

type SystemType = 'reservations' | 'gift-cards' | 'website-tools' | null;

function AppContent() {
  const { user, adminUser, loading } = useAuth();
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    setShowConfig(!isConfigured());
  }, []);
  const [selectedSystem, setSelectedSystem] = useState<SystemType>(null);
  const path = window.location.pathname;
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);
  const isWidget = path === '/widget';
  const isGiftCardWidget = path === '/gift-card-widget' || hash === '#/gift-card-widget';
  const isGiftCardSuccess = searchParams.get('success') === 'true' && searchParams.get('gift_card_id');
  const isCrewMode = (window as any).FORCE_CREW_MODE || path.includes('/crew') || hash === '#/crew' || searchParams.get('mode') === 'crew';

  useEffect(() => {
    if (!user || !adminUser) {
      setSelectedSystem(null);
    }
  }, [user, adminUser]);

  // Skip loading check for crew mode and widgets
  if (loading && !isCrewMode && !isWidget && !isGiftCardWidget && !isGiftCardSuccess) {
    return (
      <div className="min-h-screen-safe bg-slate-900 flex flex-col items-center justify-center p-4 px-safe pt-safe pb-safe">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (isGiftCardSuccess) {
    return <GiftCardSuccess />;
  }

  if (isGiftCardWidget) {
    return (
      <div className="min-h-screen-safe bg-gradient-to-br from-green-50 to-emerald-50 py-8 sm:py-12 px-4 px-safe pt-safe pb-safe">
        <div className="max-w-7xl mx-auto">
          <GiftCardWidget />
        </div>
      </div>
    );
  }

  if (isCrewMode) {
    return <StandaloneCrewDashboard />;
  }

  if (showConfig && !isWidget && !isGiftCardWidget && !isGiftCardSuccess) {
    return <ConfigurationWizard onComplete={() => setShowConfig(false)} />;
  }

  if (isWidget) {
    return (
      <div className="min-h-screen-safe bg-gradient-to-br from-slate-100 to-slate-200 py-8 sm:py-12 px-4 px-safe pt-safe pb-safe">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-end mb-4">
            <a
              href="/"
              className="inline-flex items-center space-x-2 bg-slate-800 active:bg-slate-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Admin Login</span>
            </a>
          </div>
          <ReservationWidget />
        </div>
      </div>
    );
  }

  if (!user || !adminUser) {
    return <LoginPage />;
  }

  if (!selectedSystem) {
    return <SystemSelector onSelectSystem={setSelectedSystem} />;
  }

  const handleSwitchSystem = () => setSelectedSystem(null);

  if (selectedSystem === 'reservations') {
    return <Dashboard onSwitchSystem={handleSwitchSystem} />;
  }

  if (selectedSystem === 'gift-cards') {
    return <GiftCardDashboard onSwitchSystem={handleSwitchSystem} />;
  }

  if (selectedSystem === 'website-tools') {
    return <WebsiteToolsDashboard onSwitchSystem={handleSwitchSystem} />;
  }

  return <Dashboard onSwitchSystem={handleSwitchSystem} />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
