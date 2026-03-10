import { useState } from 'react';
import { Building2, Code, CreditCard, Clock, Mail, Upload, TrendingDown, LayoutGrid, ScrollText } from 'lucide-react';
import { RoomSettings } from './RoomSettings';
import { WidgetSettings } from './WidgetSettings';
import { StripeSettings } from './StripeSettings';
import { BookingHours } from './BookingHours';
import { EmailSettings } from './EmailSettings';
import HostingConfiguration from './HostingConfiguration';
import FileUploadManager from './FileUploadManager';
import { AbandonedReservations } from './AbandonedReservations';
import { FloorPlanManager } from './FloorPlanManager';
import { SystemLogs } from './SystemLogs';
import { useLanguage } from '../contexts/LanguageContext';

type SettingsTab = 'rooms' | 'floor-plan' | 'widget' | 'stripe' | 'hours' | 'email' | 'hosting' | 'abandoned' | 'logs';

interface SettingsOption {
  id: SettingsTab;
  icon: typeof Building2;
  label: string;
  showBadge?: boolean;
}

export function Settings() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTab>('rooms');
  const [hasHostingConfig, setHasHostingConfig] = useState(false);

  const settingsOptions: SettingsOption[] = [
    { id: 'rooms', icon: Building2, label: t('settings.rooms') },
    { id: 'floor-plan', icon: LayoutGrid, label: t('nav.floor_plan') },
    { id: 'widget', icon: Code, label: t('settings.widget') },
    { id: 'stripe', icon: CreditCard, label: t('settings.stripe') },
    { id: 'hours', icon: Clock, label: t('settings.booking_hours') },
    { id: 'abandoned', icon: TrendingDown, label: 'Abgebrochen' },
    { id: 'email', icon: Mail, label: t('settings.email') },
    { id: 'hosting', icon: Upload, label: 'Hosting', showBadge: hasHostingConfig },
    { id: 'logs', icon: ScrollText, label: 'Protokoll' },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="relative flex min-w-max">
          <div className="flex items-center gap-0.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-1.5 shadow-sm">
            {settingsOptions.map((option) => {
              const OptionIcon = option.icon;
              const isActive = activeTab === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setActiveTab(option.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 whitespace-nowrap group ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm shadow-slate-200/80 dark:shadow-slate-900/50'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <OptionIcon className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${
                    isActive ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300'
                  }`} />
                  <span>{option.label}</span>
                  {option.showBadge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                  {isActive && (
                    <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-blue-500/50" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        {activeTab === 'rooms' && <RoomSettings />}
        {activeTab === 'floor-plan' && <FloorPlanManager />}
        {activeTab === 'widget' && <WidgetSettings />}
        {activeTab === 'stripe' && <StripeSettings />}
        {activeTab === 'hours' && <BookingHours />}
        {activeTab === 'abandoned' && <AbandonedReservations />}
        {activeTab === 'email' && <EmailSettings />}
        {activeTab === 'hosting' && (
          <div className="space-y-6">
            <HostingConfiguration onConfigChange={setHasHostingConfig} />
            <FileUploadManager hasConfiguration={hasHostingConfig} />
          </div>
        )}
        {activeTab === 'logs' && <SystemLogs />}
      </div>
    </div>
  );
}
