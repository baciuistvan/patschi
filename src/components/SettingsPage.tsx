import { useState, useEffect } from 'react';
import { Gift, Upload, Mail, Bell, CreditCard } from 'lucide-react';
import { GiftCardEmailSettings } from './GiftCardEmailSettings';
import { GiftCardStripeSettings } from './GiftCardStripeSettings';
import { WordPressWidgetSettings } from './WordPressWidgetSettings';
import HostingConfiguration from './HostingConfiguration';
import FileUploadManager from './FileUploadManager';
import { SMTPSettings } from './SMTPSettings';
import { NotificationSettings } from './NotificationSettings';

type SettingsTab = 'templates' | 'stripe' | 'widget' | 'hosting' | 'smtp' | 'notifications';

interface TabOption {
  id: SettingsTab;
  icon: typeof Mail;
  label: string;
  badge?: string | null;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('templates');
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
  }, []);

  const tabs: TabOption[] = [
    { id: 'templates', icon: Mail, label: 'E-Mail Template' },
    { id: 'stripe', icon: CreditCard, label: 'Stripe', badge: stripeMode },
    { id: 'widget', icon: Gift, label: 'WordPress Widget' },
    { id: 'hosting', icon: Upload, label: 'Hosting', badge: hasHostingConfig ? 'ok' : null },
    { id: 'smtp', icon: Mail, label: 'SMTP' },
    { id: 'notifications', icon: Bell, label: 'Benachrichtigungen' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">Einstellungen</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500">Gutscheinsystem konfigurieren</p>
      </div>

      <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="relative flex min-w-max">
          <div className="flex items-center gap-0.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-1.5 shadow-sm">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 whitespace-nowrap group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <TabIcon className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`} />
                  <span>{tab.label}</span>
                  {tab.id === 'stripe' && stripeMode && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      isActive
                        ? stripeMode === 'test' ? 'bg-amber-400/30 text-white' : 'bg-emerald-400/30 text-white'
                        : stripeMode === 'test' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {stripeMode === 'test' ? 'Test' : 'Live'}
                    </span>
                  )}
                  {tab.id === 'hosting' && hasHostingConfig && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white/80' : 'bg-emerald-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        {activeTab === 'templates' && <GiftCardEmailSettings />}
        {activeTab === 'stripe' && <GiftCardStripeSettings />}
        {activeTab === 'widget' && <WordPressWidgetSettings />}
        {activeTab === 'hosting' && (
          <div className="space-y-6">
            <HostingConfiguration onConfigChange={setHasHostingConfig} />
            <FileUploadManager hasConfiguration={hasHostingConfig} />
          </div>
        )}
        {activeTab === 'smtp' && <SMTPSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
      </div>
    </div>
  );
}
