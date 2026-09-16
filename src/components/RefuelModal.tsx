import React, { useState } from 'react';
import { X, Droplets, Clock, Zap } from 'lucide-react';
import { formatCurrency, formatDurationHuman } from '../utils/formatters';

interface RefuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetTitle: string;
  ratePerHour: number;
  currentBalance: number;
  onRefuelSuccess: () => void;
}

export const RefuelModal: React.FC<RefuelModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetTitle,
  ratePerHour,
  currentBalance,
  onRefuelSuccess,
}) => {
  const [amount, setAmount] = useState<number>(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const burnPerSecond = ratePerHour / 3600;
  const addedSeconds = burnPerSecond > 0 ? amount / burnPerSecond : 0;
  const newTotalBalance = currentBalance + amount;
  const totalSeconds = burnPerSecond > 0 ? newTotalBalance / burnPerSecond : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to refuel');
      }

      onRefuelSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to refuel tank');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Panic Refuel</h2>
            <p className="text-xs text-zinc-400">Inject emergency fuel to keep your link pinned at #1</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 mb-4 text-xs font-mono">
          <span className="text-zinc-500 block text-[10px]">TARGET LINK</span>
          <span className="text-white font-semibold line-clamp-1">{targetTitle}</span>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800 text-[11px]">
            <span className="text-zinc-400">Current Fuel: {formatCurrency(currentBalance)}</span>
            <span className="text-amber-400 font-bold">${ratePerHour}/hr</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5">
              AMOUNT TO ADD ($ USD)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">
                $
              </span>
              <input
                type="number"
                min={1}
                step={5}
                required
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-lg focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[10, 25, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    amount === preset
                      ? 'bg-emerald-500 text-zinc-950 font-bold'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  +${preset}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Added Airtime:
              </span>
              <span className="font-bold text-emerald-400">+{formatDurationHuman(addedSeconds)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/60">
              <span>New Total Runway:</span>
              <span className="text-zinc-300">{formatDurationHuman(totalSeconds)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{loading ? 'Injecting Fuel...' : `PUMP FUEL NOW (${formatCurrency(amount)})`}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
