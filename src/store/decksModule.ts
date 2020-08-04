import { DecksState, RootState, Deck, EditCardPayload, Card } from '../types';
import { ActionContext } from 'vuex';
import { InstanceList, Instance } from '@textile/threads-client/dist/models/query';
import store from './index';
import { Collection, Client, Buckets } from '@textile/hub';
import { combineBacklog } from './utils';
import { connectClient } from '../store/textileHelpers';
import defaultDeck from '../assets/defaultDeck.json';

const defaultState: DecksState = {
  decks: [defaultDeck],
  backlog: [] as Deck[],
  client: undefined,
  deckCollection: undefined,
};
const getDefaultState = () => {
  return defaultState;
};
export default {
  namespaced: true as true,
  state: getDefaultState(),
  getters: {
    decks: (state: DecksState) => {
      // console.log('decks changed in store');
      return state.decks;
    },
  },
  mutations: {
    CLEAR_STATE(state: DecksState) {
      Object.assign(state, getDefaultState());
    },
    CLIENT(state: DecksState, client: Client) {
      state.client = client;
    },
    BUCKETS(state: DecksState, buckets: Buckets) {
      state.buckets = buckets;
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
    async deckMergeToState(
      { state }: ActionContext<DecksState, RootState>,
      payload: { decks: Deck[]; skipThreadMerge: boolean }
    ) {
      const start = new Date().getTime();
      const stateDecks = state.decks;
      const decks = payload.decks;
      // console.log('merging decks to state. decks, state decks', decks, stateDecks);
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
        console.log(`merging decks to state\n`, new Date().getTime() - start);
        if (!payload.skipThreadMerge) store.dispatch.decksMod.deckMergeToThread(updateList);
      }
    },
    /** Adds or updates decks to the ThreadDB. Will replace whole deck that has lower updatedAt.
     * @param decks an array of decks
     */
    async deckMergeToThread({ state }: ActionContext<DecksState, RootState>, decksRaw: Deck[]) {
      let start = new Date().getTime();

      console.log(`merging decks to thread`, decksRaw);
      let instanceList;
      try {
        if (!state.client) throw 'client not connected';
        instanceList = await store.dispatch.decksMod.getAllDeckInstances();
      } catch (err) {
        console.log(err);
        store.commit.decksMod.addToBacklog(decksRaw);
        console.log('state.backlog', state.backlog);
        //try to reconnect
        const client = await connectClient(
          store.state.authMod.API_WS_URL + '/ws/auth',
          store.state.authMod.jwt!,
          store.state.authMod.keyPair!,
          store.state.authMod.threadID!
        );
        if (client) store.dispatch.decksMod.deckMergeToThread(decksRaw);
        else throw 'unable to reconnect';
        return null;
      }
      if (!instanceList) {
        console.log('deck instance list not found', instanceList);
        return null;
      }
      // combine backlog into current
      let decks = decksRaw;
      // console.log('state.backlog', state.backlog);
      if (state.backlog && state.backlog.length > 0) {
        decks = combineBacklog(decks, state.backlog);
      }
      const threadDecks = instanceList.instancesList;
      console.log('existingInstances', threadDecks);
      const decksToCreate: Deck[] = [];
      const decksToUpdate: Deck[] = [];
      const decksToAddLocal: Deck[] = [];
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
      threadDecks.forEach(threadDeck => {
        const exists = decks.map(deck => deck._id).includes(threadDeck._id);
        if (!exists) decksToAddLocal.push(threadDeck);
        else
          decks.forEach(localDeck => {
            if (threadDeck._id == localDeck._id) {
              if (threadDeck.updatedAt > localDeck.updatedAt) decksToAddLocal.push(threadDeck);
            }
          });
      });
      console.log('decks to merge to thread', decksToCreate, decksToUpdate);
      console.log('decks to add local', decksToAddLocal);
      if (decksToCreate.length > 0 || decksToUpdate.length > 0)
        try {
          if (!store.state.authMod.threadID || !state.client) throw 'no threadID or client';
          store.commit.authMod.SYNCING(true);

          const createdDecks = await state.client.create(
            store.state.authMod.threadID,
            'Deck',
            decksToCreate
          ); // client.create() returns the deck _ids //
          start = new Date().getTime();
          console.log(
            `state.client.save(). instance count: ${decksToCreate.length + 1}\n`,
            new Date().getTime() - start
          );

          const updatedDecks = await state.client.save(
            store.state.authMod.threadID,
            'Deck',
            decksToUpdate
          );
          // update doesn't return anything
          console.log(
            `state.client.save(). instance count: ${decksToUpdate.length + 1}\n`,
            new Date().getTime() - start
          );
          // console.log(
          //   'createdDecks, updatedDecks',
          //   createdDecks,
          //   decksToUpdate.map(deck => deck._id)
          // );

          store.commit.decksMod.removeFromBacklog(
            createdDecks.concat(decksToUpdate.map(deck => deck._id))
          );
          store.commit.authMod.SYNCING(false);
        } catch (err) {
          console.log(err);
          store.commit.decksMod.addToBacklog(decks);
          store.commit.authMod.SYNCING(false);
        }
      store.dispatch.decksMod.deckMergeToState({
        decks: decksToAddLocal,
        skipThreadMerge: true,
      });
    },
    async getAllDeckInstances({
      state,
    }: ActionContext<DecksState, RootState>): Promise<InstanceList<Deck>> {
      const start = new Date().getTime();

      if (!store.state.authMod.threadID || !state.client) throw 'no threadID or client';
      const response = await state.client.find<Deck>(store.state.authMod.threadID, 'Deck', {});
      // console.log('getAllDeckInstances response', response);
      console.log(
        `state.client.find<Deck>(store.state.authMod.threadID, 'Deck', {});\n`,
        new Date().getTime() - start
      );

      return response;
    },
    async setUpListening({ state }: ActionContext<DecksState, RootState>) {
      if (!store.state.authMod.threadID || !state.client) throw 'no threadID or client';
      // console.log('setting up listening');
      state.client.listen(
        store.state.authMod.threadID,
        [{ collectionName: 'Deck' }],
        async (reply?: Instance<Deck>, err?) => {
          const start = new Date().getTime();
          store.commit.authMod.SYNCING(true);
          if (err) {
            console.log(err);
          } else {
            // console.log('instance changed remotely', reply);
            if (reply?.instance) {
              store.dispatch.decksMod.deckMergeToState({
                decks: [reply.instance],
                skipThreadMerge: true,
              });
              console.log(`reacting to state.client.listen()\n`, new Date().getTime() - start);
              store.commit.authMod.SYNCING(false);
            }
          }
        }
      );
    },
  },
};
