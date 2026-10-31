import React, { useState } from 'react';
import { codeSnippets } from '../data/codeSnippets';
import { Copy, Check, Download, FileCode, Layers, ShieldCheck, Database, Terminal } from 'lucide-react';

export const CodeViewer: React.FC = () => {
  const [activeSnippetKey, setActiveSnippetKey] = useState<keyof typeof codeSnippets>('serverJs');
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const snippetTabs = [
    { key: 'serverJs' as const, label: 'Complete server.js (Node/Express)', icon: FileCode },
    { key: 'razorpaySnippet' as const, label: 'Razorpay Webhook', icon: ShieldCheck },
    { key: 'stripeSnippet' as const, label: 'Stripe Webhook', icon: Layers },
    { key: 'sqlSchema' as const, label: 'PostgreSQL Schema & ACID Txn', icon: Database },
    { key: 'curlCommands' as const, label: 'cURL & Terminal Tests', icon: Terminal },
  ];

  const currentCode = codeSnippets[activeSnippetKey];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleDownload = () => {
    const filenameMap: Record<string, string> = {
      serverJs: 'server.js',
      razorpaySnippet: 'razorpay-webhook.js',
      stripeSnippet: 'stripe-webhook.js',
      sqlSchema: 'schema.sql',
      curlCommands: 'test-api.sh',
    };
    const filename = filenameMap[activeSnippetKey] || 'code.txt';
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Tab controls */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg">
          {snippetTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSnippetKey === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSnippetKey(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
          >
            {hasCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download File</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Panel */}
      <div className="relative">
        <pre className="p-6 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[640px]">
          <code>{currentCode}</code>
        </pre>
      </div>
    </div>
  );
};
