/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ServerState, GlobalStats } from './types';
import { Header } from './components/Header';
import { KingThrone } from './components/KingThrone';
import { ChallengerQueue } from './components/ChallengerQueue';
import { LiveActivityFeed } from './components/LiveActivityFeed';
import { HallOfFame } from './components/HallOfFame';
import { BidModal } from './components/BidModal';
import { RefuelModal } from './components/RefuelModal';
import { BoostRateModal } from './components/BoostRateModal';
import { sounds } from './utils/audio';
import { Flame, Zap } from 'lucide-react';
import { burnEngine } from './services/burnEngine';

const defaultStats: GlobalStats = {
  totalBurnedAllTime: 0,
  totalReigns: 0,
  highestRateEver: 0,
  longestReignSeconds: 0,
  currentSpectators: 1,
};

export default function App() {
  const [state, setState] = useState<ServerState>(() => burnEngine.getState());
  const [isMuted, setIsMuted] = useState(false);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [isRefuelModalOpen, setIsRefuelModalOpen] = useState(false);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  const [refuelTarget, setRefuelTarget] = useState<{ id: string; title: string; rate: number; balance: number } | null>(null);
  const [isSimulatingRival, setIsSimulatingRival] = useState(false);
  const [dethroneNotification, setDethroneNotification] = useState<string | null>(null);

  const prevKingIdRef = useRef<string | null>(burnEngine.getState().currentKing?.id || null);
  const lastPulseTimeRef = useRef<number>(0);

  // Subscribe to live burn engine (handles server SSE when available, and local client tick on static deploys/Vercel)
  useEffect(() => {
    const unsubscribe = burnEngine.subscribe((nextState) => {
      setState(nextState);

      // Check for king transition / dethrone event
      if (
        prevKingIdRef.current &&
        nextState.currentKing?.id &&
        prevKingIdRef.current !== nextState.currentKing.id
      ) {
        sounds.playDethroned();
        setDethroneNotification(
          `👑 DETHRONED! ${nextState.currentKing.author} snatched #1 with $${nextState.currentKing.ratePerHour}/hr!`
        );
        setTimeout(() => setDethroneNotification(null), 5000);
      }
      prevKingIdRef.current = nextState.currentKing?.id || null;
    });

    // Explicit runtime query to /api/health to detect Razorpay keys
    burnEngine.checkPaymentHealth().then((health) => {
      setState((prev) => ({
        ...prev,
        stats: prev?.stats || defaultStats,
        razorpayEnabled: health.razorpayEnabled,
        razorpayTestMode: health.razorpayTestMode,
        razorpayKeyId: health.razorpayKeyId,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Tension pulse sound when king is low on fuel (< 60s)
  useEffect(() => {
    if (!state.currentKing || state.currentKing.status !== 'active') return;

    const burnPerSecond = state.currentKing.ratePerHour / 3600;
    const secondsLeft = burnPerSecond > 0 ? state.currentKing.balance / burnPerSecond : 0;

    if (secondsLeft > 0 && secondsLeft <= 60 && !isMuted) {
      const now = Date.now();
      // Tick once per second
      if (now - lastPulseTimeRef.current >= 950) {
        lastPulseTimeRef.current = now;
        sounds.playTensionPulse();
      }
    }
  }, [state.currentKing?.balance, state.currentKing?.ratePerHour, isMuted]);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  const handleLinkClick = (id: string) => {
    burnEngine.trackClick(id);
  };

  const handleSimulateRival = async () => {
    setIsSimulatingRival(true);
    try {
      await burnEngine.simulateRival();
      sounds.playDethroned();
    } catch (err) {
      console.error('Failed to simulate rival:', err);
    } finally {
      setIsSimulatingRival(false);
    }
  };

  const handleOpenRefuelForKing = () => {
    if (!state.currentKing) return;
    setRefuelTarget({
      id: state.currentKing.id,
      title: state.currentKing.title,
      rate: state.currentKing.ratePerHour,
      balance: state.currentKing.balance,
    });
    setIsRefuelModalOpen(true);
  };

  const handleOpenRefuelForQueue = (id: string) => {
    const item = state.queue.find((q) => q.id === id);
    if (!item) return;
    setRefuelTarget({
      id: item.id,
      title: item.title,
      rate: item.ratePerHour,
      balance: item.balance,
    });
    setIsRefuelModalOpen(true);
  };

  const refreshState = () => {
    setState(burnEngine.getState());
  };

  const handleResetState = async () => {
    await burnEngine.resetToCleanSlate();
    refreshState();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Sandbox Demo Notice Banner */}
      {!state.razorpayEnabled && !state.stripeEnabled && (
        <div className="bg-gradient-to-r from-amber-500/15 via-zinc-900 to-amber-500/15 border-b border-amber-500/25 px-4 py-1.5 text-[11px] font-mono text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[9px] font-extrabold uppercase tracking-wide text-amber-300 border border-amber-500/30">
              Interactive Sandbox
            </span>
            <span className="text-zinc-300">
              All burn rates & spectator counters are live and transparent. (Set <code className="text-amber-400">RAZORPAY_KEY_ID</code> & <code className="text-amber-400">RAZORPAY_KEY_SECRET</code> to enable live payment checkout).
            </span>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Reset all demo seed data and start with an empty throne?')) {
                handleResetState();
              }
            }}
            className="text-zinc-400 hover:text-amber-300 underline transition-colors shrink-0 text-[10px]"
          >
            Clear Demo Seed Data
          </button>
        </div>
      )}

      {/* Live Dethrone Alert Toast */}
      {dethroneNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-rose-600 text-white font-mono text-xs font-bold shadow-2xl shadow-rose-600/50 border border-rose-400 animate-in slide-in-from-top duration-300 flex items-center gap-2">
          <Zap className="w-4 h-4 fill-white animate-bounce" />
          <span>{dethroneNotification}</span>
        </div>
      )}

      {/* Header */}
      <Header
        stats={state.stats || defaultStats}
        minRate={state.minRate || 20}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenBidModal={() => setIsBidModalOpen(true)}
        onSimulateRival={handleSimulateRival}
        onResetState={handleResetState}
        isSimulating={isSimulatingRival}
        razorpayEnabled={state.razorpayEnabled}
        razorpayTestMode={state.razorpayTestMode}
        stripeEnabled={state.stripeEnabled}
        stripeTestMode={state.stripeTestMode}
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
              ${state.minRate || 20}/hr
            </span>
          </div>
        </div>

        {/* Lower Grid: Challenger Queue (Ranks #2-#5) + Live Battle Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Challenger Queue & Hall of Fame (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <ChallengerQueue
              queue={state.queue || []}
              minRateToOutbidKing={state.minRate || 20}
              onOpenBidModal={() => setIsBidModalOpen(true)}
              onRefuelQueued={handleOpenRefuelForQueue}
            />

            <HallOfFame fallenKings={state.fallenKings || []} />
          </div>

          {/* Right Column: Live Activity Feed (5 cols) */}
          <div className="lg:col-span-5">
            <LiveActivityFeed activity={state.activity || []} />
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
        razorpayEnabled={state.razorpayEnabled}
        razorpayTestMode={state.razorpayTestMode}
        razorpayKeyId={state.razorpayKeyId}
        stripeEnabled={state.stripeEnabled}
        stripeTestMode={state.stripeTestMode}
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
          razorpayEnabled={state.razorpayEnabled}
          razorpayTestMode={state.razorpayTestMode}
          razorpayKeyId={state.razorpayKeyId}
          stripeEnabled={state.stripeEnabled}
          stripeTestMode={state.stripeTestMode}
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
