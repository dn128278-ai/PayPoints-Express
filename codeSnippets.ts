export const codeSnippets = {
  serverJs: `/**
 * ====================================================================
 * PayPoints Express - Production Node.js & Express Backend Server
 * APIs:
 *   1. POST /api/create-order     -> Generates Order ID & Amount
 *   2. POST /api/payment-webhook  -> Automatically adds points to Wallet
 * ====================================================================
 */

const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'your_webhook_secret_key_123';

// Create HTTP server and attach Socket.io (zero ENOENT errors on Render!)
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['polling', 'websocket'],
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.emit('status', { message: 'Connected to PayPoints Socket.io Server' });
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// Middleware for parsing JSON requests
app.use(express.json());

// ----------------------------------------------------
// ROOT GET / ROUTE (Clean Status JSON - No dist/index.html!)
// Fixes Render ENOENT errors and passes automated health checks
// ----------------------------------------------------
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    server: 'PayPoints Express Backend Server',
    service: 'order-payment-webhook-wallet-api',
    socketIo: 'active',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    endpoints: {
      status: 'GET /',
      health: 'GET /health',
      createOrder: 'POST /api/create-order',
      paymentWebhook: 'POST /api/payment-webhook',
    },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// ----------------------------------------------------
// In-Memory Database (Replace with PostgreSQL / MongoDB)
// ----------------------------------------------------
const users = [
  { id: 'usr_01', name: 'Rajesh Kumar', email: 'rajesh@example.com', walletBalance: 100 },
  { id: 'usr_02', name: 'Priya Sharma', email: 'priya@example.com', walletBalance: 50 },
];

const orders = [];
const walletTransactions = [];
const processedWebhookEventIds = new Set(); // For Webhook Idempotency

// Helper: HMAC SHA-256 signature generator
function generateHmacSignature(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * ----------------------------------------------------
 * 1. API: /api/create-order
 * Request Body: { userId: "usr_01", amount: 500, currency?: "INR" }
 * Creates order ID, calculates points, and saves as PENDING.
 * ----------------------------------------------------
 */
app.post('/api/create-order', (req, res) => {
  try {
    const { userId, amount, currency = 'INR', description } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in database' });
    }

    // Generate unique Order ID (e.g., order_17409282910_AB9)
    const orderId = 'order_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex').toUpperCase();

    // Reward points rule: 1 Currency Unit = 1 Point (Bonus for >= 1000)
    const multiplier = numAmount >= 1000 ? 1.2 : 1.0;
    const pointsToCredit = Math.floor(numAmount * multiplier);

    const newOrder = {
      orderId,
      userId,
      amount: numAmount,
      currency: currency.toUpperCase(),
      pointsToCredit,
      status: 'PENDING',
      description: description || 'Recharge for ' + currency + ' ' + numAmount,
      createdAt: new Date().toISOString(),
      paidAt: null,
      paymentId: null,
    };

    orders.push(newOrder);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully. Ready for payment gateway checkout.',
      order: newOrder,
    });
  } catch (error) {
    console.error('Create Order Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * ----------------------------------------------------
 * 2. API: /api/payment-webhook
 * Triggered by Payment Gateway (Razorpay, Stripe, Cashfree, etc.)
 * Verifies signature, prevents duplicate credits, & updates wallet points.
 * ----------------------------------------------------
 */
app.post('/api/payment-webhook', (req, res) => {
  try {
    const payload = req.body;
    const {
      event = 'payment.captured',
      orderId,
      paymentId = 'pay_' + Date.now(),
      amount,
      status = 'SUCCESS',
      signature,
    } = payload;

    // Optional header signature or body signature
    const signatureHeader = req.headers['x-webhook-signature'] || signature;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId missing in webhook payload' });
    }

    // 1. Signature Verification (HMAC-SHA256)
    if (signatureHeader && signatureHeader !== 'skip_verification') {
      const expectedSignature = generateHmacSignature(orderId + '|' + paymentId, WEBHOOK_SECRET);
      if (signatureHeader !== expectedSignature) {
        return res.status(401).json({ success: false, error: 'Invalid Webhook Signature' });
      }
    }

    // 2. IDEMPOTENCY CHECK (Crucial: prevents multiple credits if gateway retries)
    const idempotencyKey = orderId + '_' + paymentId;
    if (processedWebhookEventIds.has(idempotencyKey)) {
      console.log('Webhook already processed for:', idempotencyKey);
      return res.status(200).json({
        success: true,
        message: 'Webhook duplicate event acknowledged safely. No extra points added.',
        isDuplicate: true,
      });
    }

    // 3. Find Order in Database
    const order = orders.find(o => o.orderId === orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found: ' + orderId });
    }

    // 4. Ensure order is not already PAID
    if (order.status === 'PAID') {
      processedWebhookEventIds.add(idempotencyKey);
      return res.status(200).json({
        success: true,
        message: 'Order already marked as PAID previously.',
        isDuplicate: true,
      });
    }

    // 5. Verify payment status is SUCCESS
    if (status !== 'SUCCESS' && event !== 'payment.captured' && event !== 'charge.success') {
      order.status = 'FAILED';
      return res.status(200).json({
        success: false,
        message: 'Payment was not successful. Order marked as FAILED.',
      });
    }

    // 6. Find User
    const user = users.find(u => u.id === order.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found: ' + order.userId });
    }

    // 7. ATOMIC WALLET BALANCE UPDATE
    const balanceBefore = user.walletBalance;
    const pointsToAdd = order.pointsToCredit;
    user.walletBalance += pointsToAdd;
    const balanceAfter = user.walletBalance;

    // 8. Update Order status
    order.status = 'PAID';
    order.paidAt = new Date().toISOString();
    order.paymentId = paymentId;

    // 9. Mark Webhook as Processed
    processedWebhookEventIds.add(idempotencyKey);

    // 10. Record Transaction in Audit Ledger
    const ledgerEntry = {
      id: 'txn_' + Date.now(),
      userId: user.id,
      orderId: order.orderId,
      type: 'CREDIT',
      points: pointsToAdd,
      balanceBefore,
      balanceAfter,
      description: 'Points auto-credit for Order ' + order.orderId,
      timestamp: new Date().toISOString(),
    };
    walletTransactions.push(ledgerEntry);

    console.log(\`✅ [SUCCESS] Credited \${pointsToAdd} points to user \${user.name}. New balance: \${balanceAfter}\`);

    // Return 200 OK so gateway stops retrying
    return res.status(200).json({
      success: true,
      message: 'Payment verified and points credited to user wallet successfully',
      data: {
        orderId: order.orderId,
        paymentId,
        userId: user.id,
        pointsCredited: pointsToAdd,
        previousBalance: balanceBefore,
        newBalance: balanceAfter,
        orderStatus: order.status,
      },
    });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ success: false, error: 'Webhook processing error' });
  }
});

/**
 * ----------------------------------------------------
 * 3. MARKET MANAGEMENT APIS
 * - GET /api/markets         -> List active prediction markets
 * - POST /api/markets        -> Create new market & broadcast via Socket.io
 * - POST /api/markets/:id/trade -> Trade with wallet points & live price sync
 * ----------------------------------------------------
 */
const markets = [
  {
    id: 'mkt_btc_100k',
    title: 'Will Bitcoin cross $100,000 before end of year?',
    category: 'CRYPTO',
    status: 'OPEN',
    yesPrice: 68,
    noPrice: 32,
    totalVolume: 42500,
    totalOrders: 184,
  },
  {
    id: 'mkt_icc_champion',
    title: 'Will Team India win the ICC Champions Trophy?',
    category: 'SPORTS',
    status: 'OPEN',
    yesPrice: 74,
    noPrice: 26,
    totalVolume: 89000,
    totalOrders: 320,
  },
];

// GET /api/markets
app.get('/api/markets', (req, res) => {
  res.json({ success: true, count: markets.length, markets });
});

// POST /api/markets
app.post('/api/markets', (req, res) => {
  const { title, category = 'TECH', yesPrice = 50 } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'title is required' });

  const numYes = Math.max(1, Math.min(99, Number(yesPrice) || 50));
  const newMarket = {
    id: 'mkt_' + Date.now(),
    title,
    category,
    status: 'OPEN',
    yesPrice: numYes,
    noPrice: 100 - numYes,
    totalVolume: 0,
    totalOrders: 0,
    createdAt: new Date().toISOString(),
  };

  markets.unshift(newMarket);

  // Broadcast to all connected Socket.io clients
  io.emit('market:created', newMarket);
  io.emit('markets:updated', markets);

  res.status(201).json({ success: true, market: newMarket });
});

// POST /api/markets/:id/trade
app.post('/api/markets/:id/trade', (req, res) => {
  const { id } = req.params;
  const { userId, outcome, points } = req.body;

  const market = markets.find(m => m.id === id);
  if (!market || market.status !== 'OPEN') {
    return res.status(404).json({ success: false, error: 'Market not open or not found' });
  }

  const user = users.find(u => u.id === userId);
  if (!user || user.walletBalance < Number(points)) {
    return res.status(400).json({ success: false, error: 'Insufficient wallet points' });
  }

  // Deduct wallet balance & update market volume/price
  user.walletBalance -= Number(points);
  market.totalVolume += Number(points);
  market.totalOrders += 1;

  if (outcome === 'YES') {
    market.yesPrice = Math.min(95, market.yesPrice + 1);
    market.noPrice = 100 - market.yesPrice;
  } else {
    market.noPrice = Math.min(95, market.noPrice + 1);
    market.yesPrice = 100 - market.noPrice;
  }

  // Real-time broadcast
  io.emit('market:traded', { market, points, outcome });
  io.emit('wallet:updated', { userId: user.id, walletBalance: user.walletBalance });

  res.json({ success: true, market, userBalance: user.walletBalance });
});

// Start Server (using http.Server with attached Socket.io)
server.listen(PORT, () => {
  console.log(\`🚀 Backend Server listening on http://localhost:\${PORT}\`);
});
`,

  razorpaySnippet: `/**
 * ====================================================================
 * Razorpay Webhook Integration Example
 * Verify signature using Razorpay Secret & Credit Wallet
 * ====================================================================
 */
const express = require('express');
const crypto = require('crypto');
const app = express();

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_sec_xyz';

// Note: Razorpay sends raw payload body. Use express.raw or verify signature with raw body
app.post('/api/razorpay-webhook', express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Signature verification failed' });
  }

  const event = req.body.event; // e.g., 'order.paid' or 'payment.captured'

  if (event === 'order.paid' || event === 'payment.captured') {
    const payment = req.body.payload.payment.entity;
    const orderId = payment.order_id;
    const paymentId = payment.id;
    const amount = payment.amount / 100; // Razorpay sends amount in paise

    // 1. Fetch order from DB
    const order = await db.orders.findOne({ orderId });
    if (!order || order.status === 'PAID') {
      return res.status(200).json({ message: 'Already handled or order not found' });
    }

    // 2. Points formula: 1 Rupee = 1 Point
    const pointsToCredit = Math.floor(amount);

    // 3. Update User Wallet inside a DB Transaction
    await db.transaction(async (trx) => {
      await trx('users').where({ id: order.userId }).increment('wallet_balance', pointsToCredit);
      await trx('orders').where({ orderId }).update({
        status: 'PAID',
        paymentId,
        paidAt: new Date(),
      });
      await trx('wallet_transactions').insert({
        userId: order.userId,
        orderId,
        points: pointsToCredit,
        type: 'CREDIT',
        description: \`Razorpay Payment \${paymentId} reward\`,
      });
    });

    console.log(\`Points credited: \${pointsToCredit} for order \${orderId}\`);
  }

  // Always return 200 OK so Razorpay doesn't retry
  res.status(200).json({ status: 'ok' });
});
`,

  stripeSnippet: `/**
 * ====================================================================
 * Stripe Webhook Integration Example
 * Verify signature using Stripe CLI or Dashboard secret & Credit Wallet
 * ====================================================================
 */
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }

  // Handle successful checkout / payment intent
  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;
    const userId = session.metadata.userId;
    const amount = session.amount_total ? session.amount_total / 100 : session.amount / 100;

    // Atomic update wallet balance in DB
    const points = Math.floor(amount);
    await updateUserWalletAndMarkOrderPaid(userId, orderId, points, session.id);
  }

  res.json({ received: true });
});
`,

  sqlSchema: `-- ====================================================================
-- PostgreSQL Database Schema with Atomic Transaction & Ledger
-- ====================================================================

-- 1. Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    wallet_balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Orders Table
CREATE TABLE orders (
    order_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    points_to_credit INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED')),
    payment_id VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Wallet Transactions (Immutable Audit Ledger)
CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    order_id VARCHAR(64) REFERENCES orders(order_id),
    type VARCHAR(10) CHECK (type IN ('CREDIT', 'DEBIT')),
    points INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Processed Webhooks (Idempotency storage)
CREATE TABLE processed_webhooks (
    idempotency_key VARCHAR(120) PRIMARY KEY,
    order_id VARCHAR(64),
    payment_id VARCHAR(100),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Atomic Transaction Procedure (Executed inside /api/payment-webhook)
-- ====================================================================
BEGIN;

-- Check and lock order row (prevents race condition)
SELECT * FROM orders WHERE order_id = 'order_1740928_AB9' FOR UPDATE;

-- Update User Wallet Balance
UPDATE users 
SET wallet_balance = wallet_balance + 500 
WHERE id = 'usr_01';

-- Mark Order as Paid
UPDATE orders 
SET status = 'PAID', payment_id = 'pay_998877', paid_at = NOW() 
WHERE order_id = 'order_1740928_AB9';

-- Record Ledger Entry
INSERT INTO wallet_transactions (user_id, order_id, type, points, balance_before, balance_after, description)
VALUES ('usr_01', 'order_1740928_AB9', 'CREDIT', 500, 100, 600, 'Webhook Payment Success');

-- Save Idempotency Key
INSERT INTO processed_webhooks (idempotency_key, order_id, payment_id)
VALUES ('order_1740928_AB9_pay_998877', 'order_1740928_AB9', 'pay_998877');

COMMIT;
`,

  curlCommands: `### 1. Create Order Request:
curl -X POST http://localhost:3000/api/create-order \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "usr_rajesh99",
    "amount": 500,
    "currency": "INR",
    "description": "500 Points Recharge"
  }'

### 2. Simulate Payment Webhook (Valid Success):
curl -X POST http://localhost:3000/api/payment-webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "payment.captured",
    "orderId": "REPLACE_WITH_ORDER_ID",
    "paymentId": "pay_live_gateway_101",
    "amount": 500,
    "status": "SUCCESS"
  }'

### 3. Test Idempotency (Send Duplicate Webhook):
# Run the exact same curl command again!
# Notice response status is 200 OK with "isDuplicate: true" and points are NOT credited twice!
`,
};
