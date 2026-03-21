export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface PlayingCard {
  suit: Suit;
  rank: Rank;
}

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in' | null;

export interface Player {
  id: string;
  name: string;
  chips: number;
  currentBet: number;
  isActive: boolean;
  isHuman: boolean;
  cards: PlayingCard[];
  action: PlayerAction;
  role: 'dealer' | 'sb' | 'bb' | null;
}
