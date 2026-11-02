import React, { useState } from 'react';
import { User, Order } from '../types';
import { PlusCircle, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface OrderCreatorProps {
  users: User[];
  onOrderCreated: (order: Order) => void;
  onSelectForWebhook: (order: Order) => void;
}

export const OrderCreator: React.FC<OrderCreatorProps> = ({
  users,
  onOrderCreated,
  onSelectForWebhook,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || 'usr_rajesh99');
  const [amount, setAmount] = useState<number>(500);
  const [currency, setCurrency] = useState<string>('INR');
  const [description, setDescription] = useState<string>('Wallet points recharge');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bonus points logic: >= 1000 gets 1.2x multiplier
  const multiplier = amount >= 1000 ? 1.2 : 1.0;
  const estimatedPoints = Math.floor(amount * multiplier);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          amount,
          currency,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      setLastCreatedOrder(data.order);
      onOrderCreated(data.order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="text-xs font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-semibold">
                POST
              </span>
              <span>/api/create-order</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Step 1: Order ID aur amount generate karke status PENDING banata hai
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateOrder} className="space-y-4">
          {/* User selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Select User (Account Holder)
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.id}) — Current Wallet: {u.walletBalance} pts
                </option>
              ))}
            </select>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Amount ({currency})
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Presets:</span>
            {[100, 500, 1000, 2500].map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setAmount(preset)}
                className={`text-[11px] font-mono px-2 py-1 rounded transition-colors ${
                  amount === preset
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                ₹{preset}
              </button>
            ))}
          </div>

          {/* Points calculation estimation box */}
          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Calculated Wallet Points:</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400 tabular-nums">
                +{estimatedPoints} Points
              </span>
              {amount >= 1000 && (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-500">
                  Includes 1.2x Bonus
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Order Description / Note
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isLoading ? 'Creating Order...' : 'Call POST /api/create-order'}</span>
          </button>
        </form>
      </div>

      {/* Response Box */}
      {lastCreatedOrder && (
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>HTTP 201 Created</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Status: {lastCreatedOrder.status}
            </span>
          </div>

          <div className="bg-slate-950 rounded-lg p-3 text-[11px] font-mono text-slate-200 overflow-x-auto space-y-1">
            <div>
              <span className="text-slate-500">orderId:</span>{' '}
              <span className="text-emerald-400 font-semibold">{lastCreatedOrder.orderId}</span>
            </div>
            <div>
              <span className="text-slate-500">amount:</span>{' '}
              <span className="text-amber-300">
                {lastCreatedOrder.currency} {lastCreatedOrder.amount}
              </span>
            </div>
            <div>
              <span className="text-slate-500">pointsToCredit:</span>{' '}
              <span className="text-cyan-400">{lastCreatedOrder.pointsToCredit} pts</span>
            </div>
            <div>
              <span className="text-slate-500">userId:</span>{' '}
              <span className="text-purple-300">{lastCreatedOrder.userId}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectForWebhook(lastCreatedOrder)}
            className="mt-3 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <span>Proceed to Step 2: Trigger Webhook for this Order</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
