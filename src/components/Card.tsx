import React from 'react';
import type { PlayingCard } from '../types';

interface CardProps {
  card?: PlayingCard;
  faceUp?: boolean;
  className?: string;
}

const suitSymbols: Record<PlayingCard['suit'], string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<PlayingCard['suit'], string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

export const Card: React.FC<CardProps> = ({ card, faceUp = true, className = '' }) => {
  if (!faceUp || !card) {
    return (
      <div className={`w-14 h-20 sm:w-16 sm:h-24 rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 border border-white/30 shadow-md flex items-center justify-center ${className}`}>
        <div className="w-10 h-16 sm:w-12 sm:h-20 border border-white/20 rounded overflow-hidden grid grid-cols-3 grid-rows-5 gap-0.5 opacity-20">
           {Array.from({length: 15}).map((_, i) => <div key={i} className="bg-white/40" />)}
        </div>
      </div>
    );
  }

  const { suit, rank } = card;
  const color = suitColors[suit];
  
  return (
    <div className={`w-14 h-20 sm:w-16 sm:h-24 rounded-lg bg-white shadow-md flex flex-col justify-between p-1.5 ${color} ${className}`}>
      <div className="text-xs sm:text-sm font-bold leading-none">{rank}</div>
      <div className="text-xl sm:text-2xl self-center leading-none">{suitSymbols[suit]}</div>
      <div className="text-xs sm:text-sm font-bold leading-none self-end rotate-180">{rank}</div>
    </div>
  );
};
