import React, { useState } from 'react';
import { WebhookLog } from '../types';
import { Terminal, ShieldAlert, CheckCircle2, Clock, AlertTriangle, Eye, ChevronDown, ChevronRight } from 'lucide-react';

interface WebhookLogsViewerProps {
  logs: WebhookLog[];
}

export const WebhookLogsViewer: React.FC<WebhookLogsViewerProps> = ({ logs }) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(logs[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Webhook Ingestion Logs</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time audit of incoming webhook requests, idempotency checks, and HMAC signature validations
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
          {logs.length} Total Events
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm">No webhook events logged yet.</p>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch a test webhook from the Interactive Sandbox to observe logs here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60 overflow-hidden text-xs"
              >
                <div
                  onClick={() => toggleExpand(log.id)}
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-[11px] ${
                            log.status === 'PROCESSED'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : log.status === 'DUPLICATE_IGNORED'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {log.status}
                        </span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          {log.orderId}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          ({log.paymentId})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {log.message}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right shrink-0">
                    {log.pointsCredited > 0 && (
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +{log.pointsCredited} pts
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {new Date(log.receivedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 font-mono text-[11px]">
                    <div className="text-slate-400 mb-1 flex items-center justify-between">
                      <span>Payload Body &amp; Headers</span>
                      <span>Signature Valid: {log.signatureValid ? 'TRUE' : 'FALSE'}</span>
                    </div>
                    <pre className="overflow-x-auto text-[10px] text-emerald-300">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
