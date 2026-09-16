import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ActivityEvent, FallenKing, GlobalStats, PinnedLink, QueuedLink, ServerState } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Authoritative State
let currentKing: PinnedLink | null = {
  id: 'king-seed-1',
  title: 'hyperlink.design — Curated Aesthetic Web Inspiration',
  url: 'https://hyperlink.design',
  tagline: 'The daily gallery for avant-garde interfaces & web design',
  author: '@steve_design',
  authorHandle: 'steve_design',
  ratePerHour: 140, // $140/hour burn rate
  balance: 38.50, // ~$38.50 fuel left (~16.5 minutes)
  initialDeposit: 60.00,
  totalBurned: 21.50,
  crownedAt: Date.now() - 552000,
  lastTickAt: Date.now(),
  accentColor: 'amber',
  reignSeconds: 552,
  status: 'active',
  views: 1842,
  clicks: 319,
};

let queue: QueuedLink[] = [
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
  },
];

let fallenKings: FallenKing[] = [
  {
    id: 'fallen-1',
    title: 'PixelDEX — Zero-Fee Solana Swap Engine',
    url: 'https://pixeldex.trade',
    author: '@sol_whale',
    ratePerHour: 125,
    totalBurned: 187.50,
    reignSeconds: 5400, // 1h 30m
    crownedAt: Date.now() - 10000000,
    dethronedAt: Date.now() - 4600000,
    cause: 'outbid',
    killerName: '@steve_design',
  },
  {
    id: 'fallen-2',
    title: 'GhostWriter AI — Human-like Copy Generator',
    url: 'https://ghostwriter.ai',
    author: '@sarah_builds',
    ratePerHour: 90,
    totalBurned: 112.50,
    reignSeconds: 4500, // 1h 15m
    crownedAt: Date.now() - 18000000,
    dethronedAt: Date.now() - 13500000,
    cause: 'starved',
  },
  {
    id: 'fallen-3',
    title: 'BiteSize Papers — 60-Second ArXiv Summaries',
    url: 'https://bitesizepapers.com',
    author: '@alex_ml',
    ratePerHour: 160,
    totalBurned: 320.00,
    reignSeconds: 7200, // 2 hours
    crownedAt: Date.now() - 32000000,
    dethronedAt: Date.now() - 24800000,
    cause: 'starved',
  },
];

let activity: ActivityEvent[] = [
  {
    id: 'act-1',
    type: 'crown',
    title: '👑 New King Crowned',
    description: '@steve_design claimed #1 with "hyperlink.design" at $140.00/hr',
    timestamp: Date.now() - 552000,
    rate: 140,
    author: '@steve_design',
  },
  {
    id: 'act-2',
    type: 'refuel',
    title: '⛽ Fuel Injected',
    description: '@steve_design topped up $20.00 into the tank',
    timestamp: Date.now() - 180000,
    amount: 20,
    author: '@steve_design',
  },
  {
    id: 'act-3',
    type: 'outbid',
    title: '🚨 Dethroned!',
    description: '@sol_whale ($125/hr) was knocked down by @steve_design ($140/hr)',
    timestamp: Date.now() - 552000,
    rate: 140,
    author: '@steve_design',
  },
];

const stats: GlobalStats = {
  totalBurnedAllTime: 641.50,
  totalReigns: 14,
  highestRateEver: 220,
  longestReignSeconds: 7200,
  currentSpectators: 1,
};

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
    return 20; // base minimum
  }
  // Minimum outbid is current rate + $5
  return Math.round(currentKing.ratePerHour + 5);
}

function getState(): ServerState {
  return {
    currentKing,
    queue,
    fallenKings,
    activity: activity.slice(0, 30),
    stats: {
      ...stats,
      currentSpectators: Math.max(1, sseClients.size + 4), // add slight organic audience feel
    },
    minRate: calculateMinRate(),
    serverTime: Date.now(),
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
        id: `act-${Date.now()}`,
        type: 'starved',
        title: '💀 Fuel Starved!',
        description: `"${dethronedKing.title}" ran out of money and dropped after ${Math.floor(dethronedKing.reignSeconds / 60)}m ${Math.floor(dethronedKing.reignSeconds % 60)}s! ($${dethronedKing.totalBurned.toFixed(2)} burned)`,
        timestamp: now,
        author: dethronedKing.author,
      });

      // Elevate next from queue if any
      if (queue.length > 0) {
        // Sort queue by rate descending
        queue.sort((a, b) => b.ratePerHour - a.ratePerHour);
        const nextInLine = queue.shift()!;
        currentKing = {
          id: nextInLine.id,
          title: nextInLine.title,
          url: nextInLine.url,
          tagline: nextInLine.tagline,
          author: nextInLine.author,
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

// API Endpoints
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

// Post a Bid to Claim #1 or Queue
app.post('/api/bid', (req: Request, res: Response) => {
  const { title, url, tagline, author, authorHandle, ratePerHour, depositAmount, accentColor } = req.body;

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

  const now = Date.now();
  const minRequired = calculateMinRate();

  // If rate exceeds current king's rate or throne is vacant -> INSTANT DETHRONE
  if (!currentKing || currentKing.status !== 'active' || rate >= minRequired) {
    const previousKing = currentKing;

    if (previousKing && previousKing.status === 'active') {
      // Dethrone previous king
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
        killerName: author,
      });

      activity.unshift({
        id: `act-${now}-outbid`,
        type: 'outbid',
        title: '🚨 DETHRONED!',
        description: `${author} outbid ${previousKing.author} with $${rate.toFixed(2)}/hr (was $${previousKing.ratePerHour.toFixed(2)}/hr)!`,
        timestamp: now,
        rate,
        author,
      });

      // If previous king had remaining balance, they move to rank #2 in queue with remaining fuel!
      if (previousKing.balance > 0.50) {
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
        });
      }
    }

    // Crown the new King!
    currentKing = {
      id: `king-${now}`,
      title: title.trim(),
      url: url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`,
      tagline: (tagline || '').trim(),
      author: author.trim(),
      authorHandle: (authorHandle || author.replace('@', '')).trim(),
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
    };

    stats.totalReigns += 1;
    if (rate > stats.highestRateEver) {
      stats.highestRateEver = rate;
    }

    activity.unshift({
      id: `act-${now}-crown`,
      type: 'crown',
      title: '👑 New King Crowned!',
      description: `${author} pinned "${title}" at #1 with $${rate.toFixed(2)}/hr!`,
      timestamp: now,
      rate,
      amount: deposit,
      author,
    });

    broadcastSSE('state_update', getState());
    res.json({ success: true, message: 'Crowned #1 successfully!', king: currentKing });
    return;
  }

  // Otherwise, user submitted a lower bid, enters Queue!
  const queuedItem: QueuedLink = {
    id: `queue-${now}`,
    title: title.trim(),
    url: url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`,
    tagline: (tagline || '').trim(),
    author: author.trim(),
    ratePerHour: rate,
    balance: deposit,
    accentColor: accentColor || 'cyan',
    submittedAt: now,
  };

  queue.push(queuedItem);
  queue.sort((a, b) => b.ratePerHour - a.ratePerHour);

  activity.unshift({
    id: `act-${now}-queue`,
    type: 'crown',
    title: '⚔️ Challenger Entered Queue',
    description: `${author} queued "${title}" at $${rate.toFixed(2)}/hr ready to strike`,
    timestamp: now,
    rate,
    author,
  });

  broadcastSSE('state_update', getState());
  res.json({ success: true, message: 'Entered challenger queue!', queueItem: queuedItem });
});

// Top up fuel to prevent starvation
app.post('/api/topup', (req: Request, res: Response) => {
  const { id, amount } = req.body;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Valid deposit amount required' });
    return;
  }

  const now = Date.now();

  if (currentKing && currentKing.id === id && currentKing.status === 'active') {
    currentKing.balance += numAmount;
    currentKing.initialDeposit += numAmount;

    activity.unshift({
      id: `act-${now}-refuel`,
      type: 'refuel',
      title: '⛽ Panic Refuel!',
      description: `${currentKing.author} added +$${numAmount.toFixed(2)} to fuel tank!`,
      timestamp: now,
      amount: numAmount,
      author: currentKing.author,
    });

    broadcastSSE('state_update', getState());
    res.json({ success: true, balance: currentKing.balance });
    return;
  }

  // Check queue items
  const queued = queue.find((q) => q.id === id);
  if (queued) {
    queued.balance += numAmount;
    broadcastSSE('state_update', getState());
    res.json({ success: true, balance: queued.balance });
    return;
  }

  res.status(404).json({ error: 'Link not found or no longer active' });
});

// Boost hourly burn rate (Defensive Shield)
app.post('/api/boost-rate', (req: Request, res: Response) => {
  const { id, newRate } = req.body;
  const rate = Number(newRate);

  if (!currentKing || currentKing.id !== id || currentKing.status !== 'active') {
    res.status(404).json({ error: 'Only the active King at #1 can boost burn rate.' });
    return;
  }

  if (isNaN(rate) || rate <= currentKing.ratePerHour) {
    res.status(400).json({ error: `New rate must be higher than current rate ($${currentKing.ratePerHour}/hr).` });
    return;
  }

  const oldRate = currentKing.ratePerHour;
  currentKing.ratePerHour = rate;
  if (rate > stats.highestRateEver) {
    stats.highestRateEver = rate;
  }

  const now = Date.now();
  activity.unshift({
    id: `act-${now}-boost`,
    type: 'rate_boost',
    title: '🛡️ Defense Boosted!',
    description: `${currentKing.author} raised hourly burn rate from $${oldRate}/hr to $${rate}/hr to fend off challengers!`,
    timestamp: now,
    rate,
    author: currentKing.author,
  });

  broadcastSSE('state_update', getState());
  res.json({ success: true, king: currentKing });
});

// Click tracker for analytics
app.post('/api/click', (req: Request, res: Response) => {
  const { id } = req.body;
  if (currentKing && currentKing.id === id) {
    currentKing.clicks += 1;
    res.json({ clicks: currentKing.clicks });
    return;
  }
  res.json({ success: true });
});

// Simulate Rival Bot Attack for live testing tension
app.post('/api/simulate-rival', (req: Request, res: Response) => {
  const rivalPool = [
    { title: 'SolSnipers — 0-block Telegram Memecoin Bot', author: '@sol_sniper', url: 'https://solsnipers.xyz', tagline: 'Snipe new Raydium liquidity pairs in 100ms', color: 'emerald' },
    { title: 'DropCraft — Instant AI Landing Page Generator', author: '@indie_marcus', url: 'https://dropcraft.page', tagline: 'Generate high-converting SaaS landing pages in 60s', color: 'violet' },
    { title: 'AlphaTracker — Follow Top 100 Whale Wallets', author: '@alpha_detective', url: 'https://alphatracker.fi', tagline: 'Real-time push notifications when Smart Money buys', color: 'cyan' },
    { title: 'PromptVault — 10,000 Tested Prompts for Devs', author: '@dev_prompts', url: 'https://promptvault.io', tagline: 'Curated developer system prompts & evaluations', color: 'rose' },
  ];

  const picked = rivalPool[Math.floor(Math.random() * rivalPool.length)];
  const currentRate = currentKing?.status === 'active' ? currentKing.ratePerHour : 50;
  // Rival attacks with +$15 to +$45 higher rate
  const rivalRate = currentRate + Math.floor(Math.random() * 30) + 15;
  const rivalDeposit = Math.round((rivalRate / 60) * (3 + Math.floor(Math.random() * 8))); // 3-10 minutes fuel

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
      title: '🚨 DETHRONED BY CHALLENGER!',
      description: `${picked.author} snatched #1 from ${previousKing.author} with $${rivalRate}/hr!`,
      timestamp: now,
      rate: rivalRate,
      author: picked.author,
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
      });
    }
  }

  currentKing = {
    id: `king-${now}`,
    title: picked.title,
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
  };

  stats.totalReigns += 1;
  if (rivalRate > stats.highestRateEver) {
    stats.highestRateEver = rivalRate;
  }

  broadcastSSE('state_update', getState());
  res.json({ success: true, message: `Rival ${picked.author} attacked and claimed #1!`, king: currentKing });
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
    console.log(`stayup.lol server running on http://localhost:${PORT}`);
  });
}

startServer();
