import React from 'react';

interface ControlsProps {
  onFold: () => void;
  onCheckCall: () => void;
  onRaise: (amount: number) => void;
  callAmount: number;
  minRaise: number;
  isTurn: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  onFold, onCheckCall, onRaise, callAmount, minRaise, isTurn
}) => {
  return (
    <div className={`glass-panel p-1.5 sm:p-2 flex gap-1.5 sm:gap-2 shadow-2xl animate-[fade-in-up_0.6s_forwards] border-white/30 bg-black/40 transition-opacity ${!isTurn ? 'opacity-50 pointer-events-none' : ''}`}>
      <button onClick={onFold} className="glass-button px-3 sm:px-4 h-8 sm:h-10 border-0 bg-red-500/20 text-red-100 hover:bg-red-500/40 text-xs sm:text-sm font-semibold rounded-xl">
        Fold
      </button>
      
      <button onClick={onCheckCall} className="glass-button px-4 sm:px-6 h-8 sm:h-10 border-0 bg-blue-500/20 text-blue-100 hover:bg-blue-500/40 text-xs sm:text-sm font-semibold rounded-xl">
        {callAmount > 0 ? `Call $${callAmount}` : 'Check'}
      </button>

      <div className="flex bg-white/10 rounded-xl border border-white/20 p-0.5 gap-0.5">
        <button onClick={() => onRaise(minRaise)} className="glass-button px-2 sm:px-3 h-7 sm:h-9 border-0 bg-transparent hover:bg-white/20 text-[10px] sm:text-xs">
          Raise ${minRaise}
        </button>
        <button onClick={() => onRaise(minRaise * 2)} className="glass-button px-2 sm:px-3 h-7 sm:h-9 border-0 bg-transparent hover:bg-white/20 text-[10px] sm:text-xs">
          x2
        </button>
        <button onClick={() => onRaise(9999)} className="glass-button px-2 sm:px-3 h-7 sm:h-9 border-0 bg-transparent hover:bg-white/20 text-[10px] sm:text-xs text-yellow-400 font-bold">
          ALL IN
        </button>
      </div>
    </div>
  );
};
