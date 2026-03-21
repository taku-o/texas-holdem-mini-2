import type { PlayingCard, Rank } from '../types';

export const HandRank = {
  HighCard: 1,
  OnePair: 2,
  TwoPair: 3,
  ThreeOfAKind: 4,
  Straight: 5,
  Flush: 6,
  FullHouse: 7,
  FourOfAKind: 8,
  StraightFlush: 9,
  RoyalFlush: 10
} as const;

export type HandRank = typeof HandRank[keyof typeof HandRank];

export interface HandResult {
  rank: HandRank;
  rankName: string;
  score: number;
  bestCards: PlayingCard[];
}

const rankValues: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export const evaluateHand = (holeCards: PlayingCard[], communityCards: PlayingCard[]): HandResult => {
  const cards = [...holeCards, ...communityCards];
  if (cards.length === 0) return { rank: HandRank.HighCard, rankName: 'None', score: 0, bestCards: [] };
  
  // Sort cards by value descending
  cards.sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);

  // Group by suit and by rank
  const suits: Record<string, PlayingCard[]> = {};
  const ranks: Record<number, PlayingCard[]> = {};
  
  cards.forEach(c => {
    if (!suits[c.suit]) suits[c.suit] = [];
    suits[c.suit].push(c);
    
    const v = rankValues[c.rank];
    if (!ranks[v]) ranks[v] = [];
    ranks[v].push(c);
  });

  // Calculate generic 10-digit score to easily resolve tiebreakers
  const calculateScore = (categoryRank: HandRank, topCards: PlayingCard[]): number => {
    let score = categoryRank * 10000000000;
    let multiplier = 100000000;
    for (let i = 0; i < 5; i++) {
       const v = topCards[i] ? rankValues[topCards[i].rank] : 0;
       score += v * multiplier;
       multiplier /= 100;
    }
    return score;
  };

  // Check Flushes
  let flushCards: PlayingCard[] | null = null;
  for (const s in suits) {
    if (suits[s].length >= 5) {
      flushCards = suits[s]; // Automatically sorted descending because `cards` was sorted
      break;
    }
  }

  // Find Straight
  const findStraight = (cardSet: PlayingCard[]): PlayingCard[] | null => {
    const uniqueVals = [...new Set(cardSet.map(c => rankValues[c.rank]))];
    if (uniqueVals.includes(14)) uniqueVals.push(1); // Ace can act as 1
    
    for (let i = 0; i <= uniqueVals.length - 5; i++) {
       const v = uniqueVals[i];
       if (uniqueVals[i+1] === v - 1 &&
           uniqueVals[i+2] === v - 2 &&
           uniqueVals[i+3] === v - 3 &&
           uniqueVals[i+4] === v - 4) {
          const straightSeq = [v, v-1, v-2, v-3, v-4];
          return straightSeq.map(seqV => {
            const trueV = seqV === 1 ? 14 : seqV;
            return cardSet.find(c => rankValues[c.rank] === trueV)!;
          });
       }
    }
    return null;
  };

  // Straight Flush and Royal Flush
  if (flushCards) {
    const straightFlushCards = findStraight(flushCards);
    if (straightFlushCards) {
       if (rankValues[straightFlushCards[0].rank] === 14) {
          return { rank: HandRank.RoyalFlush, rankName: 'Royal Flush', score: calculateScore(HandRank.RoyalFlush, straightFlushCards), bestCards: straightFlushCards };
       }
       return { rank: HandRank.StraightFlush, rankName: 'Straight Flush', score: calculateScore(HandRank.StraightFlush, straightFlushCards), bestCards: straightFlushCards };
    }
  }

  // Group by sizes
  const pairs: PlayingCard[][] = [];
  const threes: PlayingCard[][] = [];
  const fours: PlayingCard[][] = [];

  for (const v in ranks) {
     const set = ranks[v];
     if (set.length === 4) fours.push(set);
     else if (set.length === 3) threes.push(set);
     else if (set.length === 2) pairs.push(set);
  }

  // Sort groups by rank descending (so higher pairs come first)
  pairs.sort((a, b) => rankValues[b[0].rank] - rankValues[a[0].rank]);
  threes.sort((a, b) => rankValues[b[0].rank] - rankValues[a[0].rank]);
  fours.sort((a, b) => rankValues[b[0].rank] - rankValues[a[0].rank]);

  const getKickers = (excludeCards: PlayingCard[], count: number) => {
    return cards.filter(c => !excludeCards.includes(c)).slice(0, count);
  };

  // 4 of a Kind
  if (fours.length > 0) {
    const best = fours[0];
    const finalCards = [...best, ...getKickers(best, 1)];
    return { rank: HandRank.FourOfAKind, rankName: 'Four of a Kind', score: calculateScore(HandRank.FourOfAKind, finalCards), bestCards: finalCards };
  }

  // Full House
  if (threes.length > 0 && (pairs.length > 0 || threes.length > 1)) {
    const bestThree = threes[0];
    const bestPair = threes.length > 1 ? threes[1].slice(0,2) : pairs[0];
    const finalCards = [...bestThree, ...bestPair];
    return { rank: HandRank.FullHouse, rankName: 'Full House', score: calculateScore(HandRank.FullHouse, finalCards), bestCards: finalCards };
  }

  // Flush
  if (flushCards) {
    const finalCards = flushCards.slice(0, 5);
    return { rank: HandRank.Flush, rankName: 'Flush', score: calculateScore(HandRank.Flush, finalCards), bestCards: finalCards };
  }

  // Straight
  const straightCards = findStraight(cards);
  if (straightCards) {
    return { rank: HandRank.Straight, rankName: 'Straight', score: calculateScore(HandRank.Straight, straightCards), bestCards: straightCards };
  }

  // Three of a Kind
  if (threes.length > 0) {
    const best = threes[0];
    const finalCards = [...best, ...getKickers(best, 2)];
    return { rank: HandRank.ThreeOfAKind, rankName: 'Three of a Kind', score: calculateScore(HandRank.ThreeOfAKind, finalCards), bestCards: finalCards };
  }

  // Two Pair
  if (pairs.length >= 2) {
    const bestPairs = [...pairs[0], ...pairs[1]];
    const finalCards = [...bestPairs, ...getKickers(bestPairs, 1)];
    return { rank: HandRank.TwoPair, rankName: 'Two Pair', score: calculateScore(HandRank.TwoPair, finalCards), bestCards: finalCards };
  }

  // One Pair
  if (pairs.length === 1) {
    const best = pairs[0];
    const finalCards = [...best, ...getKickers(best, 3)];
    return { rank: HandRank.OnePair, rankName: 'One Pair', score: calculateScore(HandRank.OnePair, finalCards), bestCards: finalCards };
  }

  // High Card
  const finalCards = cards.slice(0, 5);
  return { rank: HandRank.HighCard, rankName: 'High Card', score: calculateScore(HandRank.HighCard, finalCards), bestCards: finalCards };
};
