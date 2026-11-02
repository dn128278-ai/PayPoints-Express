import React, { useState, useEffect } from 'react';
import { Market, User } from '../types';
import { io as socketIOClient, Socket } from 'socket.io-client';
import {
  TrendingUp,
  PlusCircle,
  Radio,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Coins,
  Search,
  Filter,
  Check,
  Zap,
} from 'lucide-react';

interface MarketsConsoleProps {
  initialMarkets: Market[];
  users: User[];
  onDatabaseRefresh: () => void;
}

export const MarketsConsole: React.FC<MarketsConsoleProps> = ({
  initialMarkets,
  users,
  onDatabaseRefresh,
}) => {
  const [markets, setMarkets] = useState<Market[]>(initialMarkets);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [socketStatus, setSocketStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [socketEvents, setSocketEvents] = useState<Array<{ id: string; event: string; detail: string; time: string }>>([]);

  // Create Market Modal State
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<Market['category']>('TECH');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newYesPrice, setNewYesPrice] = useState<number>(50);
  const [newLiquidity, setNewLiquidity] = useState<number>(50000);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Trade Modal State
  const [tradingMarket, setTradingMarket] = useState<Market | null>(null);
  const [tradeUserId, setTradeUserId] = useState<string>(users[0]?.id || 'usr_rajesh99');
  const [tradeOutcome, setTradeOutcome] = useState<'YES' | 'NO'>('YES');
  const [tradePoints, setTradePoints] = useState<number>(50);
  const [tradeLoading, setTradeLoading] = useState<boolean>(false);
  const [tradeResult, setTradeResult] = useState<any | null>(null);

  // Socket.io initialization
  useEffect(() => {
    const socket: Socket = socketIOClient(window.location.origin, {
      transports: ['polling', 'websocket'],
    });

    socket.on('connect', () => {
      setSocketStatus('connected');
      addSocketLog('connect', `Socket client connected (${socket.id})`);
    });

    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
      addSocketLog('disconnect', 'Socket client disconnected');
    });

    socket.on('markets:init', (initMarkets: Market[]) => {
      if (Array.isArray(initMarkets)) {
        setMarkets(initMarkets);
        addSocketLog('markets:init', `Received initial sync with ${initMarkets.length} markets`);
      }
    });

    socket.on('market:created', (newMarket: Market) => {
      setMarkets((prev) => {
        if (prev.some((m) => m.id === newMarket.id)) return prev;
        return [newMarket, ...prev];
      });
      addSocketLog('market:created', `New market: "${newMarket.title.slice(0, 32)}..."`);
    });

    socket.on('market:traded', (data: any) => {
      setMarkets((prev) =>
        prev.map((m) => (m.id === data.market?.id ? { ...m, ...data.market } : m))
      );
      addSocketLog(
        'market:traded',
        `Trade in ${data.market?.id}: YES ${data.market?.yesPrice}% · NO ${data.market?.noPrice}%`
      );
      onDatabaseRefresh();
    });

    socket.on('market:status_changed', (data: any) => {
      setMarkets((prev) =>
        prev.map((m) =>
          m.id === data.id
            ? {
                ...m,
                status: data.status,
                resolvedOutcome: data.resolvedOutcome,
                yesPrice: data.yesPrice ?? m.yesPrice,
                noPrice: data.noPrice ?? m.noPrice,
              }
            : m
        )
      );
      addSocketLog('market:status_changed', `Market ${data.id} status changed to ${data.status}`);
      onDatabaseRefresh();
    });

    socket.on('markets:updated', (updatedMarkets: Market[]) => {
      if (Array.isArray(updatedMarkets)) {
        setMarkets(updatedMarkets);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const addSocketLog = (event: string, detail: string) => {
    setSocketEvents((prev) => [
      {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        event,
        detail,
        time: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 19),
    ]);
  };

  // Sync props if initialMarkets change
  useEffect(() => {
    if (initialMarkets && initialMarkets.length > 0) {
      setMarkets(initialMarkets);
    }
  }, [initialMarkets]);

  // Handle Create Market via POST /api/markets
  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          description: newDescription,
          yesPrice: newYesPrice,
          liquidity: newLiquidity,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create market');
      }

      setIsCreating(false);
      setNewTitle('');
      setNewDescription('');
      setNewYesPrice(50);
      onDatabaseRefresh();
    } catch (err: any) {
      setCreateError(err.message || 'Error creating market');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Trade via POST /api/markets/:id/trade
  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradingMarket) return;

    setTradeLoading(true);
    setTradeResult(null);

    try {
      const res = await fetch(`/api/markets/${tradingMarket.id}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: tradeUserId,
          outcome: tradeOutcome,
          points: tradePoints,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute trade');
      }

      setTradeResult(data);
      onDatabaseRefresh();
    } catch (err: any) {
      setTradeResult({ success: false, error: err.message });
    } finally {
      setTradeLoading(false);
    }
  };

  // Handle status update via PATCH /api/markets/:id/status
  const handleUpdateStatus = async (marketId: string, status: Market['status'], outcome?: 'YES' | 'NO') => {
    try {
      await fetch(`/api/markets/${marketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolvedOutcome: outcome }),
      });
      onDatabaseRefresh();
    } catch (err) {
      console.error('Error updating market status:', err);
    }
  };

  const filteredMarkets = markets.filter((m) => {
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const matchesQuery =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const selectedTradeUser = users.find((u) => u.id === tradeUserId) || users[0];

  return (
    <div className="space-y-6">
      {/* Overview & Live Socket.io Status Strip */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
              REAL-TIME SYNC
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Socket.io WebSockets &amp; Express API
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Market Management &amp; Prediction Sync</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Create prediction markets with <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">POST /api/markets</code> and trade contracts using PayPoints wallet balances with live multi-client broadcast.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-mono">
            <div
              className={`w-2 h-2 rounded-full ${
                socketStatus === 'connected'
                  ? 'bg-emerald-500'
                  : socketStatus === 'connecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-700 dark:text-slate-300 capitalize">{socketStatus}</span>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create New Market</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'CRYPTO', 'SPORTS', 'TECH', 'FINANCE'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search markets by title, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Grid: Markets (Left) & Real-time Socket Event Log (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Markets Cards (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          {filteredMarkets.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              No markets found matching the filters.
            </div>
          ) : (
            filteredMarkets.map((market) => (
              <div
                key={market.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {market.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px]">{market.id}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold ${
                          market.status === 'OPEN'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : market.status === 'RESOLVED'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-amber-600'
                        }`}
                      >
                        {market.status}
                        {market.resolvedOutcome ? ` (${market.resolvedOutcome})` : ''}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {market.title}
                    </h3>
                  </div>

                  {market.status === 'OPEN' && (
                    <button
                      onClick={() => {
                        setTradingMarket(market);
                        setTradeResult(null);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Trade</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                  {market.description}
                </p>

                {/* Probability Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-xs font-mono font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                      YES: {market.yesPrice}%
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                      NO: {market.noPrice}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 transition-all duration-300"
                      style={{ width: `${market.yesPrice}%` }}
                    />
                    <div
                      className="bg-slate-400 dark:bg-slate-600 transition-all duration-300"
                      style={{ width: `${market.noPrice}%` }}
                    />
                  </div>
                </div>

                {/* Footer Metrics & Resolution Controls */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums">
                      Vol: {market.totalVolume.toLocaleString()} pts
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{market.totalOrders} trades</span>
                  </div>

                  {/* Resolution Quick Buttons */}
                  {market.status === 'OPEN' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-sans">Resolve:</span>
                      <button
                        onClick={() => handleUpdateStatus(market.id, 'RESOLVED', 'YES')}
                        className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] font-semibold transition-colors"
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(market.id, 'RESOLVED', 'NO')}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-[10px] font-semibold transition-colors"
                      >
                        NO
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Real-Time Socket.io Event Stream (1 Column) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Live Socket.io Feed</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {socketEvents.length} events
            </span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto font-mono text-[11px]">
            {socketEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-sans">
                Awaiting live WebSocket broadcasts...
              </div>
            ) : (
              socketEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/80 text-[11px]"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {evt.event}
                    </span>
                    <span className="tabular-nums">{evt.time}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 truncate">
                    {evt.detail}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create New Market */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="text-xs font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-semibold">
                  POST
                </span>
                <span>/api/markets</span>
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-medium"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateMarket} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Market Question / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Will ISRO land Chandrayaan-4 on the Moon in 2026?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Market['category'])}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CRYPTO">CRYPTO</option>
                    <option value="SPORTS">SPORTS</option>
                    <option value="TECH">TECH</option>
                    <option value="FINANCE">FINANCE</option>
                    <option value="POLITICS">POLITICS</option>
                    <option value="ENTERTAINMENT">ENTERTAINMENT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Initial Probability (YES %)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={newYesPrice}
                    onChange={(e) => setNewYesPrice(Number(e.target.value))}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Criteria / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Specify official source and terms for resolution..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {createError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{createLoading ? 'Broadcasting...' : 'Publish Market via API'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Trade Market with PayPoints */}
      {tradingMarket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                  Trade with PayPoints Wallet
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {tradingMarket.title}
                </h3>
              </div>
              <button
                onClick={() => setTradingMarket(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-medium"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleExecuteTrade} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select User Account
                </label>
                <select
                  value={tradeUserId}
                  onChange={(e) => setTradeUserId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — Balance: {u.walletBalance} pts
                    </option>
                  ))}
                </select>
              </div>

              {/* Outcome Picker */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Choose Position
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTradeOutcome('YES')}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      tradeOutcome === 'YES'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <div>YES</div>
                    <div className="text-xs font-mono">{tradingMarket.yesPrice}%</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTradeOutcome('NO')}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      tradeOutcome === 'NO'
                        ? 'border-slate-900 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    <div>NO</div>
                    <div className="text-xs font-mono">{tradingMarket.noPrice}%</div>
                  </button>
                </div>
              </div>

              {/* Points to Invest */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Points to Invest
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Avail: {selectedTradeUser?.walletBalance || 0} pts
                  </span>
                </div>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={tradePoints}
                  onChange={(e) => setTradePoints(Math.max(1, Number(e.target.value)))}
                  className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Result banner */}
              {tradeResult && (
                <div
                  className={`p-3 rounded-lg text-xs ${
                    tradeResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {tradeResult.success ? (
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Trade Executed &amp; Synced!</span>
                      </div>
                      <div className="text-[11px]">
                        Deducted {tradePoints} pts. New User Balance: {tradeResult.user?.walletBalance} pts.
                      </div>
                    </div>
                  ) : (
                    <span>{tradeResult.error}</span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={tradeLoading || (selectedTradeUser && selectedTradeUser.walletBalance < tradePoints)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>
                  {tradeLoading
                    ? 'Executing Trade...'
                    : `Invest ${tradePoints} Points in ${tradeOutcome}`}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
