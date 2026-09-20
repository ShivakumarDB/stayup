import fs from 'fs';
import path from 'path';
import { kv, createClient } from '@vercel/kv';
import type { FallenKing, ActivityEvent, GlobalStats } from '../src/types';

export interface InternalPinnedLink {
  id: string;
  title: string;
  url: string;
  tagline: string;
  author: string;
  authorHandle: string;
  ratePerHour: number;
  balance: number;
  initialDeposit: number;
  totalBurned: number;
  crownedAt: number;
  lastTickAt: number;
  accentColor: string;
  reignSeconds: number;
  status: 'active' | 'dethroned' | 'starved';
  views: number;
  clicks: number;
  manageKey?: string;
  isSeed?: boolean;
}

export interface InternalQueuedLink {
  id: string;
  title: string;
  url: string;
  tagline: string;
  author: string;
  ratePerHour: number;
  balance: number;
  accentColor: string;
  submittedAt: number;
  manageKey?: string;
  isSeed?: boolean;
}

export interface PersistedAppState {
  currentKing: InternalPinnedLink | null;
  queue: InternalQueuedLink[];
  fallenKings: FallenKing[];
  activity: ActivityEvent[];
  stats: GlobalStats;
  savedAt?: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_STATE_FILE = path.join(DATA_DIR, 'stayup-state.json');
const LOCAL_TOKENS_FILE = path.join(DATA_DIR, 'stayup-tokens.json');

// Ensure local data dir exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // Ignore
}

// Global In-Memory Token Cache to speed up token checks and fallback
const memoryTokens = new Map<string, string>();

// Initialize KV client if Vercel KV environment variables exist
type VercelKvClient = ReturnType<typeof createClient>;
let kvClient: VercelKvClient | null = null;

function getKvClient(): VercelKvClient | null {
  if (kvClient) return kvClient;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      kvClient = createClient({
        url,
        token,
      });
      console.log('[DB] Connected to persistent Vercel KV store at:', url);
    } catch (err) {
      console.error('[DB Error] Failed to initialize Vercel KV client:', err);
    }
  }

  return kvClient;
}

export function getDatabaseInfo(): {
  type: 'vercel_kv' | 'local_fs';
  isConfigured: boolean;
  message: string;
} {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return {
      type: 'vercel_kv',
      isConfigured: true,
      message: 'Vercel KV / Upstash Redis is active and persisting application state across cold starts and deployments.',
    };
  }

  return {
    type: 'local_fs',
    isConfigured: false,
    message: 'Using local file persistence (data/stayup-state.json). To enable production cloud persistence, configure KV_REST_API_URL and KV_REST_API_TOKEN (Vercel KV / Upstash Redis).',
  };
}

/**
 * Load state from persistent database (Vercel KV) or local file fallback
 */
export async function loadState(): Promise<PersistedAppState | null> {
  const kv = getKvClient();

  if (kv) {
    try {
      const data = await kv.get<PersistedAppState>('stayup:state');
      if (data && typeof data === 'object') {
        console.log('[DB] State successfully hydrated from Vercel KV');
        return data;
      }
    } catch (err) {
      console.error('[DB Error] Failed to read state from Vercel KV:', err);
    }
  }

  // Fallback to local file system
  try {
    if (fs.existsSync(LOCAL_STATE_FILE)) {
      const content = fs.readFileSync(LOCAL_STATE_FILE, 'utf-8');
      const data = JSON.parse(content);
      console.log('[DB] State loaded from local file storage:', LOCAL_STATE_FILE);
      return data;
    }
  } catch (err) {
    console.warn('[DB] Could not load state from local file storage:', err);
  }

  return null;
}

/**
 * Save state to persistent database (Vercel KV) and local file fallback
 */
export async function saveState(state: PersistedAppState): Promise<boolean> {
  const payload: PersistedAppState = {
    ...state,
    savedAt: Date.now(),
  };

  let savedSuccessfully = false;
  const kv = getKvClient();

  if (kv) {
    try {
      await kv.set('stayup:state', payload);
      savedSuccessfully = true;
    } catch (err) {
      console.error('[DB Error] Failed to persist state to Vercel KV:', err);
    }
  }

  // Always write local backup copy if possible
  try {
    fs.writeFileSync(LOCAL_STATE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    savedSuccessfully = true;
  } catch (err) {
    // Non-fatal if read-only serverless filesystem
  }

  return savedSuccessfully;
}

/**
 * Store private management / owner token for a link
 */
export async function saveOwnerToken(linkId: string, token: string): Promise<void> {
  if (!linkId || !token) return;

  memoryTokens.set(linkId, token);

  const kv = getKvClient();
  if (kv) {
    try {
      // Retain token for 90 days in persistent store
      await kv.set(`stayup:token:${linkId}`, token, { ex: 60 * 60 * 24 * 90 });
    } catch (err) {
      console.error(`[DB Error] Failed to store owner token for ${linkId} in Vercel KV:`, err);
    }
  }

  // Also persist to local tokens file
  try {
    let tokens: Record<string, string> = {};
    if (fs.existsSync(LOCAL_TOKENS_FILE)) {
      tokens = JSON.parse(fs.readFileSync(LOCAL_TOKENS_FILE, 'utf-8'));
    }
    tokens[linkId] = token;
    fs.writeFileSync(LOCAL_TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
  } catch {
    // Non-fatal on serverless fs
  }
}

/**
 * Retrieve private owner token for a link
 */
export async function getOwnerToken(linkId: string): Promise<string | null> {
  if (!linkId) return null;

  if (memoryTokens.has(linkId)) {
    return memoryTokens.get(linkId) || null;
  }

  const kv = getKvClient();
  if (kv) {
    try {
      const token = await kv.get<string>(`stayup:token:${linkId}`);
      if (token) {
        memoryTokens.set(linkId, token);
        return token;
      }
    } catch (err) {
      console.error(`[DB Error] Failed to fetch token for ${linkId} from Vercel KV:`, err);
    }
  }

  // Check local file
  try {
    if (fs.existsSync(LOCAL_TOKENS_FILE)) {
      const tokens = JSON.parse(fs.readFileSync(LOCAL_TOKENS_FILE, 'utf-8'));
      if (tokens[linkId]) {
        memoryTokens.set(linkId, tokens[linkId]);
        return tokens[linkId];
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Verify whether a provided token matches the authoritative owner token for a link
 */
export async function verifyOwnerToken(linkId: string, providedToken?: string | null): Promise<boolean> {
  if (!linkId || !providedToken || typeof providedToken !== 'string') {
    return false;
  }

  const cleanProvided = providedToken.trim();
  if (!cleanProvided) return false;

  // Check cached token or fetch authoritative token
  const authoritativeToken = await getOwnerToken(linkId);
  if (!authoritativeToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (authoritativeToken.length !== cleanProvided.length) {
    return false;
  }

  let match = true;
  for (let i = 0; i < authoritativeToken.length; i++) {
    if (authoritativeToken.charCodeAt(i) !== cleanProvided.charCodeAt(i)) {
      match = false;
    }
  }

  return match;
}
