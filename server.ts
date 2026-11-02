import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- DATABASE TYPES ---
export interface User {
  id: string;
  name: string;
  email: string;
  walletBalance: number; // In Points
  currency: string;
  avatar: string;
  createdAt: string;
}

export interface Order {
  orderId: string;
  userId: string;
  amount: number; // e.g. INR or USD
  currency: string;
  pointsToCredit: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  description?: string;
  createdAt: string;
  paidAt: string | null;
  paymentId: string | null;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  orderId: string;
  type: 'CREDIT' | 'DEBIT';
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  timestamp: string;
}

export interface WebhookLog {
  id: string;
  receivedAt: string;
  eventId: string;
  orderId: string;
  paymentId: string;
  status: 'PROCESSED' | 'DUPLICATE_IGNORED' | 'SIGNATURE_FAILED' | 'ORDER_NOT_FOUND' | 'ERROR';
  pointsCredited: number;
  signatureValid: boolean;
  payload: any;
  message: string;
}

export interface Market {
  id: string;
  title: string;
  category: 'CRYPTO' | 'SPORTS' | 'FINANCE' | 'TECH' | 'POLITICS' | 'ENTERTAINMENT';
  status: 'OPEN' | 'CLOSED' | 'RESOLVED' | 'SUSPENDED';
  yesPrice: number; // Probability / Price in Points (e.g. 65)
  noPrice: number;  // (100 - yesPrice, e.g. 35)
  totalVolume: number;
  totalOrders: number;
  description: string;
  createdAt: string;
  expiresAt: string;
  resolvedOutcome?: 'YES' | 'NO' | null;
  liquidity: number;
}

export interface MarketTrade {
  id: string;
  marketId: string;
  userId: string;
  outcome: 'YES' | 'NO';
  pointsInvested: number;
  shares: number;
  pricePerShare: number;
  timestamp: string;
}

// Initial Database Data
const initialUsers: User[] = [
  {
    id: 'usr_rajesh99',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@example.com',
    walletBalance: 250,
    currency: 'INR',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'usr_priya21',
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    walletBalance: 120,
    currency: 'INR',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'usr_amit77',
    name: 'Amit Verma',
    email: 'amit.verma@example.com',
    walletBalance: 0,
    currency: 'INR',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

const initialMarkets: Market[] = [
  {
    id: 'mkt_btc_100k',
    title: 'Will Bitcoin cross $100,000 before end of year?',
    category: 'CRYPTO',
    status: 'OPEN',
    yesPrice: 68,
    noPrice: 32,
    totalVolume: 42500,
    totalOrders: 184,
    description: 'Resolves YES if BTC/USD spot index touches or exceeds $100,000 before expiry date.',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
    resolvedOutcome: null,
    liquidity: 100000,
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
    description: 'Resolves YES if India officially claims the tournament trophy.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 20).toISOString(),
    resolvedOutcome: null,
    liquidity: 250000,
  },
  {
    id: 'mkt_ai_coders',
    title: 'Will autonomous AI agents replace junior devs in 2026?',
    category: 'TECH',
    status: 'OPEN',
    yesPrice: 42,
    noPrice: 58,
    totalVolume: 31200,
    totalOrders: 142,
    description: 'Based on leading industry benchmarks and global developer employment reports.',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 60).toISOString(),
    resolvedOutcome: null,
    liquidity: 75000,
  },
];

// In-Memory Database store
let users: User[] = JSON.parse(JSON.stringify(initialUsers));
let orders: Order[] = [
  {
    orderId: 'ord_demo_init_01',
    userId: 'usr_rajesh99',
    amount: 500,
    currency: 'INR',
    pointsToCredit: 500,
    status: 'PAID',
    description: 'Initial Wallet Recharge (Completed)',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    paidAt: new Date(Date.now() - 86400000 * 2 + 120000).toISOString(),
    paymentId: 'pay_demo_gateway_998',
  },
];
let walletTransactions: WalletTransaction[] = [
  {
    id: 'txn_init_001',
    userId: 'usr_rajesh99',
    orderId: 'ord_demo_init_01',
    type: 'CREDIT',
    points: 250,
    balanceBefore: 0,
    balanceAfter: 250,
    description: 'Order ord_demo_init_01 payment success reward',
    timestamp: new Date(Date.now() - 86400000 * 2 + 120000).toISOString(),
  },
];
let webhookLogs: WebhookLog[] = [];
let markets: Market[] = JSON.parse(JSON.stringify(initialMarkets));
let marketTrades: MarketTrade[] = [];
const processedWebhookEventIds = new Set<string>();

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'secret_webhook_key_2026';

// Helper to compute HMAC SHA256 signature
export function computeSignature(payloadString: string, secret: string = WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Create HTTP server instance for Express & Socket.io
  const httpServer = http.createServer(app);

  // Initialize Socket.io server with CORS enabled
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
    transports: ['polling', 'websocket'],
  });

  // Socket.io connection lifecycle & real-time market synchronization
  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Send initial handshake status and full active markets list
    socket.emit('status', {
      message: 'Connected to PayPoints Express Real-time Socket server',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });
    socket.emit('markets:init', markets);

    // Clients can subscribe to specific market updates
    socket.on('market:subscribe', (marketId: string) => {
      socket.join(`market:${marketId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined market:${marketId}`);
    });

    socket.on('market:unsubscribe', (marketId: string) => {
      socket.leave(`market:${marketId}`);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  // Preserve raw body for webhook signature verification if needed
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // ==========================================
  // ROOT & HEALTH CHECK ROUTES
  // Clean status JSON on GET / - No dist/index.html - Zero ENOENT on Render
  // ==========================================
  let viteDevServer: ViteDevServer | null = null;

  app.get('/', (req: Request, res: Response, next) => {
    // If explicitly requested ?ui=true in development mode, allow Vite to render dashboard
    if (req.query.ui === 'true' && viteDevServer) {
      return next();
    }

    res.status(200).json({
      status: 'online',
      message: 'PayPoints Express Backend API Server with Payments & Real-time Market Management',
      service: 'order-payment-webhook-markets-api',
      socketIo: 'active',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      endpoints: {
        root: 'GET /',
        health: 'GET /health',
        markets: {
          list: 'GET /api/markets',
          getById: 'GET /api/markets/:id',
          create: 'POST /api/markets',
          updateStatus: 'PATCH /api/markets/:id/status',
          tradeWithPoints: 'POST /api/markets/:id/trade',
        },
        payments: {
          createOrder: 'POST /api/create-order',
          paymentWebhook: 'POST /api/payment-webhook',
          generateSignature: 'POST /api/generate-signature',
        },
        databaseState: 'GET /api/database-state',
        resetDatabase: 'POST /api/reset-database',
        socketIoStatus: 'WS /socket.io/',
        interactiveDashboard: 'GET /?ui=true',
      },
    });
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      marketsCount: markets.length,
      usersCount: users.length,
    });
  });

  // ==========================================
  // 1. MARKET MANAGEMENT API ROUTES
  // GET /api/markets  -> List markets with search/filtering
  // GET /api/markets/:id -> Single market details
  // POST /api/markets -> Create new market & broadcast via Socket.io
  // PATCH /api/markets/:id/status -> Update status / resolution & broadcast
  // POST /api/markets/:id/trade -> Place trade with PayPoints wallet points & broadcast
  // ==========================================

  // GET /api/markets
  app.get('/api/markets', (req: Request, res: Response) => {
    try {
      const { status, category, search, sortBy } = req.query;

      let filtered = [...markets];

      if (status && typeof status === 'string') {
        filtered = filtered.filter((m) => m.status.toUpperCase() === status.toUpperCase());
      }

      if (category && typeof category === 'string') {
        filtered = filtered.filter((m) => m.category.toUpperCase() === category.toUpperCase());
      }

      if (search && typeof search === 'string') {
        const query = search.toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.title.toLowerCase().includes(query) ||
            m.description.toLowerCase().includes(query) ||
            m.id.toLowerCase().includes(query)
        );
      }

      if (sortBy === 'volume') {
        filtered.sort((a, b) => b.totalVolume - a.totalVolume);
      } else if (sortBy === 'orders') {
        filtered.sort((a, b) => b.totalOrders - a.totalOrders);
      } else if (sortBy === 'recent') {
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      res.status(200).json({
        success: true,
        count: filtered.length,
        markets: filtered,
      });
    } catch (err: any) {
      console.error('Error fetching markets:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error fetching markets',
        details: err?.message,
      });
    }
  });

  // GET /api/markets/:id
  app.get('/api/markets/:id', (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const market = markets.find((m) => m.id === id);

      if (!market) {
        res.status(404).json({
          success: false,
          error: `Market with ID '${id}' not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        market,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: err?.message,
      });
    }
  });

  // POST /api/markets
  app.post('/api/markets', (req: Request, res: Response): void => {
    try {
      const {
        title,
        category = 'TECH',
        description = '',
        expiresAt,
        yesPrice = 50,
        liquidity = 50000,
      } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'title is required and cannot be empty (Market ka title daalna zaroori hai)',
        });
        return;
      }

      const numericYes = Math.max(1, Math.min(99, Number(yesPrice) || 50));
      const numericNo = 100 - numericYes;
      const numericLiquidity = Math.max(1000, Number(liquidity) || 50000);

      // Expiry default to 30 days from now if not provided
      const finalExpiresAt = expiresAt
        ? new Date(expiresAt).toISOString()
        : new Date(Date.now() + 86400000 * 30).toISOString();

      const validCategories = ['CRYPTO', 'SPORTS', 'FINANCE', 'TECH', 'POLITICS', 'ENTERTAINMENT'];
      const finalCategory = validCategories.includes(String(category).toUpperCase())
        ? (String(category).toUpperCase() as Market['category'])
        : 'TECH';

      const timestamp = Date.now();
      const randomSuffix = crypto.randomBytes(3).toString('hex').toLowerCase();
      const id = `mkt_${timestamp}_${randomSuffix}`;

      const newMarket: Market = {
        id,
        title: title.trim(),
        category: finalCategory,
        status: 'OPEN',
        yesPrice: numericYes,
        noPrice: numericNo,
        totalVolume: 0,
        totalOrders: 0,
        description: description.trim() || `Prediction market for: ${title.trim()}`,
        createdAt: new Date().toISOString(),
        expiresAt: finalExpiresAt,
        resolvedOutcome: null,
        liquidity: numericLiquidity,
      };

      markets.unshift(newMarket);

      // Broadcast new market to all connected Socket.io clients
      io.emit('market:created', newMarket);
      io.emit('markets:updated', markets);

      console.log(`[Market Created] ${newMarket.id} - "${newMarket.title}" broadcasted to Socket.io`);

      res.status(201).json({
        success: true,
        message: 'Market created successfully and broadcasted via Socket.io',
        market: newMarket,
      });
    } catch (err: any) {
      console.error('Error creating market:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error creating market',
        details: err?.message,
      });
    }
  });

  // PATCH /api/markets/:id/status
  app.patch('/api/markets/:id/status', (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const { status, resolvedOutcome } = req.body;

      const market = markets.find((m) => m.id === id);
      if (!market) {
        res.status(404).json({
          success: false,
          error: `Market with ID '${id}' not found`,
        });
        return;
      }

      const validStatuses = ['OPEN', 'CLOSED', 'RESOLVED', 'SUSPENDED'];
      if (status && validStatuses.includes(String(status).toUpperCase())) {
        market.status = String(status).toUpperCase() as Market['status'];
      }

      if (resolvedOutcome && ['YES', 'NO'].includes(String(resolvedOutcome).toUpperCase())) {
        market.resolvedOutcome = String(resolvedOutcome).toUpperCase() as 'YES' | 'NO';
        market.status = 'RESOLVED';
        if (market.resolvedOutcome === 'YES') {
          market.yesPrice = 100;
          market.noPrice = 0;
        } else {
          market.yesPrice = 0;
          market.noPrice = 100;
        }
      }

      // Broadcast market status change to all connected clients
      io.emit('market:status_changed', {
        id: market.id,
        status: market.status,
        resolvedOutcome: market.resolvedOutcome,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
      });
      io.to(`market:${market.id}`).emit('market:updated', market);
      io.emit('markets:updated', markets);

      res.status(200).json({
        success: true,
        message: `Market ${id} status updated to ${market.status}`,
        market,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Error updating market status',
        details: err?.message,
      });
    }
  });

  // POST /api/markets/:id/trade
  // Places trade using PayPoints wallet points and broadcasts live market price movement!
  app.post('/api/markets/:id/trade', (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const { userId, outcome, points } = req.body;

      const market = markets.find((m) => m.id === id);
      if (!market) {
        res.status(404).json({ success: false, error: `Market '${id}' not found` });
        return;
      }

      if (market.status !== 'OPEN') {
        res.status(400).json({ success: false, error: `Market is ${market.status}. Trades are only allowed when OPEN.` });
        return;
      }

      const numPoints = Number(points);
      if (!numPoints || numPoints <= 0) {
        res.status(400).json({ success: false, error: 'Points must be greater than 0' });
        return;
      }

      const normalizedOutcome = String(outcome).toUpperCase();
      if (normalizedOutcome !== 'YES' && normalizedOutcome !== 'NO') {
        res.status(400).json({ success: false, error: "outcome must be 'YES' or 'NO'" });
        return;
      }

      const user = users.find((u) => u.id === userId);
      if (!user) {
        res.status(404).json({ success: false, error: `User '${userId}' not found` });
        return;
      }

      if (user.walletBalance < numPoints) {
        res.status(400).json({
          success: false,
          error: `Insufficient wallet balance. User has ${user.walletBalance} pts, requested ${numPoints} pts. Create an order and recharge first!`,
        });
        return;
      }

      // Deduct points from user's wallet
      const balanceBefore = user.walletBalance;
      user.walletBalance -= numPoints;
      const balanceAfter = user.walletBalance;

      // Price calculation formula based on outcome and volume
      const currentPrice = normalizedOutcome === 'YES' ? market.yesPrice : market.noPrice;
      const shares = Math.floor((numPoints / currentPrice) * 100);

      // Price impact: slight movement towards the bought side
      const priceImpact = Math.min(5, Math.max(1, Math.floor(numPoints / 200)));
      if (normalizedOutcome === 'YES') {
        market.yesPrice = Math.min(95, market.yesPrice + priceImpact);
        market.noPrice = 100 - market.yesPrice;
      } else {
        market.noPrice = Math.min(95, market.noPrice + priceImpact);
        market.yesPrice = 100 - market.noPrice;
      }

      market.totalVolume += numPoints;
      market.totalOrders += 1;

      // Log wallet transaction
      const txnId = `txn_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
      walletTransactions.unshift({
        id: txnId,
        userId: user.id,
        orderId: market.id,
        type: 'DEBIT',
        points: numPoints,
        balanceBefore,
        balanceAfter,
        description: `Purchased ${shares} ${normalizedOutcome} shares in Market ${market.title.slice(0, 30)}...`,
        timestamp: new Date().toISOString(),
      });

      // Record trade
      const tradeRecord: MarketTrade = {
        id: `trd_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        marketId: market.id,
        userId: user.id,
        outcome: normalizedOutcome as 'YES' | 'NO',
        pointsInvested: numPoints,
        shares,
        pricePerShare: currentPrice,
        timestamp: new Date().toISOString(),
      };
      marketTrades.unshift(tradeRecord);

      // Broadcast real-time Socket.io events
      io.emit('market:traded', {
        trade: tradeRecord,
        market: {
          id: market.id,
          yesPrice: market.yesPrice,
          noPrice: market.noPrice,
          totalVolume: market.totalVolume,
          totalOrders: market.totalOrders,
        },
      });

      io.emit('wallet:updated', {
        userId: user.id,
        walletBalance: user.walletBalance,
        pointsDeducted: numPoints,
        transactionId: txnId,
      });

      io.emit('markets:updated', markets);

      res.status(200).json({
        success: true,
        message: `Successfully invested ${numPoints} points in '${normalizedOutcome}' for market ${market.id}`,
        trade: tradeRecord,
        market,
        user: {
          id: user.id,
          name: user.name,
          walletBalance: user.walletBalance,
        },
      });
    } catch (err: any) {
      console.error('Error executing market trade:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error executing trade',
        details: err?.message,
      });
    }
  });

  // ==========================================
  // 2. PAYMENT API: /api/create-order
  // Creates an order with unique ID & calculates points
  // ==========================================
  app.post('/api/create-order', (req: Request, res: Response): void => {
    try {
      const { userId, amount, currency = 'INR', description } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId is required (User ID daalna zaroori hai)',
        });
        return;
      }

      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        res.status(400).json({
          success: false,
          error: 'amount must be a positive number greater than 0 (Valid amount enter karein)',
        });
        return;
      }

      // Check user existence
      const user = users.find((u) => u.id === userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: `User not found with ID '${userId}'`,
        });
        return;
      }

      // Generate unique Order ID
      const timestamp = Date.now();
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const orderId = `order_${timestamp}_${randomSuffix}`;

      // Points calculation formula:
      // Default: 1 Rupee / Currency Unit = 1 Point
      // Bonus: If amount >= 1000, 1.2x points multiplier
      const multiplier = numericAmount >= 1000 ? 1.2 : 1.0;
      const pointsToCredit = Math.floor(numericAmount * multiplier);

      const newOrder: Order = {
        orderId,
        userId,
        amount: numericAmount,
        currency: currency.toUpperCase(),
        pointsToCredit,
        status: 'PENDING',
        description: description || `Points recharge for ₹${numericAmount}`,
        createdAt: new Date().toISOString(),
        paidAt: null,
        paymentId: null,
      };

      orders.unshift(newOrder);

      // Broadcast order creation event via Socket.io
      io.emit('order:created', newOrder);

      res.status(201).json({
        success: true,
        message: 'Order created successfully. Pending payment webhook confirmation.',
        order: newOrder,
        user: {
          id: user.id,
          name: user.name,
          currentWalletBalance: user.walletBalance,
        },
      });
    } catch (err: any) {
      console.error('Error in /api/create-order:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error while creating order',
        details: err?.message,
      });
    }
  });

  // ==========================================
  // 3. PAYMENT WEBHOOK: /api/payment-webhook
  // Listens for payment gateway webhook event,
  // verifies signature, ensures idempotency,
  // updates order status, and credits user wallet!
  // ==========================================
  app.post('/api/payment-webhook', (req: Request, res: Response): void => {
    try {
      const payload = req.body;
      const signatureHeader =
        (req.headers['x-webhook-signature'] as string) ||
        (req.headers['x-razorpay-signature'] as string) ||
        payload.signature;

      const {
        event = 'payment.captured',
        orderId,
        paymentId = `pay_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        amount,
        status = 'SUCCESS',
      } = payload;

      if (!orderId) {
        res.status(400).json({
          success: false,
          error: 'Webhook payload missing orderId',
        });
        return;
      }

      // Check optional HMAC signature verification
      let signatureValid = true;
      if (signatureHeader && signatureHeader !== 'skip_verification') {
        const payloadToSign = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const expectedSignature = computeSignature(payloadToSign, WEBHOOK_SECRET);

        // Also check if signature matches orderId + paymentId HMAC format (like Razorpay)
        const orderPaymentSign = computeSignature(`${orderId}|${paymentId}`, WEBHOOK_SECRET);

        if (signatureHeader !== expectedSignature && signatureHeader !== orderPaymentSign) {
          // Record failed signature attempt in webhook logs
          const logEntry: WebhookLog = {
            id: `log_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
            receivedAt: new Date().toISOString(),
            eventId: paymentId,
            orderId,
            paymentId,
            status: 'SIGNATURE_FAILED',
            pointsCredited: 0,
            signatureValid: false,
            payload,
            message: 'HMAC signature verification failed. Request rejected.',
          };
          webhookLogs.unshift(logEntry);

          res.status(401).json({
            success: false,
            error: 'Invalid webhook signature (HMAC signature verify nahi ho paya)',
          });
          return;
        }
      }

      // 1. Check Idempotency (Prevent double-crediting if gateway retries webhook)
      const idempotencyKey = `${orderId}_${paymentId}`;
      if (processedWebhookEventIds.has(idempotencyKey)) {
        const order = orders.find((o) => o.orderId === orderId);
        const user = order ? users.find((u) => u.id === order.userId) : null;

        const logEntry: WebhookLog = {
          id: `log_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          receivedAt: new Date().toISOString(),
          eventId: idempotencyKey,
          orderId,
          paymentId,
          status: 'DUPLICATE_IGNORED',
          pointsCredited: 0,
          signatureValid,
          payload,
          message: 'Webhook event already processed previously (Idempotent response). No duplicate points credited.',
        };
        webhookLogs.unshift(logEntry);

        res.status(200).json({
          success: true,
          message: 'Webhook duplicate event acknowledged safely (Idempotent). Points already added.',
          isDuplicate: true,
          orderId,
          paymentId,
          currentBalance: user?.walletBalance,
        });
        return;
      }

      // 2. Fetch Order from Database
      const order = orders.find((o) => o.orderId === orderId);
      if (!order) {
        const logEntry: WebhookLog = {
          id: `log_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          receivedAt: new Date().toISOString(),
          eventId: idempotencyKey,
          orderId,
          paymentId,
          status: 'ORDER_NOT_FOUND',
          pointsCredited: 0,
          signatureValid,
          payload,
          message: `Order '${orderId}' not found in database.`,
        };
        webhookLogs.unshift(logEntry);

        res.status(404).json({
          success: false,
          error: `Order with ID '${orderId}' not found in database`,
        });
        return;
      }

      // 3. Verify Order status is not already PAID
      if (order.status === 'PAID') {
        processedWebhookEventIds.add(idempotencyKey);
        const user = users.find((u) => u.id === order.userId);

        const logEntry: WebhookLog = {
          id: `log_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          receivedAt: new Date().toISOString(),
          eventId: idempotencyKey,
          orderId,
          paymentId,
          status: 'DUPLICATE_IGNORED',
          pointsCredited: 0,
          signatureValid,
          payload,
          message: `Order '${orderId}' was already marked PAID. Ignored to prevent duplicate points.`,
        };
        webhookLogs.unshift(logEntry);

        res.status(200).json({
          success: true,
          message: 'Order already marked as PAID. Duplicate webhook ignored.',
          isDuplicate: true,
          order,
          currentBalance: user?.walletBalance,
        });
        return;
      }

      // 4. Verify Payment Status from Webhook
      if (status !== 'SUCCESS' && event !== 'payment.captured' && event !== 'charge.success') {
        order.status = 'FAILED';
        const logEntry: WebhookLog = {
          id: `log_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          receivedAt: new Date().toISOString(),
          eventId: idempotencyKey,
          orderId,
          paymentId,
          status: 'ERROR',
          pointsCredited: 0,
          signatureValid,
          payload,
          message: `Payment status was '${status}' (not success). Order marked FAILED.`,
        };
        webhookLogs.unshift(logEntry);

        res.status(200).json({
          success: false,
          message: 'Payment was not successful. Order marked as FAILED.',
          order,
        });
        return;
      }

      // 5. Fetch User & Update Wallet Balance
      const user = users.find((u) => u.id === order.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: `User associated with order (${order.userId}) not found`,
        });
        return;
      }

      const balanceBefore = user.walletBalance;
      const pointsToAdd = order.pointsToCredit;
      const balanceAfter = balanceBefore + pointsToAdd;

      // ATOMIC UPDATE: Credit user wallet
      user.walletBalance = balanceAfter;

      // Update Order Status
      order.status = 'PAID';
      order.paidAt = new Date().toISOString();
      order.paymentId = paymentId;

      // Mark event as processed (Idempotency storage)
      processedWebhookEventIds.add(idempotencyKey);

      // Create Audit Ledger Entry
      const transactionId = `txn_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
      const ledgerEntry: WalletTransaction = {
        id: transactionId,
        userId: user.id,
        orderId: order.orderId,
        type: 'CREDIT',
        points: pointsToAdd,
        balanceBefore,
        balanceAfter,
        description: `Auto-credited for payment of Order ${order.orderId} (${order.currency} ${order.amount})`,
        timestamp: new Date().toISOString(),
      };
      walletTransactions.unshift(ledgerEntry);

      // Log successful webhook
      const logEntry: WebhookLog = {
        id: `log_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        receivedAt: new Date().toISOString(),
        eventId: idempotencyKey,
        orderId,
        paymentId,
        status: 'PROCESSED',
        pointsCredited: pointsToAdd,
        signatureValid,
        payload,
        message: `Successfully credited ${pointsToAdd} points to user ${user.name} (${user.id}). Balance: ${balanceBefore} -> ${balanceAfter}`,
      };
      webhookLogs.unshift(logEntry);

      // Broadcast real-time wallet credited event via Socket.io
      io.emit('wallet:credited', {
        orderId: order.orderId,
        paymentId,
        userId: user.id,
        userName: user.name,
        pointsCredited: pointsToAdd,
        previousBalance: balanceBefore,
        newWalletBalance: balanceAfter,
        orderStatus: order.status,
        transactionId,
      });

      // Return 200 OK to payment gateway
      res.status(200).json({
        success: true,
        message: `Payment verified & ${pointsToAdd} points credited to ${user.name}'s wallet successfully!`,
        data: {
          orderId: order.orderId,
          paymentId,
          userId: user.id,
          userName: user.name,
          pointsCredited: pointsToAdd,
          previousBalance: balanceBefore,
          newWalletBalance: balanceAfter,
          orderStatus: order.status,
          creditedAt: ledgerEntry.timestamp,
          transactionId,
        },
      });
    } catch (err: any) {
      console.error('Error in /api/payment-webhook:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error processing payment webhook',
        details: err?.message,
      });
    }
  });

  // ==========================================
  // 4. HELPER APIS (for live UI, telemetry, and debugging)
  // ==========================================
  app.get('/api/database-state', (_req: Request, res: Response) => {
    res.json({
      success: true,
      users,
      orders,
      walletTransactions,
      webhookLogs,
      markets,
      marketTrades,
      webhookSecret: WEBHOOK_SECRET,
    });
  });

  app.post('/api/reset-database', (_req: Request, res: Response) => {
    users = JSON.parse(JSON.stringify(initialUsers));
    orders = [
      {
        orderId: 'ord_demo_init_01',
        userId: 'usr_rajesh99',
        amount: 500,
        currency: 'INR',
        pointsToCredit: 500,
        status: 'PAID',
        description: 'Initial Wallet Recharge (Completed)',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        paidAt: new Date(Date.now() - 86400000 * 2 + 120000).toISOString(),
        paymentId: 'pay_demo_gateway_998',
      },
    ];
    walletTransactions = [
      {
        id: 'txn_init_001',
        userId: 'usr_rajesh99',
        orderId: 'ord_demo_init_01',
        type: 'CREDIT',
        points: 250,
        balanceBefore: 0,
        balanceAfter: 250,
        description: 'Order ord_demo_init_01 payment success reward',
        timestamp: new Date(Date.now() - 86400000 * 2 + 120000).toISOString(),
      },
    ];
    markets = JSON.parse(JSON.stringify(initialMarkets));
    marketTrades = [];
    webhookLogs = [];
    processedWebhookEventIds.clear();

    io.emit('database:reset', { message: 'Database reset to initial state' });
    io.emit('markets:init', markets);

    res.json({
      success: true,
      message: 'Database reset to initial sample state.',
    });
  });

  // Generate valid HMAC signature helper endpoint
  app.post('/api/generate-signature', (req: Request, res: Response) => {
    const { payload, secret = WEBHOOK_SECRET } = req.body;
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signature = computeSignature(str, secret);
    res.json({ success: true, signature, secretUsed: secret });
  });

  // ==========================================
  // 5. FRONTEND SERVING (Vite in development mode only)
  // NOTE: Static serving of dist/index.html is completely removed so
  // Render deployments and Socket.io handshakes never encounter ENOENT errors!
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    viteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteDevServer.middlewares);
  }

  // Use httpServer (with attached Socket.io) to listen on PORT
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`PayPoints Express Backend Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
