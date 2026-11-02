/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DatabaseState, Order } from './types';
import { Header } from './components/Header';
import { OrderCreator } from './components/OrderCreator';
import { WebhookSimulator } from './components/WebhookSimulator';
import { DatabaseViewer } from './components/DatabaseViewer';
import { WebhookLogsViewer } from './components/WebhookLogsViewer';
import { CodeViewer } from './components/CodeViewer';
import { ArchitectureDocs } from './components/ArchitectureDocs';
import { Wallet, ShoppingCart, CheckCircle, Terminal, Coins, ArrowRight, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'database' | 'code' | 'logs' | 'docs'>('sandbox');
  const [databaseState, setDatabaseState] = useState<DatabaseState | null>(null);
  const [selectedOrderForWebhook, setSelectedOrderForWebhook] = useState<Order | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch live database state from Express backend
  const fetchDatabaseState = async () => {
    try {
      const res = await fetch('/api/database-state');
      if (res.ok) {
        const data = await res.json();
        setDatabaseState(data);
      }
    } catch (err) {
      console.error('Error fetching database state:', err);
    }
  };

  useEffect(() => {
    fetchDatabaseState();
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset-database', { method: 'POST' });
      if (res.ok) {
        await fetchDatabaseState();
        showNotification('Database successfully reset to initial demo state!');
      }
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleOrderCreated = (newOrder: Order) => {
    fetchDatabaseState();
    setSelectedOrderForWebhook(newOrder);
    showNotification(`Order ${newOrder.orderId} created! Proceed to Step 2 to simulate payment webhook.`);
  };

  const handleWebhookDispatched = () => {
    fetchDatabaseState();
  };

  const users = databaseState?.users || [];
  const orders = databaseState?.orders || [];
  const transactions = databaseState?.walletTransactions || [];
  const logs = databaseState?.webhookLogs || [];

  const totalPoints = users.reduce((acc, u) => acc + u.walletBalance, 0);
  const paidOrdersCount = orders.filter((o) => o.status === 'PAID').length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Bar following Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetDatabase={handleResetDatabase}
        isResetting={isResetting}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-3 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 border border-slate-700 dark:border-slate-300 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Editorial Context Banner answering user prompt directly */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                <span>Express.js Backend Solution</span>
                <span aria-hidden="true">·</span>
                <span>Order API &amp; Payment Webhook Points Engine</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Node.js &amp; Express Order &amp; Webhook Wallet Automation
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Contains working <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">POST /api/create-order</code> to generate unique order ID &amp; amount, and <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">POST /api/payment-webhook</code> that verifies payment signatures and automatically adds reward points to user wallet balances with idempotency protection.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('code')}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
              >
                <span>View Full Server Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tabular Metric Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>Circulating Wallet Points</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                {totalPoints.toLocaleString()} pts
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Across {users.length} accounts
              </div>
            </div>

            <div>
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                <span>Orders Status</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                {paidOrdersCount} Paid · {pendingOrdersCount} Pending
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                {orders.length} total orders created
              </div>
            </div>

            <div>
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-600" />
                <span>Webhooks Processed</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                {logs.length} Ingested
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {transactions.length} ledger transactions
              </div>
            </div>

            <div>
              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Security &amp; Idempotency</span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                HMAC SHA-256
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                Duplicate Safe Enabled
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection for Mobile / Segmented Control */}
        <div className="flex lg:hidden items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg overflow-x-auto">
          {(
            [
              { id: 'sandbox', label: 'Interactive Sandbox' },
              { id: 'database', label: 'Database & Wallets' },
              { id: 'code', label: 'Server Code' },
              { id: 'logs', label: 'Webhook Logs' },
              { id: 'docs', label: 'Architecture Guide' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. INTERACTIVE SANDBOX TAB */}
        {activeTab === 'sandbox' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Step 1: Create Order */}
              <OrderCreator
                users={users}
                onOrderCreated={handleOrderCreated}
                onSelectForWebhook={(order) => {
                  setSelectedOrderForWebhook(order);
                  showNotification(`Selected order ${order.orderId} for webhook dispatch.`);
                }}
              />

              {/* Step 2: Payment Webhook Simulator */}
              <WebhookSimulator
                orders={orders}
                users={users}
                selectedOrder={selectedOrderForWebhook}
                onWebhookDispatched={handleWebhookDispatched}
              />
            </div>

            {/* Quick Live View of Database Below Sandbox */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Live Database State (Real-Time Synchronized)
                </h3>
                <button
                  onClick={() => setActiveTab('database')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Expand Full Database &amp; Ledger</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <DatabaseViewer
                users={users}
                orders={orders}
                transactions={transactions}
                onTriggerOrderWebhook={(order) => {
                  setSelectedOrderForWebhook(order);
                  showNotification(`Order ${order.orderId} loaded into Webhook Simulator!`);
                }}
              />
            </div>
          </div>
        )}

        {/* 2. DATABASE & WALLETS TAB */}
        {activeTab === 'database' && (
          <DatabaseViewer
            users={users}
            orders={orders}
            transactions={transactions}
            onTriggerOrderWebhook={(order) => {
              setSelectedOrderForWebhook(order);
              setActiveTab('sandbox');
              showNotification(`Order ${order.orderId} loaded into Webhook Simulator!`);
            }}
          />
        )}

        {/* 3. SERVER CODE HUB */}
        {activeTab === 'code' && <CodeViewer />}

        {/* 4. WEBHOOK INGESTION LOGS */}
        {activeTab === 'logs' && <WebhookLogsViewer logs={logs} />}

        {/* 5. ARCHITECTURE & BILINGUAL GUIDE */}
        {activeTab === 'docs' && <ArchitectureDocs />}
      </main>

      {/* Minimal clean footer */}
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PayPoints Express · Node.js &amp; Express Order &amp; Webhook Wallet System</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('code')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              API Code
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              Documentation
            </button>
            <button
              onClick={handleResetDatabase}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              Reset Data
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
