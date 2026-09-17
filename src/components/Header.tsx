import React from 'react';
import { Crown, Flame, Eye, Volume2, VolumeX, Swords, PlusCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { GlobalStats } from '../types';
import { formatCurrency } from '../utils/formatters';

interface HeaderProps {
  stats: GlobalStats;
  minRate: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenBidModal: () => void;
  onSimulateRival: () => void;
  onResetState: () => void;
  isSimulating: boolean;
  stripeEnabled?: boolean;
  stripeTestMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  minRate,
  isMuted,
  onToggleMute,
  onOpenBidModal,
  onSimulateRival,
  onResetState,
  isSimulating,
  stripeEnabled,
  stripeTestMode,
}) => {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Branding & Core Mechanic */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0">
            <Crown className="w-6 h-6 fill-current stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xl tracking-tight text-white font-mono">
                stayup<span className="text-amber-400">.lol</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE TICK
              </span>
              {stripeEnabled ? (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30"
                  title={stripeTestMode ? 'Stripe test mode active (sk_test_...) — safe testing with fake card 4242 4242 4242 4242' : 'Stripe live card billing active'}
                >
                  <ShieldCheck className="w-3 h-3 text-violet-400" />
                  {stripeTestMode ? 'STRIPE TEST MODE (sk_test)' : 'STRIPE LIVE'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  🧪 SANDBOX DEMO
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Pay an hourly rate to hold #1. When your fuel hits $0 or someone outbids you, you drop instantly.
            </p>
          </div>
        </div>

        {/* Center / Right Metrics & Quick Actions */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 self-end md:self-auto">
          {/* Spectator counter (Real viewers) */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
            title="Real-time connected viewers watching the live burn ticker"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono font-medium text-amber-400">{stats.currentSpectators}</span>
            <span className="text-zinc-500 hidden sm:inline">live</span>
          </div>

          {/* Total incinerated ticker */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-zinc-500 hidden sm:inline">Burned:</span>
            <span className="font-mono font-medium text-orange-400">
              {formatCurrency(stats.totalBurnedAllTime)}
            </span>
          </div>

          {/* Audio toggle button */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Sound Effects' : 'Mute Tension Audio'}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Reset Clean Slate button */}
          <button
            onClick={() => {
              if (window.confirm('Reset state to a clean slate ($0 burned, empty throne)?')) {
                onResetState();
              }
            }}
            title="Reset throne and purge starter seed data to start with an empty slate"
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-amber-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Test / Simulate Rival Attack button */}
          <button
            onClick={onSimulateRival}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-medium text-zinc-200 hover:text-white transition-all disabled:opacity-50"
            title="Simulate an automated rival bot outbidding #1 to test real-time dethronement"
          >
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">🧪 Test Bot Snipe</span>
            <span className="sm:hidden">Snipe</span>
          </button>

          {/* Primary Action: Claim #1 */}
          <button
            onClick={onOpenBidModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs tracking-wide shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>PIN MY LINK (${minRate}/hr)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
