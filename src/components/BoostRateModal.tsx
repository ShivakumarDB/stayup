import React, { useState } from 'react';
import { X, Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { burnEngine } from '../services/burnEngine';

interface BoostRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  kingId: string;
  kingTitle: string;
  currentRate: number;
  currentBalance: number;
  onBoostSuccess: () => void;
}

export const BoostRateModal: React.FC<BoostRateModalProps> = ({
  isOpen,
  onClose,
  kingId,
  kingTitle,
  currentRate,
  currentBalance,
  onBoostSuccess,
}) => {
  const [newRate, setNewRate] = useState<number>(Math.round(currentRate * 1.3));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const minBoost = currentRate + 5;
  const burnOld = currentRate / 3600;
  const burnNew = newRate / 3600;
  const oldRunwaySec = burnOld > 0 ? currentBalance / burnOld : 0;
  const newRunwaySec = burnNew > 0 ? currentBalance / burnNew : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRate <= currentRate) {
      setError(`New rate must be higher than current rate ($${currentRate}/hr)`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await burnEngine.boostRate(kingId, newRate);
      if (!res.success) {
        throw new Error('Failed to boost rate');
      }

      onBoostSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to boost defense rate');
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
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Raise Rate Defense</h2>
            <p className="text-xs text-zinc-400">Increase your burn rate to prevent challengers from sniping #1</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center text-xs font-mono mb-1.5">
              <span className="text-zinc-300">NEW HOURLY BURN RATE</span>
              <span className="text-zinc-500">Current: ${currentRate}/hr</span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-sm">
                $
              </span>
              <input
                type="number"
                min={minBoost}
                step={5}
                required
                value={newRate}
                onChange={(e) => setNewRate(Math.max(minBoost, Number(e.target.value)))}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-lg focus:border-violet-500 focus:outline-none"
              />
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { label: '+20%', val: Math.round(currentRate * 1.2) },
                { label: '+50%', val: Math.round(currentRate * 1.5) },
                { label: '2x Moat', val: Math.round(currentRate * 2) },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setNewRate(p.val)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                    newRate === p.val
                      ? 'bg-violet-500 text-white font-bold'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {p.label} (${p.val})
                </button>
              ))}
            </div>
          </div>

          {/* Trade-off Warning */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5 font-mono">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Trade-off Notice:</p>
              <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                Raising your rate makes you harder to outbid, but your remaining {formatCurrency(currentBalance)} fuel will burn faster (reduced from {Math.floor(oldRunwaySec / 60)}m to {Math.floor(newRunwaySec / 60)}m runway).
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || newRate <= currentRate}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{loading ? 'Locking in Rate...' : `BOOST DEFENSE TO $${newRate}/HR`}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
