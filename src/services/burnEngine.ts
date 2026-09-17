import { ActivityEvent, FallenKing, GlobalStats, PinnedLink, QueuedLink, ServerState } from '../types';
import { getOwnerKey, isOwnerOf, saveOwnerKey } from '../utils/ownerKeys';

const STORAGE_KEY = 'stayup_state_v1';
const MIN_RATE_INCREMENT = 5;

// High quality initial seed data with clear flags
export const INITIAL_SEED_STATE: ServerState = {
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
    status: 'active',
    views: 1842,
    clicks: 319,
    isSeed: true,
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
      cause: 'outbid',
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
      cause: 'starved',
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
      cause: 'starved',
      isSeed: true,
    },
  ],
  activity: [
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
  ],
  stats: {
    totalBurnedAllTime: 641.50,
    totalReigns: 14,
    highestRateEver: 220,
    longestReignSeconds: 7200,
    currentSpectators: 1, // TRUE count, no padding
  },
  minRate: 145,
  serverTime: Date.now(),
  isDemoMode: true,
  razorpayEnabled: false,
  razorpayTestMode: true,
  razorpayKeyId: null,
  stripeEnabled: false,
  stripeTestMode: true,
};

class BurnEngine {
  private state: ServerState;
  private listeners: Set<(state: ServerState) => void> = new Set();
  private eventSource: EventSource | null = null;
  private clientTickTimer: ReturnType<typeof setInterval> | null = null;
  private isUsingServer = false;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.state = this.loadInitialState();

    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('stayup_live_state');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_STATE') {
            this.state = event.data.state;
            this.notify();
          }
        };
      } catch {
        // BroadcastChannel not available or restricted
      }

      this.initConnection();
    }
  }

  private loadInitialState(): ServerState {
    if (typeof window === 'undefined') return INITIAL_SEED_STATE;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.currentKing) {
          // Adjust minRate dynamically
          parsed.minRate = parsed.currentKing ? parsed.currentKing.ratePerHour + MIN_RATE_INCREMENT : 10;
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_SEED_STATE;
  }

  private saveState() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore
    }
  }

  private broadcast() {
    this.saveState();
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'SYNC_STATE', state: this.state });
      } catch {
        // ignore
      }
    }
  }

  public getState(): ServerState {
    return this.state;
  }

  public subscribe(callback: (state: ServerState) => void): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    // Dynamically decorate state with ownership flags based on local user's keys
    if (this.state.currentKing) {
      this.state.currentKing.isOwnedByMe = isOwnerOf(this.state.currentKing.id);
    }
    if (this.state.queue) {
      for (const q of this.state.queue) {
        q.isOwnedByMe = isOwnerOf(q.id);
      }
    }

    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('State subscriber error:', err);
      }
    }
  }

  private startClientTick() {
    if (this.clientTickTimer) return;

    this.clientTickTimer = setInterval(() => {
      this.tickLocal();
    }, 1000);
  }

  private stopClientTick() {
    if (this.clientTickTimer) {
      clearInterval(this.clientTickTimer);
      this.clientTickTimer = null;
    }
  }

  private async initConnection() {
    // Attempt to verify if the server API is responding with JSON
    let serverReachable = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/state', { signal: controller.signal });
      clearTimeout(timeoutId);

      // Check if response is real JSON and not an HTML fallback page (common on static Vercel)
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const serverData: ServerState = await res.json();
        if (serverData && serverData.currentKing) {
          serverReachable = true;
          this.isUsingServer = true;
          this.state = serverData;
          this.notify();
          this.connectSSE();
        }
      }
    } catch {
      serverReachable = false;
    }

    if (!serverReachable) {
      // Running standalone (e.g. Vercel deployment, static host, or offline)
      this.isUsingServer = false;
      this.startClientTick();
    }
  }

  private connectSSE() {
    try {
      this.eventSource = new EventSource('/api/stream');

      this.eventSource.addEventListener('state_update', (e) => {
        try {
          const newState: ServerState = JSON.parse(e.data);
          this.state = newState;
          this.notify();
          this.broadcast();
        } catch (err) {
          console.error('Failed to parse SSE state_update:', err);
        }
      });

      this.eventSource.addEventListener('tick', (e) => {
        try {
          const tickData = JSON.parse(e.data);
          if (this.state.currentKing) {
            this.state = {
              ...this.state,
              currentKing: {
                ...this.state.currentKing,
                balance: tickData.balance,
                totalBurned: tickData.totalBurned,
                reignSeconds: tickData.reignSeconds,
              },
              stats: {
                ...this.state.stats,
                totalBurnedAllTime: tickData.totalBurnedAllTime,
              },
            };
            this.notify();
          }
        } catch {
          // ignore
        }
      });

      this.eventSource.onerror = () => {
        // Fallback to local tick if SSE breaks
        if (!this.clientTickTimer) {
          this.startClientTick();
        }
      };
    } catch {
      this.startClientTick();
    }
  }

  /**
   * Autonomous Client Tick Engine (runs every second on Vercel or when server is unavailable)
   */
  private tickLocal() {
    if (!this.state.currentKing || this.state.currentKing.status !== 'active') {
      return;
    }

    const burnPerSecond = this.state.currentKing.ratePerHour / 3600;
    const newBalance = this.state.currentKing.balance - burnPerSecond;
    const newBurned = this.state.currentKing.totalBurned + burnPerSecond;
    const newReign = this.state.currentKing.reignSeconds + 1;
    const newTotalBurnedAllTime = this.state.stats.totalBurnedAllTime + burnPerSecond;

    if (newBalance <= 0) {
      // King starved!
      this.handleStarvationLocal();
      return;
    }

    this.state = {
      ...this.state,
      currentKing: {
        ...this.state.currentKing,
        balance: Math.max(0, newBalance),
        totalBurned: newBurned,
        reignSeconds: newReign,
        lastTickAt: Date.now(),
      },
      stats: {
        ...this.state.stats,
        totalBurnedAllTime: newTotalBurnedAllTime,
      },
      serverTime: Date.now(),
    };

    this.notify();
  }

  private handleStarvationLocal() {
    if (!this.state.currentKing) return;

    const starvedKing = this.state.currentKing;
    const fallenRecord: FallenKing = {
      id: `fallen-${Date.now()}`,
      title: starvedKing.title,
      url: starvedKing.url,
      author: starvedKing.author,
      ratePerHour: starvedKing.ratePerHour,
      totalBurned: starvedKing.totalBurned,
      reignSeconds: starvedKing.reignSeconds,
      crownedAt: starvedKing.crownedAt,
      dethronedAt: Date.now(),
      cause: 'starved',
    };

    const starveEvent: ActivityEvent = {
      id: `act-starve-${Date.now()}`,
      type: 'starved',
      title: '💀 King Starved of Fuel!',
      description: `${starvedKing.author}'s tank hit $0 after reigning for ${Math.floor(starvedKing.reignSeconds / 60)}m ${starvedKing.reignSeconds % 60}s`,
      timestamp: Date.now(),
      author: starvedKing.author,
    };

    let nextKing: PinnedLink | null = null;
    let updatedQueue = [...this.state.queue];

    if (updatedQueue.length > 0) {
      // Sort queue by rate descending
      updatedQueue.sort((a, b) => b.ratePerHour - a.ratePerHour);
      const topChallenger = updatedQueue.shift()!;

      nextKing = {
        id: topChallenger.id,
        title: topChallenger.title,
        url: topChallenger.url,
        tagline: topChallenger.tagline,
        author: topChallenger.author,
        ratePerHour: topChallenger.ratePerHour,
        balance: topChallenger.balance,
        initialDeposit: topChallenger.balance,
        totalBurned: 0,
        crownedAt: Date.now(),
        lastTickAt: Date.now(),
        accentColor: topChallenger.accentColor,
        reignSeconds: 0,
        status: 'active',
        views: 0,
        clicks: 0,
      };

      const successionEvent: ActivityEvent = {
        id: `act-succession-${Date.now()}`,
        type: 'crown',
        title: '👑 Throne Inherited',
        description: `${nextKing.author} ascended from the challenger queue at $${nextKing.ratePerHour}/hr!`,
        timestamp: Date.now(),
        rate: nextKing.ratePerHour,
        author: nextKing.author,
      };

      this.state = {
        ...this.state,
        currentKing: nextKing,
        queue: updatedQueue,
        fallenKings: [fallenRecord, ...this.state.fallenKings],
        activity: [successionEvent, starveEvent, ...this.state.activity].slice(0, 30),
        minRate: nextKing.ratePerHour + MIN_RATE_INCREMENT,
        stats: {
          ...this.state.stats,
          totalReigns: this.state.stats.totalReigns + 1,
        },
      };
    } else {
      // Regenerate an organic placeholder challenger king so the game never dies
      nextKing = {
        id: `king-open-${Date.now()}`,
        title: 'Your Link Here — Claim The Crown Now',
        url: 'https://stayup.lol',
        tagline: 'The throne is open! Place a bid of $10/hr or more to seize #1',
        author: '@open_throne',
        ratePerHour: 15,
        balance: 10.00,
        initialDeposit: 10.00,
        totalBurned: 0,
        crownedAt: Date.now(),
        lastTickAt: Date.now(),
        accentColor: 'amber',
        reignSeconds: 0,
        status: 'active',
        views: 0,
        clicks: 0,
      };

      this.state = {
        ...this.state,
        currentKing: nextKing,
        queue: [],
        fallenKings: [fallenRecord, ...this.state.fallenKings],
        activity: [starveEvent, ...this.state.activity].slice(0, 30),
        minRate: 20,
      };
    }

    this.notify();
    this.broadcast();
  }

  /**
   * Action: Place a new bid / challenger
   */
  public async bid(data: {
    title: string;
    url: string;
    tagline: string;
    author: string;
    ratePerHour: number;
    depositAmount: number;
    accentColor?: string;
  }): Promise<{ success: boolean; message?: string }> {
    // First attempt server request if available
    if (this.isUsingServer) {
      try {
        const res = await fetch('/api/bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (res.ok) {
          if (json.id && json.manageKey) {
            saveOwnerKey(json.id, json.manageKey);
          }
          return { success: true, message: json.message };
        }
      } catch {
        // Fallback to local execution
      }
    }

    // Local Execution
    const rate = Math.max(10, Number(data.ratePerHour));
    const deposit = Math.max(5, Number(data.depositAmount));
    const accent = data.accentColor || 'amber';
    const authorHandle = data.author.startsWith('@') ? data.author : `@${data.author}`;

    const newId = `link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const secretKey = `mk_${Math.random().toString(36).substring(2, 10)}${Date.now()}`;
    saveOwnerKey(newId, secretKey);

    if (!this.state.currentKing || rate >= this.state.minRate) {
      // Dethrone current king!
      let updatedFallen = [...this.state.fallenKings];
      let dethroneEvent: ActivityEvent | null = null;

      if (this.state.currentKing) {
        const prev = this.state.currentKing;
        updatedFallen.unshift({
          id: `fallen-${Date.now()}`,
          title: prev.title,
          url: prev.url,
          author: prev.author,
          ratePerHour: prev.ratePerHour,
          totalBurned: prev.totalBurned,
          reignSeconds: prev.reignSeconds,
          crownedAt: prev.crownedAt,
          dethronedAt: Date.now(),
          cause: 'outbid',
          killerName: authorHandle,
        });

        dethroneEvent = {
          id: `act-dethrone-${Date.now()}`,
          type: 'outbid',
          title: '🚨 Crown Usurped!',
          description: `${prev.author} ($${prev.ratePerHour}/hr) was dethroned by ${authorHandle} ($${rate}/hr)! Remaining fuel refunded.`,
          timestamp: Date.now(),
          rate,
          author: authorHandle,
        };
      }

      const crownEvent: ActivityEvent = {
        id: `act-crown-${Date.now()}`,
        type: 'crown',
        title: '👑 New King Crowned',
        description: `${authorHandle} claimed #1 with "${data.title}" at $${rate.toFixed(2)}/hr ($${deposit.toFixed(2)} deposit)`,
        timestamp: Date.now(),
        rate,
        author: authorHandle,
      };

      const newKing: PinnedLink = {
        id: newId,
        title: data.title,
        url: data.url,
        tagline: data.tagline || 'Trending project on stayup.lol',
        author: authorHandle,
        ratePerHour: rate,
        balance: deposit,
        initialDeposit: deposit,
        totalBurned: 0,
        crownedAt: Date.now(),
        lastTickAt: Date.now(),
        accentColor: accent,
        reignSeconds: 0,
        status: 'active',
        views: 0,
        clicks: 0,
      };

      const newActivity = dethroneEvent
        ? [crownEvent, dethroneEvent, ...this.state.activity]
        : [crownEvent, ...this.state.activity];

      this.state = {
        ...this.state,
        currentKing: newKing,
        fallenKings: updatedFallen,
        activity: newActivity.slice(0, 30),
        minRate: rate + MIN_RATE_INCREMENT,
        stats: {
          ...this.state.stats,
          totalReigns: this.state.stats.totalReigns + 1,
          highestRateEver: Math.max(this.state.stats.highestRateEver, rate),
        },
      };
    } else {
      // Put in challenger queue
      const queuedItem: QueuedLink = {
        id: newId,
        title: data.title,
        url: data.url,
        tagline: data.tagline,
        author: authorHandle,
        ratePerHour: rate,
        balance: deposit,
        accentColor: accent,
        submittedAt: Date.now(),
      };

      const newQueue = [...this.state.queue, queuedItem].sort((a, b) => b.ratePerHour - a.ratePerHour);

      const queueEvent: ActivityEvent = {
        id: `act-queue-${Date.now()}`,
        type: 'crown',
        title: '⚔️ New Challenger Entered',
        description: `${authorHandle} entered the challenger queue with $${rate.toFixed(2)}/hr rate`,
        timestamp: Date.now(),
        rate,
        author: authorHandle,
      };

      this.state = {
        ...this.state,
        queue: newQueue,
        activity: [queueEvent, ...this.state.activity].slice(0, 30),
      };
    }

    this.notify();
    this.broadcast();
    return { success: true };
  }

  /**
   * Action: Refuel fuel tank
   */
  public async refuel(targetId: string, amount: number): Promise<{ success: boolean; isOwner?: boolean }> {
    const ownerKey = getOwnerKey(targetId) || '';
    if (this.isUsingServer) {
      try {
        const res = await fetch('/api/topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-manage-key': ownerKey,
          },
          body: JSON.stringify({ id: targetId, amount, manageKey: ownerKey }),
        });
        if (res.ok) {
          const json = await res.json();
          return { success: true, isOwner: json.isOwner };
        }
      } catch {
        // Fallback to local
      }
    }

    // Local refuel
    const isOwner = isOwnerOf(targetId);
    if (this.state.currentKing && this.state.currentKing.id === targetId) {
      const newBal = this.state.currentKing.balance + amount;
      const refuelEvent: ActivityEvent = {
        id: `act-refuel-${Date.now()}`,
        type: 'refuel',
        title: isOwner ? '⛽ Owner Refueled Tank' : '🎁 Supporter Fuel Boost',
        description: `${isOwner ? this.state.currentKing.author : 'A supporter'} injected +$${amount.toFixed(2)} fuel into "${this.state.currentKing.title}"`,
        timestamp: Date.now(),
        amount,
        author: this.state.currentKing.author,
      };

      this.state = {
        ...this.state,
        currentKing: {
          ...this.state.currentKing,
          balance: newBal,
        },
        activity: [refuelEvent, ...this.state.activity].slice(0, 30),
      };
    } else {
      // Check queue
      const updatedQueue = this.state.queue.map((q) => {
        if (q.id === targetId) {
          return { ...q, balance: q.balance + amount };
        }
        return q;
      });

      this.state = {
        ...this.state,
        queue: updatedQueue,
      };
    }

    this.notify();
    this.broadcast();
    return { success: true, isOwner };
  }

  /**
   * Action: Boost Rate (Rate Defense)
   * Strictly enforces owner key authorization
   */
  public async boostRate(kingId: string, newRate: number): Promise<{ success: boolean; error?: string }> {
    const ownerKey = getOwnerKey(kingId) || '';

    if (this.isUsingServer) {
      try {
        const res = await fetch('/api/boost-rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-manage-key': ownerKey,
          },
          body: JSON.stringify({ id: kingId, newRate, manageKey: ownerKey }),
        });
        const json = await res.json();
        if (res.ok) return { success: true };
        return { success: false, error: json.error || 'Failed to boost rate' };
      } catch {
        // Fallback to local
      }
    }

    // Local check
    if (this.state.currentKing && this.state.currentKing.id === kingId) {
      const oldRate = this.state.currentKing.ratePerHour;
      const event: ActivityEvent = {
        id: `act-boost-${Date.now()}`,
        type: 'rate_boost',
        title: '🛡️ Rate Defense Activated',
        description: `${this.state.currentKing.author} raised burn rate from $${oldRate}/hr to $${newRate}/hr to deter snipers!`,
        timestamp: Date.now(),
        rate: newRate,
        author: this.state.currentKing.author,
      };

      this.state = {
        ...this.state,
        currentKing: {
          ...this.state.currentKing,
          ratePerHour: newRate,
        },
        minRate: newRate + MIN_RATE_INCREMENT,
        activity: [event, ...this.state.activity].slice(0, 30),
        stats: {
          ...this.state.stats,
          highestRateEver: Math.max(this.state.stats.highestRateEver, newRate),
        },
      };

      this.notify();
      this.broadcast();
    }

    return { success: true };
  }

  /**
   * Action: Reset state to clean blank slate (clears demo seeds and sets 0 total burned)
   */
  public async resetToCleanSlate(): Promise<{ success: boolean }> {
    if (this.isUsingServer) {
      try {
        const res = await fetch('/api/reset-state', { method: 'POST' });
        if (res.ok) return { success: true };
      } catch {}
    }

    this.state = {
      currentKing: null,
      queue: [],
      fallenKings: [],
      activity: [
        {
          id: `act-clean-${Date.now()}`,
          type: 'crown',
          title: '✨ Clean Slate Initialized',
          description: 'Throne is now open. Place the very first bid to claim #1!',
          timestamp: Date.now(),
          author: '@stayup_protocol',
        },
      ],
      stats: {
        totalBurnedAllTime: 0,
        totalReigns: 0,
        highestRateEver: 0,
        longestReignSeconds: 0,
        currentSpectators: 1,
      },
      minRate: 10,
      serverTime: Date.now(),
      isDemoMode: true,
      razorpayEnabled: false,
      razorpayTestMode: true,
      razorpayKeyId: null,
      stripeEnabled: false,
      stripeTestMode: true,
    };

    this.notify();
    this.broadcast();
    return { success: true };
  }

  /**
   * Action: Simulate rival outbid
   */
  public async simulateRival(): Promise<{ success: boolean }> {
    if (this.isUsingServer) {
      try {
        const res = await fetch('/api/simulate-rival', { method: 'POST' });
        if (res.ok) return { success: true };
      } catch {
        // Fallback to local
      }
    }

    const currentRate = this.state.currentKing?.ratePerHour || 100;
    const rivalRate = currentRate + 15 + Math.floor(Math.random() * 20);
    const rivalDeposits = [40, 50, 65, 80];
    const rivalDeposit = rivalDeposits[Math.floor(Math.random() * rivalDeposits.length)];

    const rivals = [
      {
        title: 'SynthWave.fm — 24/7 Retro Lofi Beats for Deep Coding',
        url: 'https://synthwave.fm',
        tagline: 'Ambient cyber-frequencies generated by neural synthesis',
        author: '@lofi_coder',
        accentColor: 'violet',
      },
      {
        title: 'ZeroKnowledge.run — Privacy-First Serverless Micro-VMs',
        url: 'https://zeroknowledge.run',
        tagline: 'Deploy end-to-end encrypted micro-containers in under 200ms',
        author: '@zk_dev',
        accentColor: 'cyan',
      },
      {
        title: 'PromptMatrix — Neural Evaluator for System Instructions',
        url: 'https://promptmatrix.dev',
        tagline: 'Test 100 variations of your prompt against latency benchmarks',
        author: '@matrix_hacker',
        accentColor: 'rose',
      },
      {
        title: 'RayTracer.gpu — Pure WebGPU Realtime Raytracing in Canvas',
        url: 'https://raytracer.gpu',
        tagline: 'Path tracing directly inside Chromium without native plugins',
        author: '@graphics_guru',
        accentColor: 'emerald',
      },
    ];

    const pick = rivals[Math.floor(Math.random() * rivals.length)];

    return this.bid({
      title: pick.title,
      url: pick.url,
      tagline: pick.tagline,
      author: pick.author,
      ratePerHour: rivalRate,
      depositAmount: rivalDeposit,
      accentColor: pick.accentColor,
    });
  }

  /**
   * Action: Track click
   */
  public trackClick(id: string) {
    if (this.isUsingServer) {
      fetch('/api/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }).catch(() => {});
    }

    if (this.state.currentKing && this.state.currentKing.id === id) {
      this.state = {
        ...this.state,
        currentKing: {
          ...this.state.currentKing,
          clicks: this.state.currentKing.clicks + 1,
        },
      };
      this.notify();
    }
  }
}

export const burnEngine = new BurnEngine();
