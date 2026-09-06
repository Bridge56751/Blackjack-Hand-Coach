export type Action = 'H' | 'S' | 'D' | 'P' | 'R';

export function getSoftTotal(cards: string[]): { total: number, isSoft: boolean } {
  let sum = 0;
  let aces = 0;
  for (const c of cards) {
    if (c === 'A') {
      aces++;
      sum += 11;
    } else if (c === 'T') {
      sum += 10;
    } else {
      sum += parseInt(c);
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return { total: sum, isSoft: aces > 0 && sum <= 21 };
}

export function getBasicStrategy(playerCards: string[], dealerCard: string): Action {
  const dIndex = dealerCard === 'A' ? 9 : dealerCard === 'T' ? 8 : parseInt(dealerCard) - 2; 
  
  if (playerCards.length === 2 && playerCards[0] === playerCards[1]) {
    const pairValue = playerCards[0] === 'A' ? 11 : playerCards[0] === 'T' ? 10 : parseInt(playerCards[0]);
    const splitTable: Action[][] = [
      ['P','P','P','P','P','P','H','H','H','H'], // 2
      ['P','P','P','P','P','P','H','H','H','H'], // 3
      ['H','H','H','P','P','H','H','H','H','H'], // 4
      ['D','D','D','D','D','D','D','D','H','H'], // 5
      ['P','P','P','P','P','H','H','H','H','H'], // 6
      ['P','P','P','P','P','P','H','H','H','H'], // 7
      ['P','P','P','P','P','P','P','P','P','P'], // 8
      ['P','P','P','P','P','S','P','P','S','S'], // 9
      ['S','S','S','S','S','S','S','S','S','S'], // T
      ['P','P','P','P','P','P','P','P','P','P'], // A
    ];
    let row = pairValue === 11 ? 9 : pairValue - 2;
    let action = splitTable[row][dIndex];
    if (action === 'P') return 'P';
  }

  const { total, isSoft } = getSoftTotal(playerCards);
  
  if (isSoft && playerCards.length === 2) {
    const nonAce = playerCards[0] === 'A' ? playerCards[1] : playerCards[0];
    const otherVal = nonAce === 'T' ? 10 : parseInt(nonAce);
    const softTable: Action[][] = [
      ['H','H','H','D','D','H','H','H','H','H'], // A,2
      ['H','H','H','D','D','H','H','H','H','H'], // A,3
      ['H','H','D','D','D','H','H','H','H','H'], // A,4
      ['H','H','D','D','D','H','H','H','H','H'], // A,5
      ['H','D','D','D','D','H','H','H','H','H'], // A,6
      ['S','D','D','D','D','S','S','H','H','H'], // A,7
      ['S','S','S','S','S','S','S','S','S','S'], // A,8
      ['S','S','S','S','S','S','S','S','S','S'], // A,9
    ];
    if (otherVal >= 2 && otherVal <= 9) {
      return softTable[otherVal - 2][dIndex];
    }
  } else if (isSoft && playerCards.length > 2) {
    if (total <= 17) return 'H';
    if (total === 18) return (dIndex >= 7) ? 'H' : 'S';
    return 'S';
  }

  if (total <= 8) return 'H';
  if (total >= 17) return 'S';
  
  const hardTable: Action[][] = [
    ['H','D','D','D','D','H','H','H','H','H'], // 9
    ['D','D','D','D','D','D','D','D','H','H'], // 10
    ['D','D','D','D','D','D','D','D','D','D'], // 11
    ['H','H','S','S','S','H','H','H','H','H'], // 12
    ['S','S','S','S','S','H','H','H','H','H'], // 13
    ['S','S','S','S','S','H','H','H','H','H'], // 14
    ['S','S','S','S','S','H','H','H','R','H'], // 15
    ['S','S','S','S','S','H','H','R','R','R'], // 16
  ];
  
  let action = hardTable[total - 9][dIndex];
  
  if (playerCards.length > 2) {
    if (action === 'D') action = 'H';
    if (action === 'R') action = 'H';
  }
  
  return action;
}

export function getActionName(action: Action): string {
  switch (action) {
    case 'H': return 'Hit';
    case 'S': return 'Stand';
    case 'D': return 'Double';
    case 'P': return 'Split';
    case 'R': return 'Surrender';
  }
}
