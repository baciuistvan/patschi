import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function WordPressWidgetSettings() {
  const [copied, setCopied] = useState(false);

  const widgetCode = `<!-- Gift Card Widget -->
<iframe
  src="${window.location.origin}/gift-card-widget"
  style="width: 100%; min-height: 800px; border: none;"
  title="Gift Card Purchase"
></iframe>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(widgetCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          WordPress Integration
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Add this code to your WordPress page or post to embed the gift card widget.
        </p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 relative">
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <Copy className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          )}
        </button>
        <pre className="text-sm text-slate-800 dark:text-slate-200 overflow-x-auto pr-12">
          <code>{widgetCode}</code>
        </pre>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          Installation Instructions
        </h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-400">
          <li>Copy the code above</li>
          <li>Go to your WordPress admin panel</li>
          <li>Create a new page or edit an existing one</li>
          <li>Switch to the HTML/Code editor view</li>
          <li>Paste the code where you want the widget to appear</li>
          <li>Save and publish your page</li>
        </ol>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
          Note
        </h4>
        <p className="text-sm text-yellow-800 dark:text-yellow-400">
          Make sure your WordPress theme allows iframe embedding. Some themes may require additional configuration.
        </p>
      </div>
    </div>
  );
}
