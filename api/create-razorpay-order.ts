import Razorpay from 'razorpay';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    // Action 1: Bid
    if (action === 'bid' || (!action && title && url)) {
      if (!title || !url || !author) {
        return res.status(400).json({ error: 'Title, URL, and author are required.' });
      }

      const rate = Number(ratePerHour);
      const deposit = Number(depositAmount);

      if (isNaN(rate) || rate < 10 || isNaN(deposit) || deposit < 5) {
        return res.status(400).json({ error: 'Invalid rate (min $10/hr) or fuel deposit (min $5.00).' });
      }

      const manageKey = `mk_${crypto.randomBytes(16).toString('hex')}`;
      const order = await razorpay.orders.create({
        amount: Math.round(deposit * 100),
        currency,
        receipt: `rcpt_bid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        notes: {
          action: 'bid',
          title: String(title).slice(0, 100),
          url: String(url).slice(0, 200),
          tagline: String(tagline || '').slice(0, 150),
          author: String(author).slice(0, 50),
          ratePerHour: rate.toString(),
          depositAmount: deposit.toString(),
          accentColor: accentColor || 'amber',
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

    // Action 2: Topup (Refuel)
    if (action === 'topup') {
      const target = targetId || req.body?.id;
      const numAmount = Number(amount || depositAmount);
      const manageKey = (req.headers?.['x-manage-key'] as string) || req.body?.manageKey;

      if (!target || isNaN(numAmount) || numAmount < 1) {
        return res.status(400).json({ error: 'Valid target ID and amount (minimum $1.00) required.' });
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

    // Action 3: Boost rate
    if (action === 'boost_rate') {
      const target = targetId || req.body?.id;
      const rate = Number(newRate);
      const deposit = Number(depositAmount || 0);
      const manageKey = (req.headers?.['x-manage-key'] as string) || req.body?.manageKey;

      if (!target || isNaN(rate)) {
        return res.status(400).json({ error: 'Valid target ID and newRate required.' });
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
