export interface PinnedLink {
  id: string;
  title: string;
  url: string;
  tagline: string;
  author: string;
  authorHandle?: string;
  ratePerHour: number; // e.g. 150 ($150/hr)
  balance: number; // Remaining fuel in USD ($)
  initialDeposit: number;
  totalBurned: number; // Total burned during reign
  crownedAt: number; // timestamp ms
  lastTickAt: number; // timestamp ms
  accentColor: string; // e.g. 'amber' | 'emerald' | 'violet' | 'rose' | 'cyan'
  reignSeconds: number; // accumulated active reign in seconds
  status: 'active' | 'dethroned' | 'starved';
  views: number;
  clicks: number;
}

export interface QueuedLink {
  id: string;
  title: string;
  url: string;
  tagline: string;
  author: string;
  ratePerHour: number;
  balance: number;
  accentColor: string;
  submittedAt: number;
}

export interface FallenKing {
  id: string;
  title: string;
  url: string;
  author: string;
  ratePerHour: number;
  totalBurned: number;
  reignSeconds: number;
  crownedAt: number;
  dethronedAt: number;
  cause: 'outbid' | 'starved';
  killerName?: string;
}

export interface ActivityEvent {
  id: string;
  type: 'crown' | 'outbid' | 'refuel' | 'starved' | 'rate_boost' | 'click';
  title: string;
  description: string;
  timestamp: number;
  amount?: number;
  rate?: number;
  author?: string;
}

export interface GlobalStats {
  totalBurnedAllTime: number;
  totalReigns: number;
  highestRateEver: number;
  longestReignSeconds: number;
  currentSpectators: number;
}

export interface ServerState {
  currentKing: PinnedLink | null;
  queue: QueuedLink[];
  fallenKings: FallenKing[];
  activity: ActivityEvent[];
  stats: GlobalStats;
  minRate: number; // minimum rate per hour required to challenge #1
  serverTime: number;
}
