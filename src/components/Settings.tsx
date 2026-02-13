import { useState, useRef, useEffect } from 'react';
import { Building2, Code, CreditCard, Clock, Mail, Upload, ChevronDown, Check, TrendingDown, LayoutGrid } from 'lucide-react';
import { RoomSettings } from './RoomSettings';
import { WidgetSettings } from './WidgetSettings';
import { StripeSettings } from './StripeSettings';
import { BookingHours } from './BookingHours';
import { EmailSettings } from './EmailSettings';
import HostingConfiguration from './HostingConfiguration';
import FileUploadManager from './FileUploadManager';
import { AbandonedReservations } from './AbandonedReservations';
import { FloorPlanManager } from './FloorPlanManager';
import { useLanguage } from '../contexts/LanguageContext';

type SettingsTab = 'rooms' | 'floor-plan' | 'widget' | 'stripe' | 'hours' | 'email' | 'hosting' | 'abandoned';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const settingsOptions: SettingsOption[] = [
    { id: 'rooms', icon: Building2, label: t('settings.rooms') },
    { id: 'floor-plan', icon: LayoutGrid, label: t('nav.floor_plan') },
    { id: 'widget', icon: Code, label: t('settings.widget') },
    { id: 'stripe', icon: CreditCard, label: t('settings.stripe') },
    { id: 'hours', icon: Clock, label: t('settings.booking_hours') },
    { id: 'abandoned', icon: TrendingDown, label: 'Abgebrochene Reservierungen' },
    { id: 'email', icon: Mail, label: t('settings.email') },
    { id: 'hosting', icon: Upload, label: 'Hosting Upload', showBadge: hasHostingConfig },
  ];

  const activeOption = settingsOptions.find(opt => opt.id === activeTab);
  const ActiveIcon = activeOption?.icon || Building2;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside as any);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, []);

  const handleSelectOption = (option: SettingsTab) => {
    setActiveTab(option);
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full sm:w-auto min-w-[280px] px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between space-x-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-[0.98]"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <ActiveIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Settings</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{activeOption?.label}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {activeOption?.showBadge && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                ✓
              </span>
            )}
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 sm:right-auto mt-2 w-full sm:min-w-[320px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {settingsOptions.map((option) => {
              const OptionIcon = option.icon;
              const isActive = activeTab === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option.id)}
                  className={`w-full px-4 py-3 flex items-center justify-between space-x-3 transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'bg-slate-100 dark:bg-slate-700'
                    }`}>
                      <OptionIcon className={`w-5 h-5 ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`} />
                    </div>
                    <span className={`text-sm font-medium ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {option.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {option.showBadge && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                        ✓
                      </span>
                    )}
                    {isActive && (
                      <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
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
      </div>
    </div>
  );
}
