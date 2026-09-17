import React, { useState } from 'react';
import { Skull, Trophy, Flame, Clock, ArrowUpRight, Zap } from 'lucide-react';
import { FallenKing } from '../types';
import { formatCurrency, formatDurationHuman, timeAgo } from '../utils/formatters';

interface HallOfFameProps {
  fallenKings: FallenKing[];
}

export const HallOfFame: React.FC<HallOfFameProps> = ({ fallenKings }) => {
  const [sortMode, setSortMode] = useState<'recent' | 'burned' | 'duration'>('burned');

  const sorted = [...fallenKings].sort((a, b) => {
    if (sortMode === 'burned') return b.totalBurned - a.totalBurned;
    if (sortMode === 'duration') return b.reignSeconds - a.reignSeconds;
    return b.dethronedAt - a.dethronedAt;
  });

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-zinc-800 text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Hall of Fallen Kings
              <span className="text-xs text-zinc-500 font-normal">
                ({fallenKings.length} monarchs dethroned)
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              The graveyard of past #1 monarchs and their final burn statistics.
            </p>
          </div>
        </div>

        {/* Filter / Sort Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800 self-start sm:self-auto text-xs font-mono">
          <button
            onClick={() => setSortMode('burned')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              sortMode === 'burned'
                ? 'bg-amber-500/20 text-amber-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Most Burned
          </button>
          <button
            onClick={() => setSortMode('duration')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              sortMode === 'duration'
                ? 'bg-amber-500/20 text-amber-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Longest Reign
          </button>
          <button
            onClick={() => setSortMode('recent')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              sortMode === 'recent'
                ? 'bg-amber-500/20 text-amber-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Recent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((king, idx) => (
          <div
            key={king.id}
            className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4 hover:border-zinc-700/80 transition-all flex flex-col justify-between gap-3 relative group"
          >
            <div>
              {/* Top row: Rank & Death cause */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono font-bold text-zinc-500">
                  #{idx + 1}
                </span>

                {king.cause === 'outbid' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Zap className="w-3 h-3" />
                    Outbid by {king.killerName || 'Challenger'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                    <Skull className="w-3 h-3 text-zinc-400" />
                    Fuel Starvation
                  </span>
                )}
              </div>

              {/* Title & Link */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <a
                  href={king.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sm text-zinc-200 group-hover:text-amber-400 transition-colors flex items-center gap-1 line-clamp-1"
                >
                  <span>{king.title}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </a>
                {king.isSeed && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-500 border border-zinc-700/60">
                    SAMPLE
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-500 font-mono block mt-0.5">
                by {king.author}
              </span>
            </div>

            {/* Bottom: Stats */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500 block text-[10px]">BURNED</span>
                <span className="font-bold text-orange-400">
                  {formatCurrency(king.totalBurned)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">TIME AT #1</span>
                <span className="font-bold text-zinc-300">
                  {formatDurationHuman(king.reignSeconds)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">PEAK RATE</span>
                <span className="font-bold text-amber-400">
                  ${king.ratePerHour}/hr
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
