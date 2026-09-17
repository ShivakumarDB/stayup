import React from 'react';
import { ActivityEvent } from '../types';
import { Crown, Flame, Droplets, Skull, Shield, Zap, Radio } from 'lucide-react';
import { timeAgo } from '../utils/formatters';

interface LiveActivityFeedProps {
  activity: ActivityEvent[];
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ activity }) => {
  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'crown':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'outbid':
        return <Zap className="w-4 h-4 text-rose-400" />;
      case 'refuel':
        return <Droplets className="w-4 h-4 text-emerald-400" />;
      case 'starved':
        return <Skull className="w-4 h-4 text-red-500" />;
      case 'rate_boost':
        return <Shield className="w-4 h-4 text-violet-400" />;
      default:
        return <Flame className="w-4 h-4 text-orange-400" />;
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-sm flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-zinc-800 text-rose-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Live Battle Ticker
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h2>
            <p className="text-xs text-zinc-400">
              Live stream of outbids, refuels, and starvation drops.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {activity.length === 0 ? (
          <p className="text-zinc-500 text-xs text-center py-8">No events logged yet.</p>
        ) : (
          activity.map((event) => (
            <div
              key={event.id}
              className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/70 flex items-start gap-3 hover:border-zinc-700/80 transition-colors"
            >
              <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 mt-0.5">
                {getEventIcon(event.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-zinc-200">{event.title}</span>
                    {event.isBotSimulation && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        SIMULATION BOT
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed break-words">
                  {event.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
