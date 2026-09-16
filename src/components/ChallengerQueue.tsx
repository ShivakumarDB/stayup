import React from 'react';
import { ExternalLink, Swords, Droplets, Zap, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { QueuedLink } from '../types';
import { ACCENT_THEMES, formatCurrency } from '../utils/formatters';

interface ChallengerQueueProps {
  queue: QueuedLink[];
  minRateToOutbidKing: number;
  onOpenBidModal: () => void;
  onRefuelQueued: (id: string) => void;
}

export const ChallengerQueue: React.FC<ChallengerQueueProps> = ({
  queue,
  minRateToOutbidKing,
  onOpenBidModal,
  onRefuelQueued,
}) => {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-zinc-800 text-amber-400">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Challenger Queue
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-zinc-800 text-zinc-300">
                {queue.length} in line
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              When #1 runs out of fuel, Rank #2 inherits the throne automatically.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenBidModal}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors border border-zinc-700/60"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Queue a Link</span>
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-zinc-500 text-xs">
          No challengers in queue right now. Queue a link with fuel to automatically take #1 the second the current king starves!
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item, index) => {
            const rank = index + 2;
            const theme = ACCENT_THEMES[item.accentColor] || ACCENT_THEMES.cyan;
            const burnSec = item.ratePerHour / 3600;
            const estMinutes = burnSec > 0 ? Math.floor(item.balance / burnSec / 60) : 0;

            return (
              <div
                key={item.id}
                className="group relative rounded-xl border border-zinc-800/90 bg-zinc-950/60 p-3.5 hover:border-zinc-700/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Rank & Title */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-mono font-bold text-zinc-400 shrink-0">
                    #{rank}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-sm text-zinc-200 hover:text-amber-400 transition-colors truncate flex items-center gap-1"
                      >
                        <span>{item.title}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400" />
                      </a>
                    </div>
                    {item.tagline && (
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{item.tagline}</p>
                    )}
                    <span className="text-[11px] font-mono text-zinc-500">
                      by {item.author}
                    </span>
                  </div>
                </div>

                {/* Right: Rate, Fuel Tank, Top Up */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0 self-end sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/60">
                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-amber-400">
                      ${item.ratePerHour}/hr
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {formatCurrency(item.balance)} tank (~{estMinutes}m)
                    </div>
                  </div>

                  <button
                    onClick={() => onRefuelQueued(item.id)}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors"
                    title="Add fuel to this queued link"
                  >
                    <Droplets className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
