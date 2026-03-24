import { Player } from './components/Player';
import { Table } from './components/Table';
import { Controls } from './components/Controls';
import { useGameEngine } from './hooks/useGameEngine';

const positions = [
  'bottom-[-40px] sm:bottom-[-60px] left-1/2 -translate-x-1/2 z-20',   
  'top-1/2 -left-12 sm:-left-20 -translate-y-1/2 z-10',      
  'top-[-30px] sm:top-[-50px] left-[20%] sm:left-[25%] -translate-x-1/2 z-10', 
  'top-[-30px] sm:top-[-50px] right-[20%] sm:right-[25%] translate-x-1/2 z-10', 
  'top-1/2 -right-12 sm:-right-20 -translate-y-1/2 z-10'        
];

function App() {
  const { state, startGame, handleAction } = useGameEngine();

  if (state.phase === 'idle') {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] p-4">
        <div className="glass-panel p-10 max-w-md w-full text-center space-y-6 animate-fade-in shadow-2xl">
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-yellow-300 drop-shadow-sm pb-2">
            Texas Hold'em
          </h1>
          <p className="text-white/80 font-medium">Apple-like beautiful UI.</p>
          
          <button 
            onClick={startGame}
            className="glass-button w-full py-4 text-xl mt-8 bg-green-600/30 hover:bg-green-600/50 text-green-50 border-green-400/30 font-bold tracking-wide"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  const humanIndex = state.players.findIndex(p => p.isHuman);
  const human = state.players[humanIndex];
  const isTurn = state.activePlayerIndex === humanIndex && state.phase !== 'showdown' && state.phase !== 'game-over';
  const callAmount = human ? Math.max(0, state.currentBet - human.currentBet) : 0;
  const minRaise = state.currentBet > 0 ? state.currentBet * 2 : 20;

  // re-arrange players so human is always at bottom center, mapped to positions
  const getMappedPlayers = () => {
    if (humanIndex === -1) return state.players;
    const mapped = [];
    for (let i = 0; i < 5; i++) {
       mapped.push(state.players[(humanIndex + i) % 5]);
    }
    return mapped;
  };
  const mappedPlayers = getMappedPlayers();

  return (
    <div className="min-h-[100dvh] w-full p-4 sm:p-8 flex flex-col items-center justify-between overflow-x-hidden relative">
      
      {/* Logs at top */}
      <div data-testid="action-logs" className="absolute top-4 left-4 z-50 pointer-events-none opacity-70 text-xs sm:text-sm">
         {state.logs.slice(0, 3).map((log, idx) => (
            <div key={idx} className={idx === 0 ? "text-white font-bold" : "text-white/50"}>{log}</div>
         ))}
      </div>

      <div className="w-full flex-grow flex flex-col items-center justify-center">
        {/* Table wrapper with further reduced top margin */}
        <div className="w-full max-w-[800px] relative mt-0 sm:mt-6 mb-20 sm:mb-24 flex-shrink-0">
          <Table communityCards={state.communityCards} pot={state.pot} phase={state.phase} />
          
          {mappedPlayers.map((p, i) => {
            if (!p) return null;
            return (
              <Player 
                key={p.id} 
                player={p} 
                positionClass={positions[i]} 
                isCurrentTurn={state.activePlayerIndex !== -1 && state.players[state.activePlayerIndex]?.id === p.id} 
                revealCards={state.phase === 'showdown'}
              />
            )
          })}
          {/* Controls shifted significantly to the right */}
          <div className="absolute bottom-[-10px] sm:bottom-0 left-0 sm:left-8 md:left-12 z-50 transform origin-bottom-left scale-90 sm:scale-100 pb-8 sm:pb-0 pr-2 sm:pr-0">
            <Controls 
              isTurn={isTurn} 
              callAmount={callAmount} 
              minRaise={minRaise} 
              onFold={() => handleAction('fold')}
              onCheckCall={() => handleAction('call')}
              onRaise={(amt) => handleAction('raise', amt)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
