import type { ServerState, GlobalStats, PinnedLink, QueuedLink, FallenKing, ActivityEvent } from '../src/types';

// In-memory state for serverless execution
let serverlessKing: PinnedLink | null = {
  id: 'king-seed-1',
  title: 'DropCraft — Instant AI Landing Pages',
  url: 'https://dropcraft.page',
  tagline: 'Generate high-converting SaaS landing pages in 60s',
  author: '@bot_dropcraft',
  authorHandle: 'bot_dropcraft',
  ratePerHour: 216,
  balance: 18.5,
  initialDeposit: 45,
  totalBurned: 26.5,
  crownedAt: Date.now() - 3600000,
  lastTickAt: Date.now(),
  accentColor: 'amber',
  reignSeconds: 3600,
  status: 'active',
  views: 128,
  clicks: 42,
  isSeed: true,
};

let serverlessStats: GlobalStats = {
  totalBurnedAllTime: 26.5,
  totalReigns: 1,
  highestRateEver: 216,
  longestReignSeconds: 3600,
  currentSpectators: 3,
};

const serverlessQueue: QueuedLink[] = [];
const serverlessFallenKings: FallenKing[] = [];
const serverlessActivity: ActivityEvent[] = [
  {
    id: 'evt-init-1',
    type: 'crown',
    title: 'DropCraft seized #1 Crown',
    description: 'Initial seed bid placed at $216/hr with $45 fuel deposit',
    timestamp: Date.now() - 3600000,
    author: '@bot_dropcraft',
    isBotSimulation: true,
  },
];

export default function handler(req: any, res: any) {
  const rawKeyId = process.env.RAZORPAY_KEY_ID || '';
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const responsePayload: ServerState = {
    currentKing: serverlessKing,
    queue: serverlessQueue,
    fallenKings: serverlessFallenKings,
    activity: serverlessActivity,
    stats: {
      totalBurnedAllTime: serverlessStats.totalBurnedAllTime || 0,
      totalReigns: serverlessStats.totalReigns || 0,
      highestRateEver: serverlessStats.highestRateEver || 0,
      longestReignSeconds: serverlessStats.longestReignSeconds || 0,
      currentSpectators: Math.max(1, serverlessStats.currentSpectators || 1),
    },
    minRate: serverlessKing ? Math.max(20, Math.ceil(serverlessKing.ratePerHour * 1.1)) : 20,
    serverTime: Date.now(),
    isDemoMode: !rawKeyId || !rawKeySecret,
    razorpayEnabled: Boolean(rawKeyId && rawKeySecret),
    razorpayTestMode: rawKeyId.startsWith('rzp_test_'),
    razorpayKeyId: rawKeyId || null,
    stripeEnabled: Boolean(rawKeyId && rawKeySecret),
    stripeTestMode: rawKeyId.startsWith('rzp_test_'),
  };

  return res.status(200).json(responsePayload);
}

