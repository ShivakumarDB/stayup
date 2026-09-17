export default function handler(req: any, res: any) {
  const rawKeyId = process.env.RAZORPAY_KEY_ID || '';
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const rawWebhook = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  // Real-time serverless execution log visible directly in Vercel Function Logs
  console.log(`[VERCEL FUNCTION LOG - /api/health] 🚀 Invoked at ${new Date().toISOString()}`);
  console.log(`[VERCEL FUNCTION LOG - /api/health] RAZORPAY_KEY_ID present: ${Boolean(rawKeyId)}, length: ${rawKeyId.length}, prefix: "${rawKeyId ? rawKeyId.slice(0, 8) : 'NONE'}"`);
  console.log(`[VERCEL FUNCTION LOG - /api/health] RAZORPAY_KEY_SECRET present: ${Boolean(rawKeySecret)}, length: ${rawKeySecret.length}`);
  console.log(`[VERCEL FUNCTION LOG - /api/health] VERCEL_ENV: ${process.env.VERCEL_ENV || 'undefined'}, NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`[VERCEL FUNCTION LOG - /api/health] Available process.env keys: ${Object.keys(process.env).filter((k) => !k.startsWith('npm_')).join(', ')}`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  return res.status(200).json({
    status: 'ok',
    serverTime: Date.now(),
    handler: 'vercel-serverless-api-health',
    razorpay: {
      isKeyPresent: Boolean(rawKeyId && rawKeySecret),
      keyPrefix: rawKeyId ? rawKeyId.slice(0, 8) : null,
      keyIdLength: rawKeyId.length,
      isSecretPresent: Boolean(rawKeySecret),
      isWebhookSecretPresent: Boolean(rawWebhook),
      isTestMode: rawKeyId.startsWith('rzp_test_'),
      keyId: rawKeyId || null,
    },
    razorpayEnabled: Boolean(rawKeyId && rawKeySecret),
    razorpayKeyId: rawKeyId || null,
    vercel: {
      isVercel: Boolean(process.env.VERCEL),
      vercelEnv: process.env.VERCEL_ENV || null,
      vercelRegion: process.env.VERCEL_REGION || null,
    },
    nodeEnv: process.env.NODE_ENV || 'development',
  });
}
