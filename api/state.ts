import type { ServerState, GlobalStats, PinnedLink, QueuedLink, FallenKing, ActivityEvent } from '../src/types';
import { loadState } from '../server/db';

const DEFAULT_SEED_KING: PinnedLink = {
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

const DEFAULT_SEED_STATS: GlobalStats = {
  totalBurnedAllTime: 26.5,
  totalReigns: 1,
  highestRateEver: 216,
  longestReignSeconds: 3600,
  currentSpectators: 1,
};

export default async function handler(req: any, res: any) {
  const rawKeyId = process.env.RAZORPAY_KEY_ID || '';
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  let state = await loadState();

  const currentKing = state?.currentKing ? { ...state.currentKing } : DEFAULT_SEED_KING;
  if (currentKing && 'manageKey' in currentKing) {
    delete (currentKing as any).manageKey;
  }

  const queue = (state?.queue || []).map((q) => {
    const safe = { ...q };
    if ('manageKey' in safe) delete (safe as any).manageKey;
    return safe;
  });

  const fallenKings = state?.fallenKings || [];
  const activity = state?.activity || [];
  const stats = state?.stats || DEFAULT_SEED_STATS;

  const minRate = currentKing ? Math.max(10, Math.ceil(currentKing.ratePerHour * 1.1)) : 10;

  const responsePayload: ServerState = {
    currentKing,
    queue,
    fallenKings,
    activity,
    stats: {
      totalBurnedAllTime: stats.totalBurnedAllTime || 0,
      totalReigns: stats.totalReigns || 0,
      highestRateEver: stats.highestRateEver || 0,
      longestReignSeconds: stats.longestReignSeconds || 0,
      currentSpectators: 1,
    },
    minRate,
    serverTime: Date.now(),
    isDemoMode: !rawKeyId || !rawKeySecret,
    razorpayEnabled: Boolean(rawKeyId && rawKeySecret),
    razorpayTestMode: rawKeyId.startsWith('rzp_test_'),
    razorpayKeyId: null, // Never expose keyId on state endpoint; sent only at checkout creation
    stripeEnabled: Boolean(rawKeyId && rawKeySecret),
    stripeTestMode: rawKeyId.startsWith('rzp_test_'),
  };

  return res.status(200).json(responsePayload);
}

