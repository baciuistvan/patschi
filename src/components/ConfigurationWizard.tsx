import { useState } from 'react';
import { Database, Key, Check, AlertCircle } from 'lucide-react';

interface ConfigurationWizardProps {
  onComplete: () => void;
}

export function ConfigurationWizard({ onComplete }: ConfigurationWizardProps) {
  const [step, setStep] = useState(1);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setError('');
    setTesting(true);

    try {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Please enter both URL and key');
      }

      if (!supabaseUrl.includes('supabase.co')) {
        throw new Error('Invalid Supabase URL format');
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to connect to Supabase');
      }

      localStorage.setItem('supabase_url', supabaseUrl);
      localStorage.setItem('supabase_anon_key', supabaseKey);

      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleComplete = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome to Après-Ski Management System
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Let's get you set up in just a few steps
          </p>
        </div>

        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {step > 1 ? <Check className="w-5 h-5" /> : '1'}
          </div>
          <div className={`h-1 w-16 ${step >= 2 ? 'bg-green-600' : 'bg-slate-200'}`}></div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {step > 2 ? <Check className="w-5 h-5" /> : '2'}
          </div>
          <div className={`h-1 w-16 ${step >= 3 ? 'bg-green-600' : 'bg-slate-200'}`}></div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 3 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {step > 3 ? <Check className="w-5 h-5" /> : '3'}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <Database className="w-6 h-6 mr-2 text-blue-600" />
                Step 1: Create Supabase Project
              </h2>
              <ol className="list-decimal list-inside space-y-3 text-slate-700 dark:text-slate-300">
                <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">supabase.com</a> and sign up (free)</li>
                <li>Click "New Project" and name it "apres-ski-system"</li>
                <li>Wait for initialization (~2 minutes)</li>
                <li>Go to Settings → API</li>
                <li>Copy your Project URL and anon public key</li>
              </ol>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              I've Created My Project →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <Key className="w-6 h-6 mr-2 text-green-600" />
                Step 2: Enter Your Credentials
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xxxxx.supabase.co"
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Supabase Anon Key
                </label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:text-white"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition font-semibold"
              >
                ← Back
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !supabaseUrl || !supabaseKey}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test Connection →'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                Configuration Successful!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your Supabase connection has been established.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Next Steps:</h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300">
                <li>Run database migrations in Supabase SQL Editor</li>
                <li>Create your admin account (Sign Up)</li>
                <li>Add your user ID to admin_users table</li>
                <li>Login and start using the system</li>
              </ol>
            </div>

            <button
              onClick={handleComplete}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              Complete Setup
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            Need help? Check the <strong>QUICK-START.md</strong> guide included with your files
          </p>
        </div>
      </div>
    </div>
  );
}
