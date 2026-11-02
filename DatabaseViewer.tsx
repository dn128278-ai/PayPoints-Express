import React, { useState } from 'react';
import { User, Order, WalletTransaction } from '../types';
import { Users, ShoppingBag, History, ArrowUpRight, Search, Zap } from 'lucide-react';

interface DatabaseViewerProps {
  users: User[];
  orders: Order[];
  transactions: WalletTransaction[];
  onTriggerOrderWebhook: (order: Order) => void;
}

export const DatabaseViewer: React.FC<DatabaseViewerProps> = ({
  users,
  orders,
  transactions,
  onTriggerOrderWebhook,
}) => {
  const [subTab, setSubTab] = useState<'users' | 'orders' | 'ledger'>('users');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(
    (o) =>
      o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter(
    (t) =>
      t.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Sub navigation bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setSubTab('users')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              subTab === 'users'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users &amp; Wallets ({users.length})</span>
          </button>

          <button
            onClick={() => setSubTab('orders')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              subTab === 'orders'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders Table ({orders.length})</span>
          </button>

          <button
            onClick={() => setSubTab('ledger')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              subTab === 'ledger'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Ledger ({transactions.length})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, name or order..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* 1. USERS & WALLET BALANCE TAB */}
      {subTab === 'users' && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredUsers.map((user) => {
              const userOrders = orders.filter((o) => o.userId === user.id);
              const paidCount = userOrders.filter((o) => o.status === 'PAID').length;

              return (
                <div
                  key={user.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                        {user.id}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Wallet Balance
                      </div>
                      <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {user.walletBalance.toLocaleString()} pts
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <span>{paidCount} paid orders</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. ORDERS TABLE TAB */}
      {subTab === 'orders' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Points Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No orders found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const user = users.find((u) => u.id === order.userId);
                  return (
                    <tr
                      key={order.orderId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {order.orderId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {user?.name || order.userId}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{order.userId}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                        {order.currency} {order.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +{order.pointsToCredit} pts
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            order.status === 'PAID'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : order.status === 'PENDING'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px] tabular-nums">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {order.status === 'PENDING' ? (
                          <button
                            onClick={() => onTriggerOrderWebhook(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded text-[11px] font-medium transition-colors"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Simulate Pay</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {order.paymentId ? order.paymentId.substring(0, 12) + '...' : 'Completed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. WALLET AUDIT LEDGER TAB */}
      {subTab === 'ledger' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4 text-right">Points Credited</th>
                <th className="py-3 px-4 text-right">Balance Change</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 font-mono">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No transactions yet. Complete a payment webhook to generate ledger records!
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => {
                  const user = users.find((u) => u.id === txn.userId);
                  return (
                    <tr
                      key={txn.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {txn.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {user?.name || txn.userId}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {txn.orderId}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +{txn.points} pts
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500 text-[11px]">
                        {txn.balanceBefore} → <span className="font-bold text-slate-800 dark:text-slate-200">{txn.balanceAfter} pts</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px]">
                        {txn.description}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px] tabular-nums">
                        {new Date(txn.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
