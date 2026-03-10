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
        <div className="flex gap-1 min-w-max bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
          {settingsOptions.map((option) => {
            const OptionIcon = option.icon;
            const isActive = activeTab === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setActiveTab(option.id)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <OptionIcon className="w-4 h-4 shrink-0" />
                <span>{option.label}</span>
                {option.showBadge && (
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white' : 'bg-green-500'}`} />
                )}
              </button>
            );
          })}
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
