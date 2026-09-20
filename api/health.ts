import { kv } from '@vercel/kv';

export default function handler(req: any, res: any) {
  const rawKeyId = process.env.RAZORPAY_KEY_ID || '';
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const rawWebhook = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const isKvConfigured = Boolean(kvUrl && kvToken);

  // Serverless execution log
  console.log(`[VERCEL FUNCTION LOG - /api/health] 🚀 Invoked at ${new Date().toISOString()}`);
  console.log(`[VERCEL FUNCTION LOG - /api/health] RAZORPAY_KEY_ID present: ${Boolean(rawKeyId)}, RAZORPAY_KEY_SECRET present: ${Boolean(rawKeySecret)}`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  return res.status(200).json({
    status: 'ok',
    serverTime: Date.now(),
    handler: 'vercel-serverless-api-health',
    razorpay: {
      isKeyPresent: Boolean(rawKeyId),
      isSecretPresent: Boolean(rawKeySecret),
      isWebhookSecretPresent: Boolean(rawWebhook),
      isTestMode: rawKeyId.startsWith('rzp_test_'),
    },
    razorpayEnabled: Boolean(rawKeyId && rawKeySecret),
    database: {
      type: isKvConfigured ? 'vercel_kv' : 'local_fs',
      isConfigured: isKvConfigured,
      message: isKvConfigured
        ? 'Vercel KV is active and persisting application state across cold starts and deployments.'
        : 'Running in serverless mode. Connect Vercel KV (KV_REST_API_URL and KV_REST_API_TOKEN) for cross-instance state persistence.',
    },
    vercel: {
      isVercel: Boolean(process.env.VERCEL),
      vercelEnv: process.env.VERCEL_ENV || null,
      vercelRegion: process.env.VERCEL_REGION || null,
    },
    nodeEnv: process.env.NODE_ENV || 'development',
  });
}
