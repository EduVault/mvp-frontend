import { Deck } from '../types';
export function combineBacklog(decksRaw: Deck[], backlog: Deck[]) {
  console.log('combining backlog', decksRaw, backlog);
  // make 'decks' an array of decks that aren't in either rawDecks or backlog
  const rawDeckNotInBacklog = decksRaw.filter(rawDeck => {
    const exists = backlog.filter(backlogDeck => backlogDeck._id === rawDeck._id).length > 0;
    if (!exists) return rawDeck;
  });
  const backlogNotInDecks = backlog.filter(backlogDeck => {
    const exists = decksRaw.filter(rawDeck => rawDeck._id === backlogDeck._id);
    if (!exists) return backlogDeck;
  });
  const decks = rawDeckNotInBacklog.concat(backlogNotInDecks);

  // now compare the ones in both for newer updatedAt
  decksRaw.forEach(rawDeck => {
    backlog.forEach(backlogDeck => {
      if (rawDeck._id === backlogDeck._id) {
        if (rawDeck.updatedAt >= backlogDeck.updatedAt) decks.push(rawDeck);
        else decks.push(backlogDeck);
      }
    });
  });
  console.log('comined', decks);
  return decks;
}
