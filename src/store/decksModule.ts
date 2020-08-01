import { DecksState, RootState, Deck, EditCardPayload, Card } from '../types';
import { ActionContext } from 'vuex';
import { InstanceList, Instance } from '@textile/threads-client/dist/models/query';
import store from './index';
import { Collection, Client } from '@textile/hub';
import { combineBacklog } from './utils';

export default {
  namespaced: true as true,
  state: {
    decks: [] as Deck[],
  } as DecksState,
  getters: {
    decks: (state: DecksState) => {
      // console.log('decks changed in store');
      return state.decks;
    },
  },
  mutations: {
    CLIENT(state: DecksState, client: Client) {
      state.client = client;
    },
    DECK_COLLECTION(state: DecksState, collection: Collection<Deck>) {
      state.deckCollection = collection;
    },

    /** Appends decks to the backlog */
    addToBacklog(state: DecksState, log: Deck[]) {
      console.log('adding to backlog', log);
      const newLog = [];
      if (!state.backlog) state.backlog = [];
      const joined = state.backlog.concat(log);
      console.log('joined', joined);
      state.backlog = joined;
    },
    /** removes the passed in deck IDs from the backlog */
    removeFromBacklog(state: DecksState, IDs: string[]) {
      const newLog = [];
      if (!state.backlog) state.backlog = [];
      return state.backlog.map(deck => !IDs.includes(deck._id));
    },
    /** Add or update a list of decks */
    DECKS(state: DecksState, decks: Deck[]) {
      decks.forEach(deck => {
        const exists = state.decks.map(stateDeck => stateDeck._id).includes(deck._id);
        if (!exists) state.decks.push(deck);
        else
          state.decks.forEach(stateDeck => {
            if (stateDeck._id === deck._id) {
              state.decks.splice(state.decks.indexOf(stateDeck), 1, deck);
            }
          });
      });
    },
    deleteDeck(state: DecksState, deckId: string) {
      state.decks.forEach(deck => {
        if (deck._id == deckId) {
          const replaceDeck = { ...deck };
          replaceDeck.deleted = true;
          replaceDeck.ttl = new Date().getTime() + 1.5e10;
          replaceDeck.updatedAt = new Date().getTime();
          state.decks.splice(state.decks.indexOf(deck), 1, replaceDeck);
        }
      });
    },
    addCard(state: DecksState, payload: EditCardPayload) {
      const newCard: Card = payload.card;
      for (const deck of state.decks) {
        if (deck._id === payload.deckId) {
          deck.cards.push(newCard);
          deck.updatedAt = new Date().getTime();
          break;
        }
      }
    },

    editCard(state: DecksState, payload: EditCardPayload) {
      state.decks.forEach(stateDeck => {
        if (stateDeck._id === payload.deckId) {
          stateDeck.cards.forEach(stateCard => {
            if (stateCard._id === payload.card._id) {
              const replaceCard = { ...payload.card };
              stateDeck.updatedAt = new Date().getTime();
              stateDeck.cards.splice(stateDeck.cards.indexOf(stateCard), 1, replaceCard);
              return;
            }
          });
          return;
        }
      });
    },
  },
  actions: {
    async addCard({ state }: ActionContext<DecksState, RootState>, payload: EditCardPayload) {
      await store.commit.decksMod.addCard(payload);
      for (const deck of state.decks) {
        if (deck._id === payload.deckId) {
          store.dispatch.decksMod.deckMergeToThread([deck]);
          break;
        }
      }
    },
    async editCard({ state }: ActionContext<DecksState, RootState>, payload: EditCardPayload) {
      await store.commit.decksMod.editCard(payload);
      state.decks.forEach(stateDeck => {
        if (stateDeck._id === payload.deckId) {
          stateDeck.cards.forEach(stateCard => {
            if (stateCard._id === payload.card._id) {
              store.dispatch.decksMod.deckMergeToThread([stateDeck]);
              return;
            }
          });
          return;
        }
      });
    },
    async deleteDeck({ state }: ActionContext<DecksState, RootState>, deckId: string) {
      await store.commit.decksMod.deleteDeck(deckId);
      state.decks.forEach(deck => {
        if (deck._id == deckId) {
          store.dispatch.decksMod.deckMergeToThread([deck]);
        }
      });
    },
    /** Will add a new deck or update an existing deck if its updatedAt date is higher. Will send all changes to Thread for syncing */
    async deckMergeToState({ state }: ActionContext<DecksState, RootState>, decks: Deck[]) {
      const stateDecks = state.decks;
      console.log('merging decks to state. decks, state decks', decks, stateDecks);
      const updateList: Deck[] = [];
      decks.forEach(deck => {
        const exists = stateDecks.map(stateDeck => stateDeck._id).includes(deck._id);
        // console.log('deck exists: ', exists);
        if (!exists) updateList.push(deck);
        else
          stateDecks.forEach(stateDeck => {
            if (stateDeck._id === deck._id) {
              if (deck.updatedAt > stateDeck.updatedAt) updateList.push(deck);
            }
          });
      });
      if (updateList.length > 0) {
        store.commit.decksMod.DECKS(updateList);
        store.dispatch.decksMod.deckMergeToThread(updateList);
      }
    },
    /** Adds or updates decks to the ThreadDB. Will replace whole deck that has lower updatedAt.
     * @param decks an array of decks
     */
    async deckMergeToThread({ state }: ActionContext<DecksState, RootState>, decksRaw: Deck[]) {
      console.log(`merging decks to thread`, decksRaw);
      let instanceList;
      try {
        instanceList = await store.dispatch.decksMod.getAllDeckInstances();
      } catch (err) {
        console.log(err);
        store.commit.decksMod.addToBacklog(decksRaw);
        console.log('state.backlog', state.backlog);
      }
      if (!instanceList) throw 'deck instance list not found';
      // combine backlog into current
      let decks = decksRaw;
      console.log('state.backlog', state.backlog);
      if (state.backlog && state.backlog.length > 0) {
        decks = combineBacklog(decks, state.backlog);
      }
      const threadDecks = instanceList.instancesList;
      // console.log('existingInstances', threadDecks);
      const decksToCreate: Deck[] = [];
      const decksToUpdate: Deck[] = [];
      decks.forEach(deck => {
        const exists = threadDecks.map(threadDeck => threadDeck._id).includes(deck._id);
        if (!exists) decksToCreate.push(deck);
        else
          threadDecks.forEach(existingDeck => {
            if (deck._id == existingDeck._id) {
              if (deck.updatedAt > existingDeck.updatedAt) decksToUpdate.push(deck);
            }
          });
      });
      // console.log('decks to merge to thread', decksToCreate, decksToUpdate);
      if (decksToCreate.length > 0 || decksToUpdate.length > 0)
        try {
          if (!store.state.authMod.threadID) throw 'no threadID';
          store.commit.authMod.SYNCING(true);

          const createdDecks = await state.client.create(
            store.state.authMod.threadID,
            'Deck',
            decksToCreate
          ); // client.create() returns the deck _ids //
          const updatedDecks = await state.client.save(
            store.state.authMod.threadID,
            'Deck',
            decksToUpdate
          );
          // update doesn't return anything
          console.log(
            'createdDecks, updatedDecks',
            createdDecks,
            decksToUpdate.map(deck => deck._id)
          );
          store.commit.decksMod.removeFromBacklog(
            createdDecks.concat(decksToUpdate.map(deck => deck._id))
          );
          store.commit.authMod.SYNCING(false);
        } catch (err) {
          console.log(err);
          store.commit.decksMod.addToBacklog(decks);
          store.commit.authMod.SYNCING(false);
        }
    },
    async getAllDeckInstances({
      state,
    }: ActionContext<DecksState, RootState>): Promise<InstanceList<Deck>> {
      if (!store.state.authMod.threadID) throw 'no threadID';
      const response = await state.client.find<Deck>(store.state.authMod.threadID, 'Deck', {});
      // console.log('getAllDeckInstances response', response);
      return response;
    },
    async setUpListening({ state }: ActionContext<DecksState, RootState>) {
      if (!store.state.authMod.threadID) throw 'no threadID';
      console.log('setting up listening');
      state.client.listen(
        store.state.authMod.threadID,
        [{ collectionName: 'Deck' }],
        async (reply?: Instance<Deck>, err?) => {
          store.commit.authMod.SYNCING(true);

          if (err) {
            console.log(err);
          } else {
            // console.log('instance changed remotely', reply);
            if (reply?.instance) {
              store.dispatch.decksMod.deckMergeToState([reply.instance]);
              store.commit.authMod.SYNCING(false);
            }
          }
        }
      );
    },
  },
};
