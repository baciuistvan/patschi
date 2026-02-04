import { useState, useEffect } from 'react';
import { CrewLogin } from './CrewLogin';
import { Dashboard } from './Dashboard';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';

export function StandaloneCrewDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const crewToken = localStorage.getItem('crew_token');
      const crewUser = localStorage.getItem('crew_user');
      setIsAuthenticated(!!(crewToken && crewUser));
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: { id: string; username: string; name: string; token: string }) => {
    setIsAuthenticated(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <CrewLogin onLogin={handleLoginSuccess} />;
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
