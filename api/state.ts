export default function handler(req: any, res: any) {
  const rawKeyId = process.env.RAZORPAY_KEY_ID || '';
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  return res.status(200).json({
    currentKing: {
      id: 'king-seed-1',
      title: 'DropCraft — Instant AI Landing Pages',
      url: 'https://dropcraft.page',
      tagline: 'Generate high-converting SaaS landing pages in 60s',
      author: '@bot_dropcraft',
      authorHandle: 'bot_dropcraft',
      ratePerHour: 216,
      balance: 18.5,
      initialDeposit: 45,
      crownedAt: Date.now() - 3600000,
      accentColor: 'amber',
      status: 'active',
      clicks: 42,
      isOwner: false,
    },
    queue: [],
    fallen: [],
    recentTransactions: [],
    burnRatePerSecond: 216 / 3600,
    serverTime: Date.now(),
    razorpayEnabled: Boolean(rawKeyId && rawKeySecret),
    razorpayTestMode: rawKeyId.startsWith('rzp_test_'),
    razorpayKeyId: rawKeyId || null,
  });
}
