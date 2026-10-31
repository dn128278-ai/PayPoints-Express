import React, { useState, useEffect } from 'react';
import { Order, User } from '../types';
import { Send, Shield, RefreshCw, AlertTriangle, CheckCircle2, Copy, KeyRound, ArrowRight } from 'lucide-react';

interface WebhookSimulatorProps {
  orders: Order[];
  users: User[];
  selectedOrder: Order | null;
  onWebhookDispatched: () => void;
}

export const WebhookSimulator: React.FC<WebhookSimulatorProps> = ({
  orders,
  users,
  selectedOrder,
  onWebhookDispatched,
}) => {
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const targetOrder =
    selectedOrder || pendingOrders[0] || orders[0] || null;

  const [orderId, setOrderId] = useState<string>(targetOrder?.orderId || '');
  const [paymentId, setPaymentId] = useState<string>(
    `pay_${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 6)}`
  );
  const [event, setEvent] = useState<string>('payment.captured');
  const [paymentStatus, setPaymentStatus] = useState<'SUCCESS' | 'FAILED'>('SUCCESS');
  const [signatureMode, setSignatureMode] = useState<'valid' | 'tampered' | 'skip'>('valid');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseResult, setResponseResult] = useState<any | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);

  // Sync when selectedOrder prop changes
  useEffect(() => {
    if (selectedOrder) {
      setOrderId(selectedOrder.orderId);
      setPaymentId(`pay_${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 6)}`);
    }
  }, [selectedOrder]);

  const currentOrderObj = orders.find((o) => o.orderId === orderId);
  const currentUserObj = currentOrderObj
    ? users.find((u) => u.id === currentOrderObj.userId)
    : null;

  const generateNewPaymentId = () => {
    setPaymentId(`pay_${Date.now().toString().slice(-6)}_${Math.random().toString(36).substring(2, 6)}`);
  };

  const handleDispatchWebhook = async (overrideSignatureMode?: 'valid' | 'tampered' | 'skip') => {
    setIsLoading(true);
    setResponseResult(null);
    setResponseStatus(null);

    const activeSigMode = overrideSignatureMode || signatureMode;

    try {
      // 1. Fetch valid signature from backend helper
      let signatureValue = 'skip_verification';
      if (activeSigMode === 'valid') {
        const sigRes = await fetch('/api/generate-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: `${orderId}|${paymentId}` }),
        });
        const sigData = await sigRes.json();
        signatureValue = sigData.signature;
      } else if (activeSigMode === 'tampered') {
        signatureValue = 'tampered_invalid_signature_hex_0000000000000000';
      }

      // 2. Dispatch the actual webhook
      const payload = {
        event,
        orderId,
        paymentId,
        amount: currentOrderObj ? currentOrderObj.amount : 500,
        currency: currentOrderObj ? currentOrderObj.currency : 'INR',
        status: paymentStatus,
      };

      const webhookResponse = await fetch('/api/payment-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signatureValue,
        },
        body: JSON.stringify(payload),
      });

      const resData = await webhookResponse.json();
      setResponseStatus(webhookResponse.status);
      setResponseResult(resData);

      // Trigger global database refresh
      onWebhookDispatched();
    } catch (err: any) {
      setResponseStatus(500);
      setResponseResult({
        success: false,
        error: err.message || 'Error dispatching webhook',
      });
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
              <span className="text-xs font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-semibold">
                POST
              </span>
              <span>/api/payment-webhook</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Step 2: Payment gateway webhook sunkar database me user wallet me points automatically credit karta hai
            </p>
          </div>
        </div>

        {/* Quick Scenario Buttons */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            One-Click Test Scenarios
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setPaymentStatus('SUCCESS');
                setSignatureMode('valid');
                generateNewPaymentId();
              }}
              className="text-left p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-xs transition-colors bg-slate-50/50 dark:bg-slate-800/40"
            >
              <div className="font-semibold text-slate-800 dark:text-slate-200">1. Normal Success</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Valid sig &amp; credit points</div>
            </button>

            <button
              type="button"
              onClick={() => {
                // Keep the exact same payment ID to test Idempotency!
                setPaymentStatus('SUCCESS');
                setSignatureMode('valid');
                handleDispatchWebhook('valid');
              }}
              className="text-left p-2 rounded-lg border border-amber-200 dark:border-amber-900/60 hover:border-amber-500 text-xs transition-colors bg-amber-50/30 dark:bg-amber-950/20"
              title="Test sending duplicate webhook with same payment ID"
            >
              <div className="font-semibold text-amber-800 dark:text-amber-300">2. Test Idempotency</div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400">Resend (No double credit)</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentStatus('SUCCESS');
                setSignatureMode('tampered');
                handleDispatchWebhook('tampered');
              }}
              className="text-left p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:border-rose-500 text-xs transition-colors bg-rose-50/30 dark:bg-rose-950/20"
              title="Test invalid HMAC signature rejection"
            >
              <div className="font-semibold text-rose-800 dark:text-rose-300">3. Tampered Signature</div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400">Tests 401 Security Block</div>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Order ID Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Target Order ID
            </label>
            <div className="flex gap-2">
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="flex-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {orders.length === 0 ? (
                  <option value="">No orders found</option>
                ) : (
                  orders.map((o) => (
                    <option key={o.orderId} value={o.orderId}>
                      {o.orderId} ({o.status}) — ₹{o.amount} ({o.pointsToCredit} pts)
                    </option>
                  ))
                )}
              </select>
            </div>
            {currentOrderObj && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Account: {currentUserObj?.name}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">Current Wallet: {currentUserObj?.walletBalance} pts</span>
                <span aria-hidden="true">·</span>
                <span className={`font-semibold ${currentOrderObj.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {currentOrderObj.status}
                </span>
              </div>
            )}
          </div>

          {/* Payment ID & Event */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment Gateway ID
                </label>
                <button
                  type="button"
                  onClick={generateNewPaymentId}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Randomize</span>
                </button>
              </div>
              <input
                type="text"
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Webhook Event Type
              </label>
              <select
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="payment.captured">payment.captured (Razorpay)</option>
                <option value="payment_intent.succeeded">payment_intent.succeeded (Stripe)</option>
                <option value="charge.success">charge.success (Generic)</option>
                <option value="payment.failed">payment.failed (Failed Event)</option>
              </select>
            </div>
          </div>

          {/* Signature Verification Mode */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              HMAC-SHA256 Signature Header
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                signatureMode === 'valid'
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="sigMode"
                  value="valid"
                  checked={signatureMode === 'valid'}
                  onChange={() => setSignatureMode('valid')}
                  className="sr-only"
                />
                <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium text-[11px]">Valid Signature</span>
              </label>

              <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                signatureMode === 'tampered'
                  ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="sigMode"
                  value="tampered"
                  checked={signatureMode === 'tampered'}
                  onChange={() => setSignatureMode('tampered')}
                  className="sr-only"
                />
                <Shield className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="font-medium text-[11px]">Tampered / Fake</span>
              </label>

              <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                signatureMode === 'skip'
                  ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="sigMode"
                  value="skip"
                  checked={signatureMode === 'skip'}
                  onChange={() => setSignatureMode('skip')}
                  className="sr-only"
                />
                <span className="font-medium text-[11px]">Skip Header</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleDispatchWebhook()}
            disabled={isLoading || !orderId}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>{isLoading ? 'Processing Webhook...' : 'Dispatch POST /api/payment-webhook'}</span>
          </button>
        </div>
      </div>

      {/* Response Box */}
      {responseResult && (
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-semibold flex items-center gap-1.5 ${
                responseStatus === 200
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {responseStatus === 200 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              <span>HTTP {responseStatus}</span>
              {responseResult.isDuplicate && (
                <span className="text-[10px] font-mono bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                  Idempotent (Duplicate Ignored)
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(responseResult, null, 2));
                setCopiedResponse(true);
                setTimeout(() => setCopiedResponse(false), 2000);
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-mono"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedResponse ? 'Copied!' : 'Copy JSON'}</span>
            </button>
          </div>

          {/* Balance transition banner */}
          {responseResult.data && (
            <div className="mb-2.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs">
              <span className="text-emerald-800 dark:text-emerald-200">
                Wallet Points Auto-Credited:
              </span>
              <div className="flex items-center gap-2 font-mono font-bold">
                <span className="text-slate-500 tabular-nums">
                  {responseResult.data.previousBalance} pts
                </span>
                <ArrowRight className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {responseResult.data.newWalletBalance} pts (+{responseResult.data.pointsCredited})
                </span>
              </div>
            </div>
          )}

          <pre className="bg-slate-950 rounded-lg p-3 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-44">
            {JSON.stringify(responseResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
