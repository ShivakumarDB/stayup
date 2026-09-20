/**
 * Server-side input validation and sanitization for stayup.lol
 * Ensures that all user-supplied data (title, url, tagline, author)
 * is strictly sanitized, length-limited, and validated against malicious input
 * before being stored or broadcast to spectators.
 */

export interface ValidatedBidInput {
  title: string;
  url: string;
  tagline: string;
  author: string;
  authorHandle: string;
  ratePerHour: number;
  depositAmount: number;
  accentColor: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: string;
}

/**
 * Strips script tags, HTML tags, control characters, and normalizes whitespace
 */
export function sanitizeText(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  // Remove script tags and contents
  let text = raw.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove all HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Remove control characters except newline/tab
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Normalize whitespace
  text = text.trim().replace(/\s+/g, ' ');
  return text.slice(0, maxLength);
}

/**
 * Validates and normalizes target URLs
 */
export function validateAndSanitizeUrl(rawUrl: unknown): { valid: boolean; url: string; error?: string } {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, url: '', error: 'URL is required' };
  }

  let cleaned = rawUrl.trim();
  if (cleaned.length > 200) {
    return { valid: false, url: '', error: 'URL must not exceed 200 characters' };
  }

  // Strictly block dangerous pseudo-schemes
  const lower = cleaned.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:')
  ) {
    return { valid: false, url: '', error: 'Malicious or invalid URL scheme' };
  }

  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, url: '', error: 'URL must use http or https protocol' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || !hostname.includes('.')) {
      return { valid: false, url: '', error: 'URL must contain a valid domain (e.g. example.com)' };
    }

    // Disallow loopback / private addresses in production bids
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local')
    ) {
      return { valid: false, url: '', error: 'Localhost and private network addresses are not permitted' };
    }

    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, url: '', error: 'Invalid URL format' };
  }
}

/**
 * Validates and sanitizes author handle
 */
export function validateAndSanitizeAuthor(rawAuthor: unknown): {
  valid: boolean;
  author: string;
  authorHandle: string;
  error?: string;
} {
  if (typeof rawAuthor !== 'string' || !rawAuthor.trim()) {
    return { valid: false, author: '', authorHandle: '', error: 'Author handle is required' };
  }

  let handle = sanitizeText(rawAuthor, 30);
  handle = handle.replace(/^@+/, '');
  // Keep only alphanumeric, underscores, hyphens
  handle = handle.replace(/[^a-zA-Z0-9_.-]/g, '');

  if (handle.length < 2) {
    return { valid: false, author: '', authorHandle: '', error: 'Author handle must be at least 2 characters' };
  }
  if (handle.length > 30) {
    handle = handle.slice(0, 30);
  }

  return {
    valid: true,
    author: `@${handle}`,
    authorHandle: handle,
  };
}

const ALLOWED_ACCENTS = new Set(['amber', 'emerald', 'cyan', 'violet', 'rose', 'blue']);

/**
 * Full validation pipeline for bid submission
 */
export function validateBidPayload(body: any): ValidationResult<ValidatedBidInput> {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object' };
  }

  // 1. Title Validation
  const title = sanitizeText(body.title, 80);
  if (!title || title.length < 3) {
    return { valid: false, error: 'Title must be between 3 and 80 characters' };
  }

  // 2. URL Validation
  const urlRes = validateAndSanitizeUrl(body.url);
  if (!urlRes.valid) {
    return { valid: false, error: urlRes.error || 'Invalid URL' };
  }

  // 3. Tagline Validation (optional)
  const tagline = sanitizeText(body.tagline || '', 120);

  // 4. Author Validation
  const authorRes = validateAndSanitizeAuthor(body.author);
  if (!authorRes.valid) {
    return { valid: false, error: authorRes.error || 'Invalid author handle' };
  }

  // 5. Rate Validation
  const rate = Number(body.ratePerHour);
  if (isNaN(rate) || rate < 10) {
    return { valid: false, error: 'Burn rate must be at least $10.00/hr' };
  }
  if (rate > 100000) {
    return { valid: false, error: 'Burn rate exceeds maximum allowed limit ($100,000/hr)' };
  }

  // 6. Deposit Amount Validation
  const deposit = Number(body.depositAmount);
  if (isNaN(deposit) || deposit < 5) {
    return { valid: false, error: 'Fuel deposit must be at least $5.00' };
  }
  if (deposit > 100000) {
    return { valid: false, error: 'Deposit amount exceeds maximum allowed limit ($100,000)' };
  }

  // 7. Accent Color Validation
  const rawAccent = typeof body.accentColor === 'string' ? body.accentColor.toLowerCase().trim() : 'amber';
  const accentColor = ALLOWED_ACCENTS.has(rawAccent) ? rawAccent : 'amber';

  return {
    valid: true,
    data: {
      title,
      url: urlRes.url,
      tagline,
      author: authorRes.author,
      authorHandle: authorRes.authorHandle,
      ratePerHour: Math.round(rate * 100) / 100,
      depositAmount: Math.round(deposit * 100) / 100,
      accentColor,
    },
  };
}
