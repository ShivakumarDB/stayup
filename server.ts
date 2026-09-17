import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Stripe from 'stripe';
import { createServer as createViteServer } from 'vite';
import { ActivityEvent, FallenKing, GlobalStats, PinnedLink, QueuedLink, ServerState } from './src/types.js';

const app = express();
const PORT = 3000;
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'stayup-state.json');

// Ensure data directory exists for state persistence
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// Lazy Stripe initialization
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// Raw body parser for Stripe webhook signature verification
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

interface InternalPinnedLink extends PinnedLink {
  manageKey?: string;
}

interface InternalQueuedLink extends QueuedLink {
  manageKey?: string;
}

// Initial seed data with clear flags
const DEFAULT_SEED_STATE = {
  currentKing: {
    id: 'king-seed-1',
    title: 'hyperlink.design — Curated Aesthetic Web Inspiration',
    url: 'https://hyperlink.design',
    tagline: 'The daily gallery for avant-garde interfaces & web design',
    author: '@steve_design',
    authorHandle: 'steve_design',
    ratePerHour: 140,
    balance: 38.50,
    initialDeposit: 60.00,
    totalBurned: 21.50,
    crownedAt: Date.now() - 552000,
    lastTickAt: Date.now(),
    accentColor: 'amber',
    reignSeconds: 552,
    status: 'active' as const,
    views: 1842,
    clicks: 319,
    isSeed: true,
    manageKey: 'demo-sample-key-1',
  },
  queue: [
    {
      id: 'queue-1',
      title: 'NeonVim — Minimalist Web-based Code Editor',
      url: 'https://neonvim.dev',
      tagline: 'Blazing fast modal editing in your browser',
      author: '@vim_purist',
      ratePerHour: 110,
      balance: 55.00,
      accentColor: 'cyan',
      submittedAt: Date.now() - 360000,
      isSeed: true,
      manageKey: 'demo-sample-key-2',
    },
    {
      id: 'queue-2',
      title: 'PodPulse — AI Podcast Chapters in 3 Seconds',
      url: 'https://podpulse.fm',
      tagline: 'Never listen to boring podcast ads again',
      author: '@audio_hacker',
      ratePerHour: 85,
      balance: 40.00,
      accentColor: 'emerald',
      submittedAt: Date.now() - 720000,
      isSeed: true,
      manageKey: 'demo-sample-key-3',
    },
  ],
  fallenKings: [
    {
      id: 'fallen-1',
      title: 'PixelDEX — Zero-Fee Solana Swap Engine',
      url: 'https://pixeldex.trade',
      author: '@sol_whale',
      ratePerHour: 125,
      totalBurned: 187.50,
      reignSeconds: 5400,
      crownedAt: Date.now() - 10000000,
      dethronedAt: Date.now() - 4600000,
      cause: 'outbid' as const,
      killerName: '@steve_design',
      isSeed: true,
    },
    {
      id: 'fallen-2',
      title: 'GhostWriter AI — Human-like Copy Generator',
      url: 'https://ghostwriter.ai',
      author: '@sarah_builds',
      ratePerHour: 90,
      totalBurned: 112.50,
      reignSeconds: 4500,
      crownedAt: Date.now() - 18000000,
      dethronedAt: Date.now() - 13500000,
      cause: 'starved' as const,
      isSeed: true,
    },
    {
      id: 'fallen-3',
      title: 'BiteSize Papers — 60-Second ArXiv Summaries',
      url: 'https://bitesizepapers.com',
      author: '@alex_ml',
      ratePerHour: 160,
      totalBurned: 320.00,
      reignSeconds: 7200,
      crownedAt: Date.now() - 32000000,
      dethronedAt: Date.now() - 24800000,
      cause: 'starved' as const,
      isSeed: true,
    },
  ],
  activity: [
    {
      id: 'act-1',
      type: 'crown' as const,
      title: '👑 New King Crowned',
      description: '@steve_design claimed #1 with "hyperlink.design" at $140.00/hr',
      timestamp: Date.now() - 552000,
      rate: 140,
      author: '@steve_design',
    },
    {
      id: 'act-2',
      type: 'refuel' as const,
      title: '⛽ Fuel Injected',
      description: '@steve_design topped up $20.00 into the tank',
      timestamp: Date.now() - 180000,
      amount: 20,
      author: '@steve_design',
    },
  ],
  stats: {
    totalBurnedAllTime: 641.50,
    totalReigns: 14,
    highestRateEver: 220,
    longestReignSeconds: 7200,
    currentSpectators: 1,
  },
};

// Persistent State Storage
let currentKing: InternalPinnedLink | null = null;
let queue: InternalQueuedLink[] = [];
let fallenKings: FallenKing[] = [];
let activity: ActivityEvent[] = [];
let stats: GlobalStats = {
  totalBurnedAllTime: 0,
  totalReigns: 0,
  highestRateEver: 0,
  longestReignSeconds: 0,
  currentSpectators: 1,
};

// Load state from file if exists, else load seed
function loadPersistentState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      const data = JSON.parse(content);
      currentKing = data.currentKing || null;
      queue = data.queue || [];
      fallenKings = data.fallenKings || [];
      activity = data.activity || [];
      stats = data.stats || DEFAULT_SEED_STATE.stats;
      console.log('Successfully loaded persistent state from', STATE_FILE);
      return;
    }
  } catch (err) {
    console.error('Failed to load state from disk, using default seed:', err);
  }

  // Fallback to default seed
  currentKing = { ...DEFAULT_SEED_STATE.currentKing };
  queue = [...DEFAULT_SEED_STATE.queue];
  fallenKings = [...DEFAULT_SEED_STATE.fallenKings];
  activity = [...DEFAULT_SEED_STATE.activity];
  stats = { ...DEFAULT_SEED_STATE.stats };
  saveStateDebounced();
}

let saveTimer: NodeJS.Timeout | null = null;
function saveStateDebounced() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const data = {
        currentKing,
        queue,
        fallenKings,
        activity: activity.slice(0, 50),
        stats,
        savedAt: Date.now(),
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist state to disk:', err);
    }
  }, 1000);
}

loadPersistentState();

// SSE connection pool
interface SSEClient {
  id: string;
  res: Response;
}
const sseClients = new Map<string, SSEClient>();

function broadcastSSE(eventName: string, data: unknown) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients.values()) {
    try {
      client.res.write(payload);
    } catch {
      sseClients.delete(client.id);
    }
  }
}

function calculateMinRate(): number {
  if (!currentKing || currentKing.status !== 'active') {
    return 10; // base minimum
  }
  return Math.round(currentKing.ratePerHour + 5);
}

// Public state: STRIP secret manageKey before sending to clients
function getState(): ServerState {
  let publicKing: PinnedLink | null = null;
  if (currentKing) {
    const { manageKey: _, ...safeKing } = currentKing;
    publicKing = safeKing;
  }

  const publicQueue: QueuedLink[] = queue.map((q) => {
    const { manageKey: _, ...safeQ } = q;
    return safeQ;
  });

  // TRUE spectator count: active SSE connections (or 1 if current user)
  const trueSpectatorCount = Math.max(1, sseClients.size);

  return {
    currentKing: publicKing,
    queue: publicQueue,
    fallenKings,
    activity: activity.slice(0, 30),
    stats: {
      ...stats,
      currentSpectators: trueSpectatorCount,
    },
    minRate: calculateMinRate(),
    serverTime: Date.now(),
    isDemoMode: !process.env.STRIPE_SECRET_KEY,
    stripeEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeTestMode: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') : true,
  };
}

// 1-second server tick loop
setInterval(() => {
  const now = Date.now();
  if (currentKing && currentKing.status === 'active') {
    const elapsedMs = now - currentKing.lastTickAt;
    const elapsedSec = Math.max(0.1, elapsedMs / 1000);
    currentKing.lastTickAt = now;

    const burnRatePerSec = currentKing.ratePerHour / 3600;
    const burnAmount = burnRatePerSec * elapsedSec;

    currentKing.balance = Math.max(0, currentKing.balance - burnAmount);
    currentKing.totalBurned += burnAmount;
    currentKing.reignSeconds += elapsedSec;
    stats.totalBurnedAllTime += burnAmount;

    // Check for fuel starvation
    if (currentKing.balance <= 0) {
      currentKing.status = 'starved';
      const dethronedKing = { ...currentKing };

      // Record in graveyard
      fallenKings.unshift({
        id: `fallen-${Date.now()}`,
        title: dethronedKing.title,
        url: dethronedKing.url,
        author: dethronedKing.author,
        ratePerHour: dethronedKing.ratePerHour,
        totalBurned: Math.round(dethronedKing.totalBurned * 100) / 100,
        reignSeconds: Math.round(dethronedKing.reignSeconds),
        crownedAt: dethronedKing.crownedAt,
        dethronedAt: now,
        cause: 'starved',
      });

      activity.unshift({
        id: `act-${now}-starve`,
        type: 'starved',
        title: '💀 King Starved of Fuel!',
        description: `${dethronedKing.author}'s tank hit $0 after ${Math.floor(dethronedKing.reignSeconds / 60)}m ${Math.round(dethronedKing.reignSeconds % 60)}s reign!`,
        timestamp: now,
        author: dethronedKing.author,
      });

      // Promote top challenger if queue has entries
      if (queue.length > 0) {
        queue.sort((a, b) => b.ratePerHour - a.ratePerHour);
        const nextInLine = queue.shift()!;

        currentKing = {
          id: nextInLine.id,
          title: nextInLine.title,
          url: nextInLine.url,
          tagline: nextInLine.tagline,
          author: nextInLine.author,
          authorHandle: nextInLine.author.replace('@', ''),
          ratePerHour: nextInLine.ratePerHour,
          balance: nextInLine.balance,
          initialDeposit: nextInLine.balance,
          totalBurned: 0,
          crownedAt: now,
          lastTickAt: now,
          accentColor: nextInLine.accentColor,
          reignSeconds: 0,
          status: 'active',
          views: 0,
          clicks: 0,
          manageKey: nextInLine.manageKey,
        };

        stats.totalReigns += 1;
        if (currentKing.ratePerHour > stats.highestRateEver) {
          stats.highestRateEver = currentKing.ratePerHour;
        }

        activity.unshift({
          id: `act-${now}-crown`,
          type: 'crown',
          title: '👑 Queue Succession!',
          description: `${currentKing.author} automatically ascended to #1 with "${currentKing.title}" at $${currentKing.ratePerHour}/hr!`,
          timestamp: now,
          rate: currentKing.ratePerHour,
          author: currentKing.author,
        });
      } else {
        currentKing = null;
      }

      saveStateDebounced();
      broadcastSSE('state_update', getState());
    } else {
      // Regular tick broadcast
      broadcastSSE('tick', {
        balance: currentKing.balance,
        totalBurned: currentKing.totalBurned,
        reignSeconds: Math.round(currentKing.reignSeconds),
        totalBurnedAllTime: stats.totalBurnedAllTime,
      });
    }
  }
}, 1000);

// API Endpoints - Health Diagnostic
const handleHealth = (req: Request, res: Response) => {
  const rawKey = process.env.STRIPE_SECRET_KEY || '';
  const rawWebhook = process.env.STRIPE_WEBHOOK_SECRET || '';

  // Vercel / Node runtime console logs (visible in Vercel Function Logs)
  console.log(`[VERCEL/NODE RUNTIME LOG] 🚀 GET ${req.originalUrl || req.url} called at ${new Date().toISOString()}`);
  console.log(`[VERCEL/NODE RUNTIME LOG] STRIPE_SECRET_KEY present: ${Boolean(rawKey)}, length: ${rawKey.length}, prefix: "${rawKey ? rawKey.slice(0, 7) : 'NONE'}"`);
  console.log(`[VERCEL/NODE RUNTIME LOG] STRIPE_WEBHOOK_SECRET present: ${Boolean(rawWebhook)}, length: ${rawWebhook.length}, prefix: "${rawWebhook ? rawWebhook.slice(0, 6) : 'NONE'}"`);
  console.log(`[VERCEL/NODE RUNTIME LOG] Environment: NODE_ENV=${process.env.NODE_ENV}, VERCEL=${process.env.VERCEL || 'not set'}, VERCEL_ENV=${process.env.VERCEL_ENV || 'not set'}`);
  console.log(`[VERCEL/NODE RUNTIME LOG] Configured process.env keys: ${Object.keys(process.env).filter((k) => !k.startsWith('npm_')).join(', ')}`);

  res.json({
    status: 'ok',
    serverTime: Date.now(),
    requestUrl: req.originalUrl || req.url,
    stripe: {
      isKeyPresent: Boolean(rawKey),
      keyPrefix: rawKey ? rawKey.slice(0, 7) : null,
      keyLength: rawKey.length,
      isWebhookSecretPresent: Boolean(rawWebhook),
      webhookSecretPrefix: rawWebhook ? rawWebhook.slice(0, 6) : null,
      isTestMode: rawKey.startsWith('sk_test_'),
    },
    vercel: {
      isVercel: Boolean(process.env.VERCEL),
      vercelEnv: process.env.VERCEL_ENV || null,
      vercelRegion: process.env.VERCEL_REGION || null,
    },
    nodeEnv: process.env.NODE_ENV || 'development',
  });
};

app.get('/api/health', handleHealth);
app.get('/health', handleHealth);

app.get('/api/state', (req: Request, res: Response) => {
  res.json(getState());
});

// SSE Streaming Route
app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  sseClients.set(clientId, { id: clientId, res });

  // Send initial state immediately
  res.write(`event: state_update\ndata: ${JSON.stringify(getState())}\n\n`);

  // Heartbeat to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(clientId);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });
});

// Helper to execute coronation or queueing
function executeBid({
  title,
  url,
  tagline,
  author,
  ratePerHour,
  depositAmount,
  accentColor,
  manageKey: providedManageKey,
  isPaidStripe = false,
}: {
  title: string;
  url: string;
  tagline?: string;
  author: string;
  ratePerHour: number;
  depositAmount: number;
  accentColor?: string;
  manageKey?: string;
  isPaidStripe?: boolean;
}): { success: boolean; manageKey: string; isKing: boolean; id: string } {
  const now = Date.now();
  const rate = Number(ratePerHour);
  const deposit = Number(depositAmount);
  const newId = `link-${now}-${Math.random().toString(36).slice(2, 6)}`;
  const manageKey = providedManageKey || `mk_${crypto.randomBytes(16).toString('hex')}`;
  const cleanUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
  const authorHandle = author.startsWith('@') ? author : `@${author}`;
  const minRequired = calculateMinRate();

  const isDethrone = !currentKing || currentKing.status !== 'active' || rate >= minRequired;

  if (isDethrone) {
    const previousKing = currentKing;

    if (previousKing && previousKing.status === 'active') {
      previousKing.status = 'dethroned';
      fallenKings.unshift({
        id: `fallen-${now}`,
        title: previousKing.title,
        url: previousKing.url,
        author: previousKing.author,
        ratePerHour: previousKing.ratePerHour,
        totalBurned: Math.round(previousKing.totalBurned * 100) / 100,
        reignSeconds: Math.round(previousKing.reignSeconds),
        crownedAt: previousKing.crownedAt,
        dethronedAt: now,
        cause: 'outbid',
        killerName: authorHandle,
      });

      activity.unshift({
        id: `act-${now}-outbid`,
        type: 'outbid',
        title: '🚨 Crown Usurped!',
        description: `${previousKing.author} ($${previousKing.ratePerHour}/hr) was dethroned by ${authorHandle} ($${rate}/hr)! Remaining fuel refunded.`,
        timestamp: now,
        rate,
        author: authorHandle,
      });

      // Put previous king into queue if they still had remaining fuel
      if (previousKing.balance > 0.5) {
        queue.unshift({
          id: previousKing.id,
          title: previousKing.title,
          url: previousKing.url,
          tagline: previousKing.tagline,
          author: previousKing.author,
          ratePerHour: previousKing.ratePerHour,
          balance: previousKing.balance,
          accentColor: previousKing.accentColor,
          submittedAt: now,
          manageKey: previousKing.manageKey,
        });
      }
    }

    currentKing = {
      id: newId,
      title: title.trim(),
      url: cleanUrl,
      tagline: (tagline || '').trim(),
      author: authorHandle,
      authorHandle: authorHandle.replace('@', ''),
      ratePerHour: rate,
      balance: deposit,
      initialDeposit: deposit,
      totalBurned: 0,
      crownedAt: now,
      lastTickAt: now,
      accentColor: accentColor || 'amber',
      reignSeconds: 0,
      status: 'active',
      views: 0,
      clicks: 0,
      manageKey,
    };

    stats.totalReigns += 1;
    if (rate > stats.highestRateEver) {
      stats.highestRateEver = rate;
    }

    activity.unshift({
      id: `act-${now}-crown`,
      type: 'crown',
      title: '👑 New King Crowned!',
      description: `${authorHandle} pinned "${title}" at #1 with $${rate.toFixed(2)}/hr!${isPaidStripe ? ' (Verified via Stripe)' : ''}`,
      timestamp: now,
      rate,
      amount: deposit,
      author: authorHandle,
    });

    saveStateDebounced();
    broadcastSSE('state_update', getState());
    return { success: true, manageKey, isKing: true, id: newId };
  } else {
    // Queued
    const queuedItem: InternalQueuedLink = {
      id: newId,
      title: title.trim(),
      url: cleanUrl,
      tagline: (tagline || '').trim(),
      author: authorHandle,
      ratePerHour: rate,
      balance: deposit,
      accentColor: accentColor || 'cyan',
      submittedAt: now,
      manageKey,
    };

    queue.push(queuedItem);
    queue.sort((a, b) => b.ratePerHour - a.ratePerHour);

    activity.unshift({
      id: `act-${now}-queue`,
      type: 'crown',
      title: '⚔️ Challenger Entered Queue',
      description: `${authorHandle} queued "${title}" at $${rate.toFixed(2)}/hr ready to strike`,
      timestamp: now,
      rate,
      author: authorHandle,
    });

    saveStateDebounced();
    broadcastSSE('state_update', getState());
    return { success: true, manageKey, isKing: false, id: newId };
  }
}

// Pure execution of top up / refuel (invoked by webhook or sandbox)
function executeTopup({
  id,
  amount,
  manageKey,
  isPaidStripe = false,
}: {
  id: string;
  amount: number;
  manageKey?: string;
  isPaidStripe?: boolean;
}): { success: boolean; isOwner?: boolean; balance?: number; error?: string } {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { success: false, error: 'Valid deposit amount required' };
  }

  const now = Date.now();

  if (currentKing && currentKing.id === id && currentKing.status === 'active') {
    const isOwner = Boolean(currentKing.manageKey && currentKing.manageKey === manageKey);
    currentKing.balance += numAmount;
    currentKing.initialDeposit += numAmount;

    activity.unshift({
      id: `act-${now}-refuel`,
      type: 'refuel',
      title: isOwner ? '⛽ Owner Refueled Tank' : '🎁 Supporter Fuel Boost!',
      description: `${isOwner ? currentKing.author : 'A supporter'} injected +$${numAmount.toFixed(2)} fuel into "${currentKing.title}"!${isPaidStripe ? ' (Verified via Stripe)' : ''}`,
      timestamp: now,
      amount: numAmount,
      author: currentKing.author,
    });

    saveStateDebounced();
    broadcastSSE('state_update', getState());
    return { success: true, balance: currentKing.balance, isOwner };
  }

  // Check queue items
  const queued = queue.find((q) => q.id === id);
  if (queued) {
    queued.balance += numAmount;
    saveStateDebounced();
    broadcastSSE('state_update', getState());
    return { success: true, balance: queued.balance };
  }

  return { success: false, error: 'Link not found or no longer active' };
}

// Pure execution of boost rate (invoked by webhook or sandbox)
function executeBoostRate({
  id,
  newRate,
  depositAmount = 0,
  manageKey,
  isPaidStripe = false,
}: {
  id: string;
  newRate: number;
  depositAmount?: number;
  manageKey?: string;
  isPaidStripe?: boolean;
}): { success: boolean; king?: PinnedLink; error?: string; status?: number } {
  const rate = Number(newRate);
  const extraDeposit = Number(depositAmount || 0);

  if (!currentKing || currentKing.id !== id || currentKing.status !== 'active') {
    return { success: false, error: 'Only the active King at #1 can boost burn rate.', status: 404 };
  }

  if (currentKing.manageKey && currentKing.manageKey !== manageKey) {
    return {
      success: false,
      error: 'Forbidden: You do not possess the management key for this link. Only the verified link owner can adjust the burn rate.',
      status: 403,
    };
  }

  if (isNaN(rate) || rate <= currentKing.ratePerHour) {
    return {
      success: false,
      error: `New rate must be higher than current rate ($${currentKing.ratePerHour}/hr).`,
      status: 400,
    };
  }

  const oldRate = currentKing.ratePerHour;
  currentKing.ratePerHour = rate;
  if (extraDeposit > 0) {
    currentKing.balance += extraDeposit;
    currentKing.initialDeposit += extraDeposit;
  }
  if (rate > stats.highestRateEver) {
    stats.highestRateEver = rate;
  }

  const now = Date.now();
  activity.unshift({
    id: `act-${now}-boost`,
    type: 'rate_boost',
    title: '🛡️ Rate Defense Activated!',
    description: `${currentKing.author} raised hourly burn rate from $${oldRate}/hr to $${rate}/hr${extraDeposit > 0 ? ` (+${extraDeposit.toFixed(2)} fuel)` : ''}!${isPaidStripe ? ' (Verified via Stripe)' : ''}`,
    timestamp: now,
    rate,
    amount: extraDeposit,
    author: currentKing.author,
  });

  saveStateDebounced();
  broadcastSSE('state_update', getState());
  return { success: true, king: currentKing };
}

// Post a Bid to Claim #1 or Queue
app.post('/api/bid', (req: Request, res: Response) => {
  const { title, url, tagline, author, ratePerHour, depositAmount, accentColor } = req.body;

  if (!title || !url || !author) {
    res.status(400).json({ error: 'Title, URL, and Author are required.' });
    return;
  }

  const rate = Number(ratePerHour);
  const deposit = Number(depositAmount);

  if (isNaN(rate) || rate < 10) {
    res.status(400).json({ error: 'Rate per hour must be at least $10/hr.' });
    return;
  }

  if (isNaN(deposit) || deposit < 5) {
    res.status(400).json({ error: 'Fuel deposit must be at least $5.00.' });
    return;
  }

  // If live/test Stripe is configured, prompt checkout creation instead
  const stripe = getStripe();
  if (stripe && !req.body.bypassStripe) {
    res.status(400).json({
      error: 'Stripe payments are enabled. Please use /api/create-checkout-session to place bid.',
      requiresStripe: true,
    });
    return;
  }

  const result = executeBid({
    title,
    url,
    tagline,
    author,
    ratePerHour: rate,
    depositAmount: deposit,
    accentColor,
    isPaidStripe: false,
  });

  res.json({
    success: true,
    message: result.isKing ? 'Crowned #1 successfully!' : 'Entered challenger queue!',
    manageKey: result.manageKey,
    id: result.id,
    isKing: result.isKing,
  });
});

// Create Stripe Checkout Session (Supports 'bid', 'topup', and 'boost_rate')
// CRITICAL: DOES NOT CROWN, REFUEL, OR BOOST ON CHECKOUT REQUEST!
// ONLY RETURNS CHECKOUT URL. ALL ACTIONS EXECUTE INSIDE STRIPE WEBHOOK AFTER PAYMENT CONFIRMATION.
app.post('/api/create-checkout-session', async (req: Request, res: Response) => {
  const {
    action = 'bid',
    title,
    url,
    tagline,
    author,
    ratePerHour,
    depositAmount,
    accentColor,
    targetId,
    amount,
    newRate,
  } = req.body;

  const origin = req.headers.origin || 'http://localhost:3000';
  const stripe = getStripe();

  // === ACTION 1: BID (Crown or Queue) ===
  if (action === 'bid' || (!action && title && url)) {
    if (!title || !url || !author) {
      res.status(400).json({ error: 'Title, URL, and Author are required.' });
      return;
    }

    const rate = Number(ratePerHour);
    const deposit = Number(depositAmount);

    if (isNaN(rate) || rate < 10 || isNaN(deposit) || deposit < 5) {
      res.status(400).json({ error: 'Invalid rate or deposit amount.' });
      return;
    }

    if (!stripe) {
      // Sandbox mode fallback
      const result = executeBid({
        title,
        url,
        tagline,
        author,
        ratePerHour: rate,
        depositAmount: deposit,
        accentColor,
      });

      res.json({
        demoMode: true,
        success: true,
        message: 'Sandbox bid placed (no Stripe keys configured).',
        manageKey: result.manageKey,
        id: result.id,
        isKing: result.isKing,
      });
      return;
    }

    try {
      const manageKey = `mk_${crypto.randomBytes(16).toString('hex')}`;
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Pin "${title}" on stayup.lol`,
                description: `Burn rate: $${rate.toFixed(2)}/hr • Fuel deposit: $${deposit.toFixed(2)}`,
              },
              unit_amount: Math.round(deposit * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        metadata: {
          action: 'bid',
          title,
          url,
          tagline: tagline || '',
          author,
          ratePerHour: rate.toString(),
          depositAmount: deposit.toString(),
          accentColor: accentColor || 'amber',
          manageKey,
        },
        success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}&manage_key=${manageKey}`,
        cancel_url: `${origin}/?payment=cancelled`,
      });

      // NOTICE: Nothing crowned yet! Returns checkoutUrl only.
      res.json({
        checkoutUrl: session.url,
        sessionId: session.id,
        manageKey,
        livePayment: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Stripe checkout creation failed';
      res.status(500).json({ error: message });
    }
    return;
  }

  // === ACTION 2: TOPUP (Panic Refuel) ===
  if (action === 'topup') {
    const target = targetId || req.body.id;
    const numAmount = Number(amount || depositAmount);
    const manageKey = (req.headers['x-manage-key'] as string) || req.body.manageKey;

    if (!target || isNaN(numAmount) || numAmount < 1) {
      res.status(400).json({ error: 'Valid target ID and amount (minimum $1) required.' });
      return;
    }

    const targetTitle =
      (currentKing && currentKing.id === target ? currentKing.title : queue.find((q) => q.id === target)?.title) ||
      'stayup.lol link';

    if (!stripe) {
      // Sandbox mode fallback
      const result = executeTopup({ id: target, amount: numAmount, manageKey });
      res.json({
        demoMode: true,
        success: result.success,
        balance: result.balance,
        isOwner: result.isOwner,
      });
      return;
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Emergency Fuel Injection: ${targetTitle}`,
                description: `+$${numAmount.toFixed(2)} fuel added to prevent drop on stayup.lol`,
              },
              unit_amount: Math.round(numAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        metadata: {
          action: 'topup',
          targetId: target,
          amount: numAmount.toString(),
          manageKey: manageKey || '',
        },
        success_url: `${origin}/?payment=topup_success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?payment=cancelled`,
      });

      // NOTICE: No fuel added yet! Returns checkoutUrl only.
      res.json({
        checkoutUrl: session.url,
        sessionId: session.id,
        livePayment: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Stripe topup checkout failed';
      res.status(500).json({ error: message });
    }
    return;
  }

  // === ACTION 3: BOOST RATE (Defensive Shield) ===
  if (action === 'boost_rate') {
    const target = targetId || req.body.id;
    const rate = Number(newRate);
    const deposit = Number(depositAmount || 0);
    const manageKey = (req.headers['x-manage-key'] as string) || req.body.manageKey;

    if (!currentKing || currentKing.id !== target || currentKing.status !== 'active') {
      res.status(404).json({ error: 'Only the active King at #1 can boost burn rate.' });
      return;
    }

    if (currentKing.manageKey && currentKing.manageKey !== manageKey) {
      res.status(403).json({ error: 'Forbidden: You do not possess the management key for this link.' });
      return;
    }

    if (isNaN(rate) || rate <= currentKing.ratePerHour) {
      res.status(400).json({ error: `New rate must be higher than current rate ($${currentKing.ratePerHour}/hr).` });
      return;
    }

    if (!stripe || deposit <= 0) {
      // Sandbox mode or free rate adjustment
      const result = executeBoostRate({
        id: target,
        newRate: rate,
        depositAmount: deposit,
        manageKey,
      });
      res.json({
        demoMode: !stripe,
        success: result.success,
        king: result.king,
      });
      return;
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Raise Rate Defense: $${rate}/hr ("${currentKing.title}")`,
                description: `Lock in defensive rate with +$${deposit.toFixed(2)} emergency fuel`,
              },
              unit_amount: Math.round(deposit * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        metadata: {
          action: 'boost_rate',
          targetId: target,
          newRate: rate.toString(),
          depositAmount: deposit.toString(),
          manageKey: manageKey || '',
        },
        success_url: `${origin}/?payment=boost_success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?payment=cancelled`,
      });

      // NOTICE: Rate not updated yet! Returns checkoutUrl only.
      res.json({
        checkoutUrl: session.url,
        sessionId: session.id,
        livePayment: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Stripe boost checkout failed';
      res.status(500).json({ error: message });
    }
    return;
  }

  res.status(400).json({ error: 'Unsupported action type' });
});

// Stripe Webhook Endpoint: The ONLY place where crown, topup, and boost execute when Stripe is active!
app.post('/api/stripe-webhook', async (req: Request, res: Response) => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(400).send('Stripe not configured');
    return;
  }

  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook error';
    console.error('Webhook signature verification failed:', message);
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata;

    if (meta) {
      const action = meta.action || (meta.title && meta.url ? 'bid' : '');

      if (action === 'bid') {
        // CROWN OR QUEUE LINK
        executeBid({
          title: meta.title,
          url: meta.url,
          tagline: meta.tagline,
          author: meta.author,
          ratePerHour: Number(meta.ratePerHour),
          depositAmount: Number(meta.depositAmount),
          accentColor: meta.accentColor,
          manageKey: meta.manageKey,
          isPaidStripe: true,
        });
        console.log(`[Stripe Webhook Confirmed] Crown/Bid payment confirmed for "${meta.title}" ($${meta.depositAmount})`);
      } else if (action === 'topup') {
        // REFUEL FUEL TANK
        executeTopup({
          id: meta.targetId,
          amount: Number(meta.amount),
          manageKey: meta.manageKey,
          isPaidStripe: true,
        });
        console.log(`[Stripe Webhook Confirmed] Topup confirmed for ${meta.targetId} ($${meta.amount})`);
      } else if (action === 'boost_rate') {
        // BOOST DEFENSIVE RATE
        executeBoostRate({
          id: meta.targetId,
          newRate: Number(meta.newRate),
          depositAmount: Number(meta.depositAmount || 0),
          manageKey: meta.manageKey,
          isPaidStripe: true,
        });
        console.log(`[Stripe Webhook Confirmed] Boost rate confirmed for ${meta.targetId} ($${meta.newRate}/hr)`);
      }
    }
  }

  res.json({ received: true });
});

// Top up fuel to prevent starvation
// In Stripe mode, clients route through /api/create-checkout-session (action: 'topup')
app.post('/api/topup', (req: Request, res: Response) => {
  const { id, amount } = req.body;
  const manageKey = (req.headers['x-manage-key'] as string) || req.body.manageKey;
  const stripe = getStripe();

  if (stripe && !req.body.bypassStripe) {
    res.status(400).json({
      error: 'Stripe payments are enabled. Please create a checkout session via /api/create-checkout-session (action: topup).',
      requiresStripe: true,
    });
    return;
  }

  const result = executeTopup({ id, amount, manageKey, isPaidStripe: false });
  if (!result.success) {
    res.status(400).json({ error: result.error || 'Failed to refuel' });
    return;
  }
  res.json(result);
});

// Boost hourly burn rate (Defensive Shield)
app.post('/api/boost-rate', (req: Request, res: Response) => {
  const { id, newRate, depositAmount } = req.body;
  const manageKey = (req.headers['x-manage-key'] as string) || req.body.manageKey;
  const stripe = getStripe();

  if (stripe && req.body.paidBoost && !req.body.bypassStripe) {
    res.status(400).json({
      error: 'Stripe payments are enabled. Please create a checkout session via /api/create-checkout-session (action: boost_rate).',
      requiresStripe: true,
    });
    return;
  }

  const result = executeBoostRate({
    id,
    newRate: Number(newRate),
    depositAmount: Number(depositAmount || 0),
    manageKey,
    isPaidStripe: false,
  });

  if (!result.success) {
    res.status(result.status || 400).json({ error: result.error });
    return;
  }

  res.json({ success: true, king: result.king });
});

// Click tracker for analytics
app.post('/api/click', (req: Request, res: Response) => {
  const { id } = req.body;
  if (currentKing && currentKing.id === id) {
    currentKing.clicks += 1;
    saveStateDebounced();
    res.json({ clicks: currentKing.clicks });
    return;
  }
  res.json({ success: true });
});

// Reset State to Clean Slate (Removes all seed data, sets 0 total burned, resets graveyard)
app.post('/api/reset-state', (req: Request, res: Response) => {
  currentKing = null;
  queue = [];
  fallenKings = [];
  activity = [
    {
      id: `act-reset-${Date.now()}`,
      type: 'crown',
      title: '✨ Clean Slate Initialized',
      description: 'Throne is now open. Place the very first bid to claim #1!',
      timestamp: Date.now(),
      author: '@stayup_protocol',
    },
  ];
  stats = {
    totalBurnedAllTime: 0,
    totalReigns: 0,
    highestRateEver: 0,
    longestReignSeconds: 0,
    currentSpectators: Math.max(1, sseClients.size),
  };

  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ currentKing, queue, fallenKings, activity, stats }), 'utf-8');
  } catch (err) {
    console.error('Failed to write reset state file:', err);
  }

  broadcastSSE('state_update', getState());
  res.json({ success: true, message: 'Reset to clean slate complete.' });
});

// Simulate Rival Bot Attack for sandbox / testing live dethronement
// EXPLICITLY LABELED AS TEST BOT SIMULATION
app.post('/api/simulate-rival', (req: Request, res: Response) => {
  const rivalPool = [
    { title: 'SolSnipers — Telegram Memecoin Bot', author: '@bot_solsniper', url: 'https://solsnipers.xyz', tagline: 'Snipe new Raydium liquidity pairs in 100ms', color: 'emerald' },
    { title: 'DropCraft — Instant AI Landing Pages', author: '@bot_dropcraft', url: 'https://dropcraft.page', tagline: 'Generate high-converting SaaS landing pages in 60s', color: 'violet' },
    { title: 'AlphaTracker — Whale Wallet Watcher', author: '@bot_alphatracker', url: 'https://alphatracker.fi', tagline: 'Real-time push notifications when Smart Money buys', color: 'cyan' },
  ];

  const picked = rivalPool[Math.floor(Math.random() * rivalPool.length)];
  const currentRate = currentKing?.status === 'active' ? currentKing.ratePerHour : 25;
  const rivalRate = currentRate + Math.floor(Math.random() * 20) + 10;
  const rivalDeposit = 30;

  const now = Date.now();
  const previousKing = currentKing;

  if (previousKing && previousKing.status === 'active') {
    previousKing.status = 'dethroned';
    fallenKings.unshift({
      id: `fallen-${now}`,
      title: previousKing.title,
      url: previousKing.url,
      author: previousKing.author,
      ratePerHour: previousKing.ratePerHour,
      totalBurned: Math.round(previousKing.totalBurned * 100) / 100,
      reignSeconds: Math.round(previousKing.reignSeconds),
      crownedAt: previousKing.crownedAt,
      dethronedAt: now,
      cause: 'outbid',
      killerName: picked.author,
    });

    activity.unshift({
      id: `act-${now}-rival-outbid`,
      type: 'outbid',
      title: '🤖 [TEST BOT SIMULATION] Challenger Outbid',
      description: `[DEMO BOT] ${picked.author} dethroned #1 with $${rivalRate}/hr to test live game mechanics.`,
      timestamp: now,
      rate: rivalRate,
      author: picked.author,
      isBotSimulation: true,
    });

    if (previousKing.balance > 0.5) {
      queue.unshift({
        id: previousKing.id,
        title: previousKing.title,
        url: previousKing.url,
        tagline: previousKing.tagline,
        author: previousKing.author,
        ratePerHour: previousKing.ratePerHour,
        balance: previousKing.balance,
        accentColor: previousKing.accentColor,
        submittedAt: now,
        manageKey: previousKing.manageKey,
      });
    }
  }

  currentKing = {
    id: `king-${now}`,
    title: `[TEST BOT] ${picked.title}`,
    url: picked.url,
    tagline: picked.tagline,
    author: picked.author,
    authorHandle: picked.author.replace('@', ''),
    ratePerHour: rivalRate,
    balance: rivalDeposit,
    initialDeposit: rivalDeposit,
    totalBurned: 0,
    crownedAt: now,
    lastTickAt: now,
    accentColor: picked.color,
    reignSeconds: 0,
    status: 'active',
    views: 0,
    clicks: 0,
    manageKey: `mk_bot_${now}`,
  };

  stats.totalReigns += 1;
  if (rivalRate > stats.highestRateEver) {
    stats.highestRateEver = rivalRate;
  }

  saveStateDebounced();
  broadcastSSE('state_update', getState());
  res.json({
    success: true,
    message: `[TEST BOT SIMULATION] ${picked.author} simulated attack.`,
    isBotSimulation: true,
    king: currentKing,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const rawKey = process.env.STRIPE_SECRET_KEY || '';
    const rawWebhook = process.env.STRIPE_WEBHOOK_SECRET || '';
    console.log(`stayup.lol server running on http://localhost:${PORT}`);
    console.log(`[Stripe Debug] STRIPE_SECRET_KEY present: ${Boolean(rawKey)}, prefix: ${rawKey ? rawKey.slice(0, 7) : 'NONE'}, length: ${rawKey.length}`);
    console.log(`[Stripe Debug] STRIPE_WEBHOOK_SECRET present: ${Boolean(rawWebhook)}, prefix: ${rawWebhook ? rawWebhook.slice(0, 6) : 'NONE'}`);
  });
}

// In local / Cloud Run container, boot standalone server.
// On Vercel, serverless function invokes the exported Express app directly.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
