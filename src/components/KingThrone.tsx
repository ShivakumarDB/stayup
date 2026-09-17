import React from 'react';
import { Crown, ExternalLink, Flame, ShieldAlert, ArrowUpRight, Zap, Droplets, Shield, Clock, TrendingUp } from 'lucide-react';
import { PinnedLink } from '../types';
import { ACCENT_THEMES, formatCurrency, formatSecondsToTimer, formatDurationHuman } from '../utils/formatters';

interface KingThroneProps {
  king: PinnedLink | null;
  onOpenRefuel: () => void;
  onOpenBoostRate: () => void;
  onOpenBidModal: () => void;
  onLinkClick: (id: string, url: string) => void;
}

export const KingThrone: React.FC<KingThroneProps> = ({
  king,
  onOpenRefuel,
  onOpenBoostRate,
  onOpenBidModal,
  onLinkClick,
}) => {
  if (!king || king.status !== 'active') {
    return (
      <div className="relative rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-8 sm:p-12 text-center overflow-hidden">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-500">
          <Crown className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">The Throne is Vacant!</h2>
        <p className="text-zinc-400 max-w-md mx-auto mb-6 text-sm">
          The previous link ran out of money or was dethroned. Be the first to claim #1 and start the burn rate!
        </p>
        <button
          onClick={onOpenBidModal}
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
        >
          CLAIM #1 CROWN ($20.00/hr)
        </button>
      </div>
    );
  }

  const theme = ACCENT_THEMES[king.accentColor] || ACCENT_THEMES.amber;
  const burnPerSecond = king.ratePerHour / 3600;
  const secondsLeft = burnPerSecond > 0 ? Math.max(0, king.balance / burnPerSecond) : 0;
  const isCritical = secondsLeft > 0 && secondsLeft <= 60;
  const isVeryLow = secondsLeft > 60 && secondsLeft <= 180;

  // Percentage of fuel remaining relative to deposit (capped 100%)
  const maxRef = Math.max(king.initialDeposit, king.balance);
  const fuelPercent = maxRef > 0 ? Math.min(100, Math.max(2, (king.balance / maxRef) * 100)) : 0;

  return (
    <div
      className={`relative rounded-3xl border-2 ${
        isCritical
          ? 'border-rose-500 animate-pulse shadow-[0_0_50px_rgba(244,63,94,0.35)] bg-rose-950/20'
          : `${theme.border} ${theme.glow} bg-zinc-900/80`
      } p-5 sm:p-7 backdrop-blur-xl transition-all duration-300 overflow-hidden`}
    >
      {/* Background radial gradient glow */}
      <div
        className={`absolute -top-32 -left-32 w-80 h-80 rounded-full bg-gradient-to-br ${theme.bgGlow} blur-3xl pointer-events-none`}
      />

      {/* Top Banner: Rank #1 & Real-Time Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs tracking-wider uppercase font-mono">
            <Crown className="w-4 h-4 fill-amber-400 stroke-amber-950" />
            PINNED AT #1
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Held by <strong className="text-zinc-200">{king.author}</strong>
          </span>
          {king.isSeed && (
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Demo Seed
            </span>
          )}
          {king.isOwnedByMe && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <span>👑</span> You Own This Link
            </span>
          )}
        </div>

        {/* Live Tension Status Badge */}
        {isCritical ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500 text-rose-400 text-xs font-bold font-mono animate-bounce">
            <ShieldAlert className="w-4 h-4" />
            CRITICAL FUEL: DROP IMMINENT!
          </div>
        ) : isVeryLow ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold font-mono">
            <Clock className="w-3.5 h-3.5" />
            FUEL RUNNING LOW
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>BURNING FUEL LIVE</span>
          </div>
        )}
      </div>

      {/* Core Pinned Link Presentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6">
        {/* Left Column: Title, URL, Tagline, Clicks (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <a
            href={king.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onLinkClick(king.id, king.url)}
            className="group block"
          >
            <div className="flex items-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight group-hover:text-amber-400 transition-colors leading-snug">
                {king.title}
              </h1>
              <ArrowUpRight className="w-6 h-6 text-zinc-400 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
            </div>
            <p className="text-xs sm:text-sm font-mono text-amber-400/90 hover:underline flex items-center gap-1.5 mt-1 break-all">
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              {king.url}
            </p>
          </a>

          {king.tagline && (
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-normal">
              {king.tagline}
            </p>
          )}

          {/* Reign Duration & Clicks */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Time at #1:</span>
              <strong className="text-zinc-200">{formatDurationHuman(king.reignSeconds)}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
              <span>Visitors Routed:</span>
              <strong className="text-zinc-200">{king.clicks} clicks</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Tension Countdown & Live Money Burn Gauge (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-inner">
          {/* Large Countdown Timer */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                TIME BEFORE DROP
              </span>
              <span className={isCritical ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                {isCritical ? 'REFUEL NOW!' : 'COUNTING DOWN'}
              </span>
            </div>

            <div
              className={`text-4xl sm:text-5xl font-extrabold font-mono tracking-tight ${
                isCritical ? 'text-rose-500 animate-pulse' : 'text-white'
              }`}
            >
              {formatSecondsToTimer(secondsLeft)}
            </div>

            {/* Fuel Gauge Bar */}
            <div className="mt-3">
              <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-1000 ${
                    isCritical ? 'bg-rose-500' : isVeryLow ? 'bg-amber-500' : theme.bar
                  }`}
                  style={{ width: `${fuelPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 mt-1.5">
                <span>Fuel Tank: {fuelPercent.toFixed(0)}%</span>
                <span className="text-zinc-300 font-medium">
                  {formatCurrency(king.balance)} remaining
                </span>
              </div>
            </div>
          </div>

          {/* Burn Rate Stats Row */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block text-[10px]">BURN RATE</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-amber-400">
                  ${king.ratePerHour.toFixed(2)}
                </span>
                <span className="text-zinc-500 text-[10px]">/hr</span>
              </div>
              <span className="text-zinc-500 text-[10px]">
                (~${burnPerSecond.toFixed(4)}/sec)
              </span>
            </div>

            <div>
              <span className="text-zinc-500 block text-[10px]">TOTAL BURNED</span>
              <span className="text-base font-bold text-orange-400">
                {formatCurrency(king.totalBurned)}
              </span>
              <span className="text-zinc-500 block text-[10px]">
                from ${king.initialDeposit.toFixed(2)} funded
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar: Panic Refuel, Raise Defense, Outbid */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800/70">
        <div className="flex items-center flex-wrap gap-2">
          {/* Emergency Refuel Button */}
          <button
            onClick={onOpenRefuel}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs tracking-wider transition-all active:scale-95 ${
              isCritical
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/40 animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20'
            }`}
          >
            <Droplets className="w-4 h-4 fill-current" />
            <span>{king.isOwnedByMe ? '+ TOP UP MY FUEL' : '+ EXTEND AIRTIME (REFUEL)'}</span>
          </button>

          {/* Raise Defense / Boost Rate Button */}
          <button
            onClick={onOpenBoostRate}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium text-xs transition-colors border ${
              king.isOwnedByMe
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60'
            }`}
            title={
              king.isOwnedByMe
                ? 'Raise the burn rate to deter snipers from outbidding you'
                : 'Raise burn rate (Requires link owner secret key)'
            }
          >
            <Shield className={`w-3.5 h-3.5 ${king.isOwnedByMe ? 'text-amber-400 fill-amber-400/20' : 'text-zinc-400'}`} />
            <span>{king.isOwnedByMe ? 'Raise Rate Defense' : 'Rate Defense (Owner Only)'}</span>
          </button>
        </div>

        {/* Outbid / Usurp #1 Right Now */}
        <button
          onClick={onOpenBidModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs tracking-wide shadow-md shadow-amber-500/20 transition-all active:scale-95 ml-auto"
        >
          <Zap className="w-4 h-4 fill-zinc-950 stroke-zinc-950" />
          <span>OUTBID THIS RATE (${(king.ratePerHour + 5).toFixed(0)}/hr)</span>
        </button>
      </div>
    </div>
  );
};
