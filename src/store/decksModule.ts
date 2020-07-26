import { DecksState, RootState, Deck, DeleteCardPayload, EditCardPayload, Card } from '../types';
import { ActionContext } from 'vuex';
import { InstanceList } from '@textile/threads-client/dist/models/query';
import store from './index';
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
    async createDeckInstances(
      { state, dispatch }: ActionContext<DecksState, RootState>,
      decks: Deck[]
    ) {
      const existingInstances = await (await store.dispatch.decksMod.getAllDeckInstances())
        .instancesList;
      console.log('existingInstances', existingInstances);
      if (existingInstances.length === 0) {
        console.log('---no instances found');
        const createdDecks = await store.state.authMod.client.create(
          store.state.authMod.threadId,
          'Deck',
          decks // note that the third param needs to be an array
        ); // client.create() returns the deck _ids //
        console.log('createdDecks', createdDecks);
      }
    },
    async getAllDeckInstances({
      state,
    }: ActionContext<DecksState, RootState>): Promise<InstanceList<any>> {
      const response = await store.state.authMod.client.find(
        store.state.authMod.threadId,
        'Deck',
        {}
      );
      console.log('getAllDeckInstances response', response);
      return response;
    },
  },
};
