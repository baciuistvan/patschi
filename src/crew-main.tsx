import React from 'react';
import ReactDOM from 'react-dom/client';
import { StandaloneCrewDashboard } from './components/StandaloneCrewDashboard';
import './index.css';

console.log('🚀 Crew Dashboard Starting...', {
  crewMode: window.FORCE_CREW_MODE,
  supabaseUrl: window.VITE_SUPABASE_URL
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StandaloneCrewDashboard />
  </React.StrictMode>
);
