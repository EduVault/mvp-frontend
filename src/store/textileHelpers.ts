import { UserAuth } from '@textile/hub';
import { AuthState, Deck, deckSchema } from '../types';
import { Libp2pCryptoIdentity } from '@textile/threads-core';
import { Buffer } from 'buffer';
import { Collection, Database, Client, ThreadID } from '@textile/hub';
import store from './index';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { fromEvent, Observable } from 'rxjs';
import defaultDeck from '@/assets/defaultDeck.json';
import { v4 as uuid } from 'uuid';
// import { DBInfo } from '@textile/threads';

/** we should have different forms of getting the Textile userAuth,
 * 1. crypto wallet: ask crypto wallet to sign
 * 2. oauth: on log in, get the keypair encrypted by PIN and store in localStorage, challeng user with PIN, and keep the unencrypted keypair in app storage to keep signing
 * 3. password account: same as 2, but the server is storing only encrypted keypair, encryped by password. both 2 and 3 need to keep the plaintext public key for recovery
 */
function loginWithChallenge(
  API_URL_ROOT: string,
  jwt: string,
  keyPair: Libp2pCryptoIdentity
): () => Promise<UserAuth> {
  // we pass identity into the function returning function to make it
  // available later in the callback
  return () => {
    return new Promise((resolve, reject) => {
      /** Initialize our websocket connection */
      // console.log('state.jwt', state.jwt);
      const socket = new WebSocket(API_URL_ROOT);
      /** Wait for our socket to open successfully */
      socket.onopen = async () => {
        if (!jwt || jwt === '') throw 'no jwt';
        if (!keyPair) throw 'no keyPair';
        socket.send(
          JSON.stringify({
            type: 'token-request',
            jwt: jwt,
          })
        );

        /** Listen for messages from the server */
        socket.onmessage = async msg => {
          const data = JSON.parse(msg.data);
          console.log('=================wss message===================', data);

          switch (data.type) {
            case 'error': {
              reject(data.value);
              break;
            }
            /** The server issued a new challenge */
            case 'challenge-request': {
              /** Convert the challenge json to a Buffer */
              const buf = Buffer.from(data.value);
              /** User our identity to sign the challenge */
              const signed = await keyPair.sign(buf);
              /** Send the signed challenge back to the server */
              socket.send(
                JSON.stringify({
                  type: 'challenge-response',
                  jwt: jwt,
                  signature: Buffer.from(signed).toJSON(),
                })
              );
              break;
            }
            /** New token generated */
            case 'token-response': {
              resolve(data.value);
              break;
            }
          }
        };
      };
    });
  };
}

export async function connectClient(
  API_URL_ROOT: string,
  jwt: string,
  keyPair: Libp2pCryptoIdentity,
  threadID: ThreadID
) {
  async function createClient(API_URL_ROOT: string, jwt: string, keyPair: Libp2pCryptoIdentity) {
    try {
      const loginCallback = loginWithChallenge(API_URL_ROOT, jwt, keyPair);
      const client = Client.withUserAuth(await loginCallback());
      // console.log('client', client);
      return client;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  async function findOrCreateDB(client: Client, threadID: ThreadID) {
    // await client.deleteDB(threadID); // use to delete DB during testing
    try {
      const threadsList = await client.listThreads();
      console.log(threadsList);
      console.log('threadID', threadID.toString());
      // const exists = await client?.getDBInfo(threadID);
      console.log('database found');
    } catch (err) {
      console.log('database not found');
      await client.newDB(threadID);
      // const afterCheck = await client?.getDBInfo(threadID);
      // console.log('afterCheck', afterCheck);
    }
  }
  async function createDeckCollection(client: Client, threadID: ThreadID) {
    try {
      await client.find(threadID, 'Deck', {});
    } catch {
      // console.log(`no 'Deck' collection found`);
      await client.newCollection(threadID, 'Deck', deckSchema);
    }
  }
  store.commit.authMod.SYNCING(true);
  // console.log('API_URL_ROOT, jwt, keyPair, threadID', API_URL_ROOT, jwt, keyPair, threadID);
  const client = await createClient(API_URL_ROOT, jwt, keyPair);
  if (client) {
    await findOrCreateDB(client, threadID);
    await createDeckCollection(client, threadID);
    console.log('connected to DB');
  } else {
    throw 'error connecting to ThreadDB client';
    store.commit.authMod.SYNCING(false);
  }
  store.commit.authMod.SYNCING(false);
  return client;
}
