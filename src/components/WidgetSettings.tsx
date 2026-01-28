import { useState } from 'react';
import { Code, Copy, Check, Eye } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function WidgetSettings() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
