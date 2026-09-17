import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    notes: clientNotes,
  } = req.body || {};

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ error: 'Razorpay secret is not configured on server.' });
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing order_id, payment_id, or signature.' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  let isValid = false;
  try {
    isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(razorpay_signature, 'utf8')
    );
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: 'Invalid payment signature. Verification failed.',
    });
  }

  const action = clientNotes?.action || 'bid';
  const id = `link-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const manageKey = clientNotes?.manageKey || `mk_${crypto.randomBytes(16).toString('hex')}`;

  return res.status(200).json({
    success: true,
    action,
    id,
    manageKey,
    isKing: true,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    message: 'Payment verified successfully.',
  });
}
