import React from 'react';
import type { PlayingCard } from '../types';
import { Card } from './Card';

interface TableProps {
  communityCards: PlayingCard[];
  pot: number;
  phase: string;
}

export const Table: React.FC<TableProps> = ({ communityCards, pot, phase }) => {
  return (
    <div data-testid="poker-table" className="relative w-full max-w-4xl mx-auto h-[400px] sm:h-[500px] border-[12px] border-green-900/50 rounded-[100px] sm:rounded-[150px] shadow-2xl bg-gradient-to-br from-green-700 to-green-800 flex flex-col items-center justify-center backdrop-blur-sm -z-10 mt-12 sm:mt-16">
      <div className="absolute inset-0 border-[4px] border-green-600/30 rounded-[88px] sm:rounded-[138px] pointer-events-none" />
      
      {/* Table Logo / Feel */}
      <h2 className="text-white/10 font-black text-5xl sm:text-7xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none tracking-widest text-center opacity-50">
        TEXAS<br/>HOLD'EM
      </h2>

      {/* Pot Area */}
      <div data-testid="pot-display" className="z-10 glass-panel px-8 py-3 mb-8 animate-[fade-in_0.5s_ease-out]">
        <div className="text-xs text-white/70 font-bold uppercase tracking-[0.2em] text-center mb-1">Current Pot</div>
        <div className="text-3xl font-black text-yellow-400 text-center tracking-tight drop-shadow-md">
          ${pot.toLocaleString()}
        </div>
      </div>

      {/* Community Cards */}
      <div data-testid="community-cards" className="z-10 flex gap-2 sm:gap-4 h-24 sm:h-32 perspective-1000">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-14 sm:w-16 h-20 sm:h-24 rounded-lg bg-black/30 border-2 border-dashed border-white/20 shadow-inner flex items-center justify-center">
             {communityCards[i] ? (
               <div className="animate-flip-in" style={{ animationDelay: `${i * 0.15}s` }}>
                 <Card card={communityCards[i]} faceUp={true} />
               </div>
             ) : (
                <div className="w-full h-full" />
             )}
          </div>
        ))}
      </div>
      
      {/* Phase Indicator */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/50 text-sm font-bold tracking-[0.3em] uppercase mix-blend-overlay">
        {phase}
      </div>
    </div>
  );
};
