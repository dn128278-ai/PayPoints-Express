export interface User {
  id: string;
  name: string;
  email: string;
  walletBalance: number;
  currency: string;
  avatar: string;
  createdAt: string;
}

export interface Order {
  orderId: string;
  userId: string;
  amount: number;
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
  yesPrice: number;
  noPrice: number;
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

export interface DatabaseState {
  users: User[];
  orders: Order[];
  walletTransactions: WalletTransaction[];
  webhookLogs: WebhookLog[];
  markets: Market[];
  webhookSecret: string;
}
