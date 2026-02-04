import React from 'react';
import ReactDOM from 'react-dom/client';
import { StandaloneCrewDashboard } from './components/StandaloneCrewDashboard';
import './index.css';

// Set crew mode flag before app initializes
(window as any).FORCE_CREW_MODE = true;

console.log('🚀 Crew Dashboard Starting...', {
  crewMode: (window as any).FORCE_CREW_MODE,
  supabaseUrl: (window as any).VITE_SUPABASE_URL
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StandaloneCrewDashboard />
  </React.StrictMode>
);
