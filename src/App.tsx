import { useState } from 'react';
import { Player } from './components/Player';
import { Table } from './components/Table';
import { Controls } from './components/Controls';
import type { Player as PlayerType, PlayingCard } from './types';

const mockCards: PlayingCard[] = [
  { suit: 'spades', rank: 'A' },
  { suit: 'hearts', rank: 'K' },
  { suit: 'diamonds', rank: 'Q' },
  { suit: 'clubs', rank: 'J' },
  { suit: 'spades', rank: '10' },
];

const mockPlayers: PlayerType[] = [
  {
    id: 'p1',
    name: 'You (Player)',
    chips: 950,
    currentBet: 50,
    isActive: true,
    isHuman: true,
    cards: [mockCards[0], mockCards[1]],
    action: 'call',
    role: null,
  },
  {
    id: 'cpu1',
    name: 'CPU 1',
    chips: 1000,
    currentBet: 0,
    isActive: true,
    isHuman: false,
    cards: [mockCards[2], mockCards[3]], 
    action: 'check',
    role: 'dealer',
  },
  {
    id: 'cpu2',
    name: 'CPU 2',
    chips: 800,
    currentBet: 200,
    isActive: true,
    isHuman: false,
    cards: [mockCards[2], mockCards[3]],
    action: 'raise',
    role: 'sb',
  },
  {
    id: 'cpu3',
    name: 'CPU 3',
    chips: 0,
    currentBet: 0,
    isActive: false,
    isHuman: false,
    cards: [],
    action: 'fold',
    role: 'bb',
  },
  {
    id: 'cpu4',
    name: 'CPU 4',
    chips: 1500,
    currentBet: 50,
    isActive: true,
    isHuman: false,
    cards: [mockCards[4], mockCards[2]],
    action: 'call',
    role: null,
  }
];

const positions = [
  'bottom-[-40px] sm:bottom-[-60px] left-1/2 -translate-x-1/2 z-20',   
  'top-1/2 -left-12 sm:-left-20 -translate-y-1/2 z-10',      
  'top-[-30px] sm:top-[-50px] left-[20%] sm:left-[25%] -translate-x-1/2 z-10', 
  'top-[-30px] sm:top-[-50px] right-[20%] sm:right-[25%] translate-x-1/2 z-10', 
  'top-1/2 -right-12 sm:-right-20 -translate-y-1/2 z-10'        
];

function App() {
  const [started, setStarted] = useState(false);
  const pot = 350;
  const phase = 'Flop';
  const communityCards = [mockCards[4], mockCards[3], mockCards[2]]; 

  if (!started) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] p-4">
        <div className="glass-panel p-10 max-w-md w-full text-center space-y-6 animate-fade-in shadow-2xl">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-yellow-300 drop-shadow-sm pb-2">
            Texas Hold'em
          </h1>
          <p className="text-white/80 font-medium">Apple-like beautiful UI mock.</p>
          
          <button 
            onClick={() => setStarted(true)}
            className="glass-button w-full py-4 text-xl mt-8 bg-green-600/30 hover:bg-green-600/50 text-green-50 border-green-400/30 font-bold tracking-wide"
          >
            Start Game Mock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full p-4 sm:p-8 flex flex-col items-center justify-between overflow-x-hidden relative">
      <div className="w-full flex-grow flex flex-col items-center justify-center">
        {/* Table wrapper with further reduced top margin */}
        <div className="w-full max-w-[800px] relative mt-0 sm:mt-6 mb-20 sm:mb-24 flex-shrink-0">
          <Table communityCards={communityCards} pot={pot} phase={phase} />
          
          {mockPlayers.map((p, i) => (
            <Player 
              key={p.id} 
              player={p} 
              positionClass={positions[i]} 
              isCurrentTurn={p.id === 'p1'} 
            />
          ))}

          {/* Controls shifted significantly to the right */}
          <div className="absolute bottom-[-10px] sm:bottom-0 left-0 sm:left-8 md:left-12 z-50 transform origin-bottom-left scale-90 sm:scale-100 pb-8 sm:pb-0 pr-2 sm:pr-0">
            <Controls 
              isTurn={true} 
              callAmount={150} 
              minRaise={300} 
              onFold={() => console.log('Fold')}
              onCheckCall={() => console.log('Call/Check')}
              onRaise={(amt) => console.log('Raise', amt)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
