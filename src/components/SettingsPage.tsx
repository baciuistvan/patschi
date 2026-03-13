import { useState, useEffect } from 'react';
import { ChevronDown, Gift, Upload, Mail, Bell, CreditCard } from 'lucide-react';
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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">Settings</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500">Configure your gift card system</p>
      </div>

      <div className="space-y-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/60 dark:border-slate-800/60 overflow-hidden transition-shadow duration-200">
          <button
            onClick={() => toggleSection('templates')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center ring-1 ring-emerald-100 dark:ring-emerald-800/50">
                <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Gift Card Email Template</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500">Customize gift card email content and design</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                expandedSection === 'templates' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'templates' && (
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
              <GiftCardEmailSettings />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/60 dark:border-slate-800/60 overflow-hidden transition-shadow duration-200">
          <button
            onClick={() => toggleSection('stripe')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center ring-1 ring-amber-100 dark:ring-amber-800/50">
                <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Stripe Test / Live Modus</h3>
                  {stripeMode && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      stripeMode === 'test'
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {stripeMode === 'test' ? 'Test' : 'Live'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500">Zwischen Test- und Live-Zahlungen umschalten</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                expandedSection === 'stripe' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'stripe' && (
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
              <GiftCardStripeSettings />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/60 dark:border-slate-800/60 overflow-hidden transition-shadow duration-200">
          <button
            onClick={() => toggleSection('widget')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-sky-50 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center ring-1 ring-sky-100 dark:ring-sky-800/50">
                <Gift className="w-5 h-5 text-sky-600 dark:text-sky-500" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">WordPress Widget</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500">Widget integration settings</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                expandedSection === 'widget' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'widget' && (
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
              <WordPressWidgetSettings />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/60 dark:border-slate-800/60 overflow-hidden transition-shadow duration-200">
          <button
            onClick={() => toggleSection('hosting')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-sky-50 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center ring-1 ring-sky-100 dark:ring-sky-800/50">
                <Upload className="w-5 h-5 text-sky-600 dark:text-sky-500" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Hosting Upload</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  Upload files to your web server via FTP/SFTP
                  {hasHostingConfig && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      Configured
                    </span>
                  )}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                expandedSection === 'hosting' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'hosting' && (
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 space-y-6">
              <HostingConfiguration onConfigChange={setHasHostingConfig} />
              <FileUploadManager hasConfiguration={hasHostingConfig} />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/60 dark:border-slate-800/60 overflow-hidden transition-shadow duration-200">
          <button
            onClick={() => toggleSection('smtp')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center ring-1 ring-orange-100 dark:ring-orange-800/50">
                <Mail className="w-5 h-5 text-orange-600 dark:text-orange-500" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">SMTP Email Configuration</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500">Configure your email server settings</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                expandedSection === 'smtp' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'smtp' && (
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
              <SMTPSettings />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/60 dark:border-slate-800/60 overflow-hidden transition-shadow duration-200">
          <button
            onClick={() => toggleSection('notifications')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-200"
          >
            <div className="flex items-center space-x-4">
              <div className="w-11 h-11 bg-yellow-50 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center ring-1 ring-yellow-100 dark:ring-yellow-800/50">
                <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Push Notifications</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500">Get notified about new reservations</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                expandedSection === 'notifications' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'notifications' && (
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
              <NotificationSettings />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
