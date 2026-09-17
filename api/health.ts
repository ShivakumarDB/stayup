export default function handler(req: any, res: any) {
  const rawKey = process.env.STRIPE_SECRET_KEY || '';
  const rawWebhook = process.env.STRIPE_WEBHOOK_SECRET || '';

  // Real-time serverless execution log visible directly in Vercel Function Logs
  console.log(`[VERCEL FUNCTION LOG - /api/health] 🚀 Invoked at ${new Date().toISOString()}`);
  console.log(`[VERCEL FUNCTION LOG - /api/health] STRIPE_SECRET_KEY present: ${Boolean(rawKey)}, length: ${rawKey.length}, prefix: "${rawKey ? rawKey.slice(0, 7) : 'NONE'}"`);
  console.log(`[VERCEL FUNCTION LOG - /api/health] STRIPE_WEBHOOK_SECRET present: ${Boolean(rawWebhook)}, length: ${rawWebhook.length}, prefix: "${rawWebhook ? rawWebhook.slice(0, 6) : 'NONE'}"`);
  console.log(`[VERCEL FUNCTION LOG - /api/health] VERCEL_ENV: ${process.env.VERCEL_ENV || 'undefined'}, NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`[VERCEL FUNCTION LOG - /api/health] Available process.env keys: ${Object.keys(process.env).filter((k) => !k.startsWith('npm_')).join(', ')}`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  return res.status(200).json({
    status: 'ok',
    serverTime: Date.now(),
    handler: 'vercel-serverless-api-health',
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
}
