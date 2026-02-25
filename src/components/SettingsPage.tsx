import { useState, useEffect } from 'react';
import { ChevronDown, Palette, Gift, Upload, Mail, Bell, CreditCard } from 'lucide-react';
import { GiftCardEmailSettings } from './GiftCardEmailSettings';
import { GiftCardStripeSettings } from './GiftCardStripeSettings';
import { WordPressWidgetSettings } from './WordPressWidgetSettings';
import HostingConfiguration from './HostingConfiguration';
import FileUploadManager from './FileUploadManager';
import { SMTPSettings } from './SMTPSettings';
import { NotificationSettings } from './NotificationSettings';

type SettingsSection = 'templates' | 'stripe' | 'widget' | 'hosting' | 'smtp' | 'notifications' | null;

export function SettingsPage() {
  const [expandedSection, setExpandedSection] = useState<SettingsSection>(null);
  const [hasHostingConfig, setHasHostingConfig] = useState(false);
  const [stripeMode, setStripeMode] = useState<'test' | 'live' | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toggle-stripe-mode`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.mode) setStripeMode(data.mode); })
      .catch(() => {});
  }, [expandedSection]);

  const toggleSection = (section: SettingsSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Settings</h2>
        <p className="text-slate-600 dark:text-slate-400">Configure your gift card system</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => toggleSection('templates')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Gift Card Email Template</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Customize gift card email content and design</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${
                expandedSection === 'templates' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'templates' && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <GiftCardEmailSettings />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => toggleSection('stripe')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Stripe Test / Live Modus</h3>
                  {stripeMode && (
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      stripeMode === 'test'
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                    }`}>
                      {stripeMode === 'test' ? 'Test' : 'Live'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Zwischen Test- und Live-Zahlungen umschalten</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${
                expandedSection === 'stripe' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'stripe' && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <GiftCardStripeSettings />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => toggleSection('widget')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">WordPress Widget</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Widget integration settings</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${
                expandedSection === 'widget' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'widget' && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <WordPressWidgetSettings />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => toggleSection('hosting')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hosting Upload</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Upload files to your web server via FTP/SFTP
                  {hasHostingConfig && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Configured
                    </span>
                  )}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${
                expandedSection === 'hosting' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'hosting' && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 space-y-6">
              <HostingConfiguration onConfigChange={setHasHostingConfig} />
              <FileUploadManager hasConfiguration={hasHostingConfig} />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => toggleSection('smtp')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">SMTP Email Configuration</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Configure your email server settings</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${
                expandedSection === 'smtp' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'smtp' && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <SMTPSettings />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => toggleSection('notifications')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Push Notifications</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Get notified about new reservations</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform ${
                expandedSection === 'notifications' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'notifications' && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <NotificationSettings />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
