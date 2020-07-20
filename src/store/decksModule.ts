import { DecksState, Deck, DeleteCardPayload, EditCardPayload, Card } from '../types';

export default {
  namespaced: true as true,
  state: {
    decks: [] as Deck[],
  } as DecksState,
  getters: {
    decks: (state: DecksState) => state.decks,
  },
  mutations: {
    addDeck(state: DecksState, deck: Deck) {
      state.decks.push(deck);
    },
    addCard(state: DecksState, payload: EditCardPayload) {
      const newCard: Card = {
        _id: payload._id,
        frontText: payload.frontText,
        backText: payload.backText,
      };
      for (const deck of state.decks) {
        if (deck.title === payload.deckTitle) {
          deck.cards.push(newCard);
          break;
        }
      }
    },
    deleteCard(state: DecksState, payload: DeleteCardPayload) {
      for (const deck of state.decks) {
        if (deck.title === payload.deckTitle) {
          for (const card of deck.cards) {
            if (card._id === payload._id) {
              deck.cards.splice(deck.cards.indexOf(card), 1);
              break;
            }
          }
          break;
        }
      }
    },
    editCard(state: DecksState, payload: EditCardPayload) {
      for (const deck of state.decks) {
        if (deck.title === payload.deckTitle) {
          for (const card of deck.cards) {
            if (card._id === payload._id) {
              card.frontText = payload.frontText;
              card.backText = payload.backText;
              break;
            }
          }
          break;
        }
      }
    },
  },
  actions: {
    // async loadName({ commit }, payload: { id: string }) {
    //   const name = `Name-${payload.id}`; // load it from somewhere
    //   commit('SET_NAME', name);
    //   return { name };
    // },
  },
};
