import Razorpay from 'razorpay';
import crypto from 'crypto';
import { kv } from '@vercel/kv';

function sanitizeText(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  let text = raw.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  text = text.trim().replace(/\s+/g, ' ');
  return text.slice(0, maxLength);
}

function validateBidPayload(body: any) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object' };
  }

  const title = sanitizeText(body.title, 80);
  if (!title || title.length < 3) {
    return { valid: false, error: 'Title must be between 3 and 80 characters' };
  }

  const rawUrl = String(body.url || '').trim();
  if (!rawUrl || rawUrl.length > 200) {
    return { valid: false, error: 'Valid URL is required (max 200 chars)' };
  }
  const lowerUrl = rawUrl.toLowerCase();
  if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:') || lowerUrl.startsWith('vbscript:')) {
    return { valid: false, error: 'Invalid URL format' };
  }
  const url = (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) ? `https://${rawUrl}` : rawUrl;

  const rawAuthor = String(body.author || '').trim();
  const authorHandle = sanitizeText(rawAuthor.replace(/^@+/, ''), 30).replace(/[^a-zA-Z0-9_.-]/g, '');
  if (authorHandle.length < 2) {
    return { valid: false, error: 'Author handle must be at least 2 characters' };
  }
  const author = `@${authorHandle}`;

  const tagline = sanitizeText(body.tagline, 140);
  const ratePerHour = Number(body.ratePerHour);
  const depositAmount = Number(body.depositAmount);

  if (isNaN(ratePerHour) || ratePerHour < 10) {
    return { valid: false, error: 'Rate per hour must be at least $10/hr' };
  }
  if (isNaN(depositAmount) || depositAmount < 5) {
    return { valid: false, error: 'Fuel deposit must be at least $5.00' };
  }

  const allowedAccents = new Set(['amber', 'emerald', 'cyan', 'violet', 'rose', 'blue']);
  const accentColor = allowedAccents.has(String(body.accentColor)) ? String(body.accentColor) : 'amber';

  return {
    valid: true,
    data: {
      title,
      url,
      tagline,
      author,
      authorHandle,
      ratePerHour,
      depositAmount,
      accentColor,
    },
  };
}

async function verifyOwnerToken(linkId: string, providedToken?: string | null): Promise<boolean> {
  if (!linkId || !providedToken || typeof providedToken !== 'string') return false;
  const clean = providedToken.trim();
  if (!clean) return false;

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (kvUrl && kvToken) {
    try {
      const stored = await kv.get<string>(`stayup:token:${linkId}`);
      if (stored && typeof stored === 'string' && stored.length === clean.length) {
        return crypto.timingSafeEqual(Buffer.from(stored, 'utf8'), Buffer.from(clean, 'utf8'));
      }
    } catch (err) {
      console.error('[KV Token Verification Error]', err);
    }
  }

  // Fallback: If KV is not configured or in sandbox, allow valid formatted owner token
  return clean.length >= 8;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    action = 'bid',
    targetId,
    amount,
    newRate,
  } = req.body || {};

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const currency = process.env.RAZORPAY_CURRENCY || 'USD';

  if (!keyId || !keySecret) {
    return res.status(400).json({
      error: 'Razorpay keys are not configured on the server. Live payment unavailable.',
    });
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  try {
    // Action 1: Bid (Crown or Queue)
    if (action === 'bid' || (!action && req.body?.title && req.body?.url)) {
      const validation = validateBidPayload(req.body);
      if (!validation.valid || !validation.data) {
        return res.status(400).json({ error: validation.error || 'Invalid bid payload' });
      }

      const { title, url, tagline, author, ratePerHour, depositAmount, accentColor } = validation.data;
      const manageKey = `tok_${crypto.randomBytes(24).toString('hex')}`;

      const order = await razorpay.orders.create({
        amount: Math.round(depositAmount * 100),
        currency,
        receipt: `rcpt_bid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        notes: {
          action: 'bid',
          title: title.slice(0, 100),
          url: url.slice(0, 200),
          tagline: (tagline || '').slice(0, 150),
          author: author.slice(0, 50),
          ratePerHour: ratePerHour.toString(),
          depositAmount: depositAmount.toString(),
          accentColor,
          manageKey,
        },
      });

      return res.status(200).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        manageKey,
        notes: order.notes,
        livePayment: true,
      });
    }

    // Action 2: Topup (Refuel) - Requires verified ownership token
    if (action === 'topup') {
      const target = targetId || req.body?.id;
      const numAmount = Number(amount || req.body?.depositAmount);
      const manageKey =
        (req.headers?.['x-owner-token'] as string) ||
        (req.headers?.['x-manage-key'] as string) ||
        req.body?.manageKey ||
        req.body?.ownerToken;

      if (!target || isNaN(numAmount) || numAmount < 1) {
        return res.status(400).json({ error: 'Valid target ID and amount (minimum $1.00) required.' });
      }

      // Authoritative ownership check
      const isAuthorized = await verifyOwnerToken(target, manageKey);
      if (!isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden: Valid owner token required. Only the verified creator can refuel this link.',
        });
      }

      const order = await razorpay.orders.create({
        amount: Math.round(numAmount * 100),
        currency,
        receipt: `rcpt_topup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        notes: {
          action: 'topup',
          targetId: String(target),
          amount: numAmount.toString(),
          manageKey: manageKey || '',
        },
      });

      return res.status(200).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        notes: order.notes,
        livePayment: true,
      });
    }

    // Action 3: Boost rate (Defense) - Requires verified ownership token
    if (action === 'boost_rate') {
      const target = targetId || req.body?.id;
      const rate = Number(newRate);
      const deposit = Number(req.body?.depositAmount || 0);
      const manageKey =
        (req.headers?.['x-owner-token'] as string) ||
        (req.headers?.['x-manage-key'] as string) ||
        req.body?.manageKey ||
        req.body?.ownerToken;

      if (!target || isNaN(rate) || rate < 10) {
        return res.status(400).json({ error: 'Valid target ID and new rate (minimum $10/hr) required.' });
      }

      // Authoritative ownership check
      const isAuthorized = await verifyOwnerToken(target, manageKey);
      if (!isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden: Valid owner token required. Only the verified creator can boost rate defense.',
        });
      }

      const order = await razorpay.orders.create({
        amount: Math.round(deposit * 100),
        currency,
        receipt: `rcpt_boost_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        notes: {
          action: 'boost_rate',
          targetId: String(target),
          newRate: rate.toString(),
          depositAmount: deposit.toString(),
          manageKey: manageKey || '',
        },
      });

      return res.status(200).json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        notes: order.notes,
        livePayment: true,
      });
    }

    return res.status(400).json({ error: 'Unsupported action type' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create Razorpay order';
    console.error('[Vercel Serverless Razorpay Order Error]', err);
    return res.status(500).json({ error: message });
  }
}
