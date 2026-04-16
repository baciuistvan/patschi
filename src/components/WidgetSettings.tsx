import { useState, useEffect } from 'react';
import { Code, Copy, Check, Eye, PowerOff, Save, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

export function WidgetSettings() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [vacancyMode, setVacancyMode] = useState(false);
  const [vacancyMessage, setVacancyMessage] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const baseUrl = window.location.origin;
  const widgetUrl = `${baseUrl}/widget`;

  const embedCode = `<!-- Patschi Reservation Widget -->
<iframe
  src="${widgetUrl}"
  width="100%"
  height="700"
  frameborder="0"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
  title="Table Reservation Widget"
></iframe>`;

  useEffect(() => {
    loadVacancySettings();
  }, []);

  const loadVacancySettings = async () => {
    setLoadingSettings(true);
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['widget_vacancy_mode', 'widget_vacancy_message']);

    if (data) {
      const modeRow = data.find(r => r.key === 'widget_vacancy_mode');
      const msgRow = data.find(r => r.key === 'widget_vacancy_message');
      if (modeRow) setVacancyMode(modeRow.value === 'true');
      if (msgRow) setVacancyMessage(msgRow.value || '');
    }
    setLoadingSettings(false);
  };

  const handleSaveVacancySettings = async () => {
    setSaving(true);
    await supabase.from('settings').upsert([
      { key: 'widget_vacancy_mode', value: vacancyMode ? 'true' : 'false' },
      { key: 'widget_vacancy_message', value: vacancyMessage },
    ], { onConflict: 'key' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('widget.title')}</h2>
        <p className="text-slate-400">Embed the reservation widget on your website</p>
      </div>

      {/* Vacancy Mode Panel */}
      <div className={`rounded-xl p-6 border transition-all duration-300 ${
        vacancyMode
          ? 'bg-amber-900/20 border-amber-700/60'
          : 'bg-slate-800 border-slate-700'
      }`}>
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${vacancyMode ? 'bg-amber-500/20' : 'bg-slate-700'}`}>
              <PowerOff className={`w-5 h-5 ${vacancyMode ? 'text-amber-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Vacancy Mode</h3>
              <p className="text-sm text-slate-400 mt-0.5">
                Hide the booking form and show a custom off-season message to guests
              </p>
            </div>
          </div>
          <button
            onClick={() => setVacancyMode(v => !v)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none flex-shrink-0 ${
              vacancyMode ? 'bg-amber-500' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${
                vacancyMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {vacancyMode && (
          <div className="mt-4 flex items-start gap-2 bg-amber-500/10 border border-amber-600/40 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              Vacancy mode is <strong>active</strong>. The reservation widget is currently hidden from guests.
            </p>
          </div>
        )}

        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-slate-300">
            Guest Message
          </label>
          <textarea
            value={vacancyMessage}
            onChange={e => setVacancyMessage(e.target.value)}
            rows={4}
            placeholder="Liebe Gaste, Reservierungen sind aktuell nicht moglich. Wir freuen uns, Sie in der Wintersaison wieder bei uns begru&szlig;en zu durfen."
            className="w-full bg-slate-900 text-slate-200 border border-slate-600 rounded-lg px-4 py-3 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 resize-none transition"
          />
          <p className="text-xs text-slate-500">
            This message is shown to guests when vacancy mode is active. Leave empty to use the default message.
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveVacancySettings}
            disabled={saving || loadingSettings}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            } disabled:opacity-50`}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Embed Code Panel */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Code className="w-5 h-5 mr-2" />
            {t('widget.embed_code')}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            {t('widget.copy_code')}
          </p>

          <div className="relative">
            <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg overflow-x-auto text-sm border border-slate-600">
              <code>{embedCode}</code>
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center space-x-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="text-xs">{t('widget.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-xs">{t('widget.copy')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t('widget.direct_link')}</h3>
          <p className="text-sm text-slate-400 mb-3">
            {t('widget.share_link')}
          </p>
          <div className="bg-slate-900 px-4 py-3 rounded-lg border border-slate-600 flex items-center justify-between">
            <code className="text-blue-400 text-sm break-all">{widgetUrl}</code>
            <button
              onClick={() => window.open(widgetUrl, '_blank')}
              className="ml-4 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex-shrink-0"
              title="Open in new tab"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition"
          >
            <Eye className="w-5 h-5" />
            <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
          </button>

          {showPreview && (
            <div className="mt-4 border-2 border-slate-700 rounded-xl overflow-hidden">
              <iframe
                src={widgetUrl}
                width="100%"
                height="700"
                style={{ border: 'none' }}
                title="Widget Preview"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Integration Tips</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>The widget is fully responsive and works on all devices</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>Adjust the height value in the embed code if needed (default: 700px)</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>The widget automatically uses your configured rooms and tables</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span>Reservations made through the widget appear in your Reservations tab</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
