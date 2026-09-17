export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  // Send an initial heartbeat and close politely so the client switches to client-side interval ticks
  res.write(`event: ping\ndata: {"status":"connected","time":${Date.now()}}\n\n`);
  res.end();
}
