export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatSecondsToTimer(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatDurationHuman(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

export function timeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export const ACCENT_THEMES: Record<string, {
  border: string;
  glow: string;
  badge: string;
  bar: string;
  text: string;
  bgGlow: string;
}> = {
  amber: {
    border: 'border-amber-500/40',
    glow: 'shadow-[0_0_40px_rgba(245,158,11,0.15)]',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    bar: 'bg-amber-500',
    text: 'text-amber-400',
    bgGlow: 'from-amber-500/10 via-amber-500/5 to-transparent',
  },
  emerald: {
    border: 'border-emerald-500/40',
    glow: 'shadow-[0_0_40px_rgba(16,185,129,0.15)]',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    bar: 'bg-emerald-500',
    text: 'text-emerald-400',
    bgGlow: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
  },
  violet: {
    border: 'border-violet-500/40',
    glow: 'shadow-[0_0_40px_rgba(139,92,246,0.15)]',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    bar: 'bg-violet-500',
    text: 'text-violet-400',
    bgGlow: 'from-violet-500/10 via-violet-500/5 to-transparent',
  },
  cyan: {
    border: 'border-cyan-500/40',
    glow: 'shadow-[0_0_40px_rgba(6,182,212,0.15)]',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    bar: 'bg-cyan-500',
    text: 'text-cyan-400',
    bgGlow: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
  },
  rose: {
    border: 'border-rose-500/40',
    glow: 'shadow-[0_0_40px_rgba(244,63,94,0.15)]',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    bar: 'bg-rose-500',
    text: 'text-rose-400',
    bgGlow: 'from-rose-500/10 via-rose-500/5 to-transparent',
  },
};
