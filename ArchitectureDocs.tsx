import React from 'react';
import { ShieldCheck, RefreshCw, Database, Server, CheckCircle2, Lock, Zap } from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          PayPoints Architecture: Order Creation &amp; Payment Webhook Engine
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Yeh document aapko Node.js aur Express me banaye gaye <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/api/create-order</code> aur <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/api/payment-webhook</code> ka full working flow samjhata hai. Isme security (HMAC Signature), Idempotency (Duplicate webhook prevention), aur Atomic Database transactions ka production-grade implementation shamil hai.
        </p>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pillar 1 */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              1. Order Create API (/api/create-order)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Jab frontend ya mobile app user se recharge ya purchase ka request bhejta hai, server ek cryptographically unique <code className="font-mono text-slate-700 dark:text-slate-300">orderId</code> generate karta hai, recharge amount ke anusaar reward points calculate karta hai, aur status ko <code className="font-mono text-amber-600">PENDING</code> mark karke database me save karta hai.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500">
            Flow: Client → POST /api/create-order → Order ID &amp; Amount Returned
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              2. Webhook Security (HMAC SHA-256)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Kyunki webhook API public internet par expose rehti hai, koi bhi hacker fake success request bhejkar free wallet points add karne ki koshish kar sakta hai. Isliye payment gateway (Razorpay/Stripe) ek secret key ke sath HMAC-SHA256 signature bhejta hai, jise humara server verify karta hai. Invalid signature par turant 401 Unauthorized return hota hai.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500">
            Security: crypto.createHmac(&apos;sha256&apos;, secret).digest(&apos;hex&apos;)
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              3. Idempotency (Dohra Points Credit Rokna)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Agar network slow ho ya server response time out ho jaye, toh payment gateways webhook ko retry karte hain (kabhi-kabhi 5 se 10 baar). Agar server har retry par points add karega toh user ko double points mil jayenge! Isliye server <code className="font-mono text-slate-700 dark:text-slate-300">order.status === &apos;PAID&apos;</code> aur <code className="font-mono text-slate-700 dark:text-slate-300">idempotencyKey</code> check karke safe 200 OK deta hai bina duplicate points add kiye.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500">
            Rule: Exactly-once credit guarantee across multiple webhook retries
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              4. Atomic Wallet Update &amp; Audit Ledger
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Production database (PostgreSQL/MySQL) me wallet credit ko ek transaction (<code className="font-mono text-purple-600">BEGIN ... COMMIT</code>) me kiya jata hai. Isme 3 cheezein sath me hoti hain: User wallet balance badhana, Order status ko PAID mark karna, aur Ledger table me transaction record likhna. Agar koi bhi step fail ho toh pura rollback ho jata hai.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500">
            ACID: Consistent wallet balances with permanent audit trail
          </div>
        </div>
      </div>

      {/* Step by step code walkthrough */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          Step-by-Step Code Flow: Kaise kaam karta hai
        </h3>

        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-slate-100">Kadam 1: User Payment Initiate Karta Hai</span>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              User app me ₹500 add karne ka button click karta hai. App server ko <code className="font-mono text-slate-800 dark:text-slate-200">POST /api/create-order</code> call karta hai jisme <code className="font-mono text-slate-800 dark:text-slate-200">userId</code> aur <code className="font-mono text-slate-800 dark:text-slate-200">amount</code> pass kiya jata hai.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-slate-100">Kadam 2: Server Order Banata Hai</span>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Server database me naya order banata hai jaise <code className="font-mono text-emerald-600">order_1740928_AB9</code> with <code className="font-mono">pointsToCredit: 500</code> aur <code className="font-mono text-amber-600">status: PENDING</code>.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-slate-100">Kadam 3: User Gateway Par Pay Karta Hai</span>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              User UPI/Card se Razorpay ya Stripe par ₹500 pay karta hai. Payment successful hote hi gateway seedhe humare server ke webhook URL par HTTP POST request dispatch karta hai.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-slate-100">Kadam 4: /api/payment-webhook Par Auto-Credit</span>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Webhook handler request verify karta hai, database se order find karta hai, user ka wallet balance <code className="font-mono text-emerald-600">+500 points</code> se update karta hai, aur gateway ko <code className="font-mono text-slate-800 dark:text-slate-200">200 OK</code> response bhejta hai.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
