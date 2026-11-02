import React from 'react';
import { RotateCcw, Server, Terminal, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'sandbox' | 'markets' | 'database' | 'code' | 'logs' | 'docs';
  setActiveTab: (tab: 'sandbox' | 'markets' | 'database' | 'code' | 'logs' | 'docs') => void;
  onResetDatabase: () => void;
  isResetting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onResetDatabase,
  isResetting,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
          PE
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            PayPoints Express
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Node.js &amp; Express Engine
          </span>
        </div>
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-slate-100 pb-1 ${
            activeTab === 'sandbox'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 font-semibold'
              : ''
          }`}
        >
          Payments Sandbox
        </button>

        <button
          onClick={() => setActiveTab('markets')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-slate-100 pb-1 ${
            activeTab === 'markets'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 font-semibold'
              : ''
          }`}
        >
          Markets Sync
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-slate-100 pb-1 ${
            activeTab === 'database'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 font-semibold'
              : ''
          }`}
        >
          Database &amp; Wallets
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-slate-100 pb-1 ${
            activeTab === 'code'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 font-semibold'
              : ''
          }`}
        >
          Server Code Hub
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-slate-100 pb-1 ${
            activeTab === 'logs'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 font-semibold'
              : ''
          }`}
        >
          Webhook Event Logs
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-slate-100 pb-1 ${
            activeTab === 'docs'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 font-semibold'
              : ''
          }`}
        >
          Hindi / English Guide
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onResetDatabase}
          disabled={isResetting}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          title="Reset database to demo initial state"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset Database</span>
        </button>
      </div>
    </header>
  );
};
