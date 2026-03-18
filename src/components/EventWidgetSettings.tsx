import { useState } from 'react';
import { Copy, Check, Code, Globe, FileCode } from 'lucide-react';

export function EventWidgetSettings() {
  const [copied, setCopied] = useState<string | null>(null);

  const widgetUrl = `https://patschi.at/events-widget.html`;

  const iframeCode = `<!-- Veranstaltungen Widget -->
<iframe
  src="${widgetUrl}"
  style="width: 100%; min-height: 700px; border: none; border-radius: 12px;"
  title="Veranstaltungen"
  loading="lazy"
></iframe>`;

  const directLinkCode = widgetUrl;

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">Events Widget Einbindung</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500">Binde das Veranstaltungs-Widget auf deiner Website ein</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111113] rounded-2xl border border-slate-100 dark:border-white/5 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <Code className="w-4.5 h-4.5 text-teal-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">iFrame Einbindung</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Für jede Website & CMS</p>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-4 relative">
            <button
              onClick={() => copy(iframeCode, 'iframe')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition shadow-sm"
              title="Kopieren"
            >
              {copied === 'iframe' ? <Check className="w-4 h-4 text-teal-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </button>
            <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-x-auto pr-10 font-mono leading-relaxed whitespace-pre-wrap break-all">
              <code>{iframeCode}</code>
            </pre>
          </div>
          <ol className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 list-decimal list-inside">
            <li>Code kopieren</li>
            <li>In den HTML-Quellcode deiner Website einfügen</li>
            <li>Widget erscheint automatisch mit aktuellen Events</li>
          </ol>
        </div>

        <div className="bg-white dark:bg-[#111113] rounded-2xl border border-slate-100 dark:border-white/5 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Globe className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Direkter Link</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Standalone-Seite öffnen</p>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-4 relative">
            <button
              onClick={() => copy(directLinkCode, 'link')}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition shadow-sm"
              title="Kopieren"
            >
              {copied === 'link' ? <Check className="w-4 h-4 text-teal-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
            </button>
            <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-x-auto pr-10 font-mono leading-relaxed whitespace-pre-wrap break-all">
              <code>{directLinkCode}</code>
            </pre>
          </div>
          <a
            href={widgetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline"
          >
            <Globe className="w-3.5 h-3.5" />
            Widget in neuem Tab öffnen
          </a>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-slate-100 dark:border-white/5 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <FileCode className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">WordPress Einbindung</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Schritt für Schritt</p>
          </div>
        </div>
        <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/8 text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>iFrame-Code oben kopieren</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/8 text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>In WordPress eine neue Seite erstellen oder eine bestehende bearbeiten</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/8 text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Einen <strong>Benutzerdefinierten HTML</strong>-Block hinzufügen (im Gutenberg-Editor)</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/8 text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">4</span>
            <span>Den kopierten Code in den HTML-Block einfügen und Seite speichern</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/8 text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">5</span>
            <span>Neue Events in der Verwaltung hinzufügen — sie erscheinen automatisch auf der Website</span>
          </li>
        </ol>
      </div>

      <div className="bg-teal-50 dark:bg-teal-500/8 border border-teal-200/60 dark:border-teal-500/20 rounded-2xl p-5">
        <h4 className="font-semibold text-teal-800 dark:text-teal-300 text-sm mb-2">So funktioniert es</h4>
        <ul className="space-y-1.5 text-sm text-teal-700 dark:text-teal-400">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-teal-500" />
            <span>Event im Bereich "Veranstaltungen" erstellen und aktivieren</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-teal-500" />
            <span>Das Widget zeigt automatisch alle aktiven, kommenden Events in Echtzeit an</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-teal-500" />
            <span>Deaktivierte Events werden nicht angezeigt — kein Code-Update nötig</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-teal-500" />
            <span>Besucher können nach Kategorie filtern und Details zu jedem Event ausklappen</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
