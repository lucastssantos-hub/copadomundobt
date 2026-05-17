import { useState, useEffect } from 'react';
import { Timer as TimerIcon } from 'lucide-react';

const WARMUP_DURATION = 6 * 60 * 1000;

export function WarmupTimer({ startedAt, onFinish }) {
  const [remaining, setRemaining] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!startedAt) return;
    const update = () => {
      const elapsed = Date.now() - startedAt;
      const rem = Math.max(0, WARMUP_DURATION - elapsed);
      setRemaining(rem);
      if (rem === 0 && !finished) {
        setFinished(true);
        onFinish?.();
      }
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [startedAt, finished, onFinish]);

  if (!startedAt) return null;

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const percent = ((WARMUP_DURATION - remaining) / WARMUP_DURATION) * 100;
  const isUrgent = remaining < 60000;

  if (finished || remaining === 0) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <TimerIcon size={20} className="text-green-600" />
        <div>
          <p className="text-green-700 font-bold text-sm">Aquecimento concluído!</p>
          <p className="text-green-600 text-xs">Pronto para iniciar o jogo</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-4 py-3 ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TimerIcon size={20} className={isUrgent ? 'text-red-600' : 'text-orange-600'} />
          <span className={`text-sm font-semibold ${isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
            Aquecimento
          </span>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      <div className="w-full bg-white/60 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${isUrgent ? 'bg-red-500' : 'bg-orange-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
