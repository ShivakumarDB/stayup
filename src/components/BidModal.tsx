import React, { useState } from 'react';
import { X, Crown, Zap, Flame, Droplets, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ACCENT_THEMES, formatCurrency, formatDurationHuman } from '../utils/formatters';

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  minRate: number;
  currentKingRate?: number;
  onBidSuccess: () => void;
}

export const BidModal: React.FC<BidModalProps> = ({
  isOpen,
  onClose,
  minRate,
  currentKingRate,
  onBidSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [author, setAuthor] = useState('');
  const [ratePerHour, setRatePerHour] = useState<number>(minRate);
  const [depositAmount, setDepositAmount] = useState<number>(35);
  const [accentColor, setAccentColor] = useState<string>('amber');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sync minRate if user rate is below it
  const effectiveRate = Math.max(ratePerHour, minRate);
  const burnPerSecond = effectiveRate / 3600;
  const estimatedSeconds = burnPerSecond > 0 ? depositAmount / burnPerSecond : 0;

  const willImmediatelyDethrone = !currentKingRate || effectiveRate >= minRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !url.trim() || !author.trim()) {
      setError('Please fill in title, URL, and your author name/handle.');
      return;
    }

    if (effectiveRate < 10) {
      setError('Burn rate must be at least $10/hour.');
      return;
    }

    if (depositAmount < 5) {
      setError('Fuel deposit must be at least $5.00.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          url,
          tagline,
          author: author.startsWith('@') ? author : `@${author}`,
          ratePerHour: effectiveRate,
          depositAmount,
          accentColor,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place bid');
      }

      if (willImmediatelyDethrone) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      onBidSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 font-bold shrink-0">
            <Crown className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {willImmediatelyDethrone ? 'Outbid & Claim #1' : 'Enter Challenger Queue'}
            </h2>
            <p className="text-xs text-zinc-400">
              Set your burn rate. Higher rate = instant crown. Deposit fuel to keep it pinned.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link Title */}
          <div>
            <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
              LINK / SITE TITLE *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MySaaS — The Best Tool for Creators"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:outline-none text-sm text-white placeholder-zinc-500 transition-colors"
            />
          </div>

          {/* URL & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                TARGET URL *
              </label>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mysite.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:outline-none text-sm text-white placeholder-zinc-500 font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
                YOUR HANDLE / NAME *
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="@username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:outline-none text-sm text-white placeholder-zinc-500 font-mono transition-colors"
              />
            </div>
          </div>

          {/* Tagline / Pitch */}
          <div>
            <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
              SHORT TAGLINE / ELEVATOR PITCH
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="One punchy sentence that explains what visitors get"
              maxLength={120}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:outline-none text-sm text-white placeholder-zinc-500 transition-colors"
            />
          </div>

          {/* Hourly Rate ($/hr) Selector */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                HOURLY BURN RATE ($/HR)
              </label>
              <span className="text-[11px] font-mono text-zinc-400">
                Min to crown #1: <strong className="text-white">${minRate}/hr</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">
                  $
                </span>
                <input
                  type="number"
                  min={10}
                  step={5}
                  value={ratePerHour}
                  onChange={(e) => setRatePerHour(Math.max(10, Number(e.target.value)))}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono font-bold text-lg focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Quick rate presets */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRatePerHour(minRate)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    ratePerHour === minRate
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Min (${minRate})
                </button>
                <button
                  type="button"
                  onClick={() => setRatePerHour(Math.round(minRate * 1.25))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    ratePerHour === Math.round(minRate * 1.25)
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  +25%
                </button>
                <button
                  type="button"
                  onClick={() => setRatePerHour(Math.round(minRate * 1.75))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    ratePerHour === Math.round(minRate * 1.75)
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Moat
                </button>
              </div>
            </div>
          </div>

          {/* Initial Fuel Deposit ($ USD) */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5" />
                INITIAL FUEL TANK DEPOSIT ($)
              </label>
              <span className="text-[11px] font-mono text-zinc-400">
                You can top up anytime
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">
                  $
                </span>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Math.max(5, Number(e.target.value)))}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono font-bold text-lg focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Quick deposit chips */}
              <div className="flex items-center gap-1.5">
                {[15, 35, 75, 150].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                      depositAmount === amt
                        ? 'bg-emerald-500 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Survival Time Projection */}
            <div className="mt-3 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Estimated Reign:</span>
              </div>
              <div className="text-right">
                <strong className="text-amber-400 font-bold">
                  {formatDurationHuman(estimatedSeconds)}
                </strong>
                <span className="text-zinc-500 text-[10px] block">
                  (~${burnPerSecond.toFixed(4)}/sec burn)
                </span>
              </div>
            </div>
          </div>

          {/* Accent Color Picker */}
          <div>
            <label className="block text-xs font-mono font-medium text-zinc-400 mb-1.5">
              CARD ACCENT GLOW
            </label>
            <div className="flex items-center gap-2">
              {Object.keys(ACCENT_THEMES).map((colorKey) => {
                const isSelected = accentColor === colorKey;
                return (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() => setAccentColor(colorKey)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      colorKey === 'amber'
                        ? 'bg-amber-500'
                        : colorKey === 'emerald'
                        ? 'bg-emerald-500'
                        : colorKey === 'violet'
                        ? 'bg-violet-500'
                        : colorKey === 'cyan'
                        ? 'bg-cyan-500'
                        : 'bg-rose-500'
                    } ${isSelected ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Instant Simulation Mode Note */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Instant Sandbox Deposit: Simulated fuel burns in real-time. No actual credit card required for testing.</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-extrabold text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Deploying Bid...</span>
            ) : willImmediatelyDethrone ? (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>DETHRONE & PIN AT #1 NOW ({formatCurrency(depositAmount)})</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                <span>ENTER CHALLENGER QUEUE ({formatCurrency(depositAmount)})</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
