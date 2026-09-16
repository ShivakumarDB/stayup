/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ServerState, PinnedLink } from './types';
import { Header } from './components/Header';
import { KingThrone } from './components/KingThrone';
import { ChallengerQueue } from './components/ChallengerQueue';
import { LiveActivityFeed } from './components/LiveActivityFeed';
import { HallOfFame } from './components/HallOfFame';
import { BidModal } from './components/BidModal';
import { RefuelModal } from './components/RefuelModal';
import { BoostRateModal } from './components/BoostRateModal';
import { sounds } from './utils/audio';
import { Flame, Info, Zap, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { formatCurrency } from './utils/formatters';

export default function App() {
  const [state, setState] = useState<ServerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [isRefuelModalOpen, setIsRefuelModalOpen] = useState(false);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  const [refuelTarget, setRefuelTarget] = useState<{ id: string; title: string; rate: number; balance: number } | null>(null);
  const [isSimulatingRival, setIsSimulatingRival] = useState(false);
  const [dethroneNotification, setDethroneNotification] = useState<string | null>(null);

  const prevKingIdRef = useRef<string | null>(null);
  const lastPulseTimeRef = useRef<number>(0);

  // Fetch initial state and connect to SSE stream
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const fetchState = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data: ServerState = await res.json();
          setState(data);
          prevKingIdRef.current = data.currentKing?.id || null;
        }
      } catch (err) {
        console.error('Error fetching state:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchState();

    // Setup SSE connection
    try {
      eventSource = new EventSource('/api/stream');

      eventSource.addEventListener('state_update', (e) => {
        try {
          const newState: ServerState = JSON.parse(e.data);
          setState((prev) => {
            // Check if king changed
            if (prev?.currentKing?.id && newState.currentKing?.id && prev.currentKing.id !== newState.currentKing.id) {
              sounds.playDethroned();
              setDethroneNotification(`👑 DETHRONED! ${newState.currentKing.author} snatched #1 with $${newState.currentKing.ratePerHour}/hr!`);
              setTimeout(() => setDethroneNotification(null), 5000);
            } else if (!prev?.currentKing && newState.currentKing) {
              sounds.playCrowned();
            }
            return newState;
          });
        } catch (err) {
          console.error('Failed to parse SSE state_update:', err);
        }
      });

      eventSource.addEventListener('tick', (e) => {
        try {
          const tickData = JSON.parse(e.data);
          setState((prev) => {
            if (!prev || !prev.currentKing) return prev;
            return {
              ...prev,
              currentKing: {
                ...prev.currentKing,
                balance: tickData.balance,
                totalBurned: tickData.totalBurned,
                reignSeconds: tickData.reignSeconds,
              },
              stats: {
                ...prev.stats,
                totalBurnedAllTime: tickData.totalBurnedAllTime,
              },
            };
          });
        } catch (err) {
          console.error('Failed to parse tick event:', err);
        }
      });

      eventSource.onerror = () => {
        // EventSource will auto-retry
      };
    } catch (err) {
      console.error('SSE initialization error:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Tension pulse sound when king is low on fuel (< 60s)
  useEffect(() => {
    if (!state?.currentKing || state.currentKing.status !== 'active') return;

    const burnPerSecond = state.currentKing.ratePerHour / 3600;
    const secondsLeft = burnPerSecond > 0 ? state.currentKing.balance / burnPerSecond : 0;

    if (secondsLeft > 0 && secondsLeft <= 60 && !isMuted) {
      const now = Date.now();
      // Tick every second
      if (now - lastPulseTimeRef.current >= 950) {
        lastPulseTimeRef.current = now;
        sounds.playTensionPulse();
      }
    }
  }, [state?.currentKing?.balance, state?.currentKing?.ratePerHour, isMuted]);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  const handleLinkClick = async (id: string, url: string) => {
    try {
      fetch('/api/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      // ignore
    }
  };

  const handleSimulateRival = async () => {
    setIsSimulatingRival(true);
    try {
      const res = await fetch('/api/simulate-rival', { method: 'POST' });
      if (res.ok) {
        sounds.playDethroned();
      }
    } catch (err) {
      console.error('Failed to simulate rival:', err);
    } finally {
      setIsSimulatingRival(false);
    }
  };

  const handleOpenRefuelForKing = () => {
    if (!state?.currentKing) return;
    setRefuelTarget({
      id: state.currentKing.id,
      title: state.currentKing.title,
      rate: state.currentKing.ratePerHour,
      balance: state.currentKing.balance,
    });
    setIsRefuelModalOpen(true);
  };

  const handleOpenRefuelForQueue = (id: string) => {
    const item = state?.queue.find((q) => q.id === id);
    if (!item) return;
    setRefuelTarget({
      id: item.id,
      title: item.title,
      rate: item.ratePerHour,
      balance: item.balance,
    });
    setIsRefuelModalOpen(true);
  };

  const refreshState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch {
      // ignore
    }
  };

  if (loading || !state) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-sm">Connecting to stayup.lol live ticker...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Live Dethrone Alert Toast */}
      {dethroneNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-rose-600 text-white font-mono text-xs font-bold shadow-2xl shadow-rose-600/50 border border-rose-400 animate-in slide-in-from-top duration-300 flex items-center gap-2">
          <Zap className="w-4 h-4 fill-white animate-bounce" />
          <span>{dethroneNotification}</span>
        </div>
      )}

      {/* Header */}
      <Header
        stats={state.stats}
        minRate={state.minRate}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenBidModal={() => setIsBidModalOpen(true)}
        onSimulateRival={handleSimulateRival}
        isSimulating={isSimulatingRival}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8 space-y-8">
        {/* Core Spotlight: The #1 Pinned Link */}
        <section aria-label="Current #1 Monarch Spotlight">
          <KingThrone
            king={state.currentKing}
            onOpenRefuel={handleOpenRefuelForKing}
            onOpenBoostRate={() => setIsBoostModalOpen(true)}
            onOpenBidModal={() => setIsBidModalOpen(true)}
            onLinkClick={handleLinkClick}
          />
        </section>

        {/* Tension Mechanic Explainer Strip */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-zinc-200 block sm:inline font-mono">The Live Burn Dynamic:</strong>{' '}
              <span className="text-zinc-400">
                Unlike static one-time bids, you pay a continuous $/hour rate. Fuel depletes every second. When your tank hits $0 or someone outbids your rate, you drop instantly.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-mono text-zinc-400">
            <span>Minimum to outbid #1:</span>
            <span className="font-bold text-amber-400 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
              ${state.minRate}/hr
            </span>
          </div>
        </div>

        {/* Lower Grid: Challenger Queue (Ranks #2-#5) + Live Battle Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Challenger Queue & Hall of Fame (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <ChallengerQueue
              queue={state.queue}
              minRateToOutbidKing={state.minRate}
              onOpenBidModal={() => setIsBidModalOpen(true)}
              onRefuelQueued={handleOpenRefuelForQueue}
            />

            <HallOfFame fallenKings={state.fallenKings} />
          </div>

          {/* Right Column: Live Activity Feed (5 cols) */}
          <div className="lg:col-span-5">
            <LiveActivityFeed activity={state.activity} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-8 px-4 text-center text-xs font-mono text-zinc-500 space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-zinc-300 font-bold">stayup.lol</span>
          <span>—</span>
          <span>The live burn rate tension arena</span>
        </div>
        <p className="text-zinc-600 max-w-md mx-auto text-[11px]">
          Every second counts. Keep refreshing to see who stays up and who drops down.
        </p>
      </footer>

      {/* Modals */}
      <BidModal
        isOpen={isBidModalOpen}
        onClose={() => setIsBidModalOpen(false)}
        minRate={state.minRate}
        currentKingRate={state.currentKing?.ratePerHour}
        onBidSuccess={refreshState}
      />

      {refuelTarget && (
        <RefuelModal
          isOpen={isRefuelModalOpen}
          onClose={() => {
            setIsRefuelModalOpen(false);
            setRefuelTarget(null);
          }}
          targetId={refuelTarget.id}
          targetTitle={refuelTarget.title}
          ratePerHour={refuelTarget.rate}
          currentBalance={refuelTarget.balance}
          onRefuelSuccess={() => {
            sounds.playRefuel();
            refreshState();
          }}
        />
      )}

      {state.currentKing && (
        <BoostRateModal
          isOpen={isBoostModalOpen}
          onClose={() => setIsBoostModalOpen(false)}
          kingId={state.currentKing.id}
          kingTitle={state.currentKing.title}
          currentRate={state.currentKing.ratePerHour}
          currentBalance={state.currentKing.balance}
          onBoostSuccess={() => {
            sounds.playRefuel();
            refreshState();
          }}
        />
      )}
    </div>
  );
}
