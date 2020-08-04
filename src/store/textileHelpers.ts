import { UserAuth } from '@textile/hub';
import { AuthState, Deck, deckSchema } from '../types';
import { Libp2pCryptoIdentity } from '@textile/threads-core';
import { Buffer } from 'buffer';
import { Collection, Database, Client, ThreadID, Buckets, Root } from '@textile/hub';
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
  async function createClients(
    API_URL_ROOT: string,
    jwt: string,
    keyPair: Libp2pCryptoIdentity,
    threadID: ThreadID
  ) {
    try {
      const loginCallback = loginWithChallenge(API_URL_ROOT, jwt, keyPair);
      const threadClient = Client.withUserAuth(await loginCallback());
      console.log('connecting bucket');
      const bucketClient = Buckets.withUserAuth(await loginCallback());
      console.log('bucketClient', bucketClient);

      return { threadClient, bucketClient };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  async function findOrCreateDB(client: Client, threadID: ThreadID) {
    // await client.deleteDB(threadID); // use to delete DB during testing
    try {
      const threads = await client.listThreads();
      const threadsList = threads.listList;
      // console.log(threadsList);
      if (!threadsList.find(thread => thread.id === threadID.toString())) throw 'BD not found';
      // const info = await client.getDBInfo(threadID);
      console.log('database found');
    } catch (err) {
      console.log('database not found');
      await client.newDB(threadID, 'EduVault');
      // const afterCheck = await client?.getDBInfo(threadID);
      // console.log('afterCheck', afterCheck);
    }
  }
  async function createDeckCollection(client: Client, threadID: ThreadID) {
    try {
      await client.find(threadID, 'Deck', {});
    } catch {
      console.log(`no 'Deck' collection found`);
      await client.newCollection(threadID, 'Deck', deckSchema);
    }
  }
  async function createBuckets(buckets: Buckets, threadID: ThreadID) {
    const root = await buckets.open('files', 'buckets', false, threadID.toString());

    // console.log(root);
    if (!root) return null;
    // console.log('creating bucket', buckets);
    await buckets.withThread(threadID.toString());

    const roots = await buckets.list();
    // console.log('bucket roots', roots);
    const existing = roots.find(root => root.name === 'files');
    let bucketKey = '';
    if (existing) {
      bucketKey = existing.key;
    } else {
      const created = await buckets.init('files');
      bucketKey = created.root ? created.root.key : '';
    }
    // console.log('bucket key', bucketKey);
    store.commit.authMod.BUCKET_KEY(bucketKey);
    store.commit.decksMod.BUCKETS(buckets);
    const links = await buckets.links(bucketKey);
    store.commit.authMod.BUCKET_URL(links.url);
    return bucketKey;
  }
  store.commit.authMod.SYNCING(true);
  // console.log('API_URL_ROOT, jwt, keyPair, threadID', API_URL_ROOT, jwt, keyPair, threadID);
  const client = await createClients(API_URL_ROOT, jwt, keyPair, threadID);
  if (client && client.threadClient) {
    await findOrCreateDB(client.threadClient, threadID);
    await createDeckCollection(client.threadClient, threadID);
    await createBuckets(client.bucketClient, threadID);
    console.log('connected to DB');
  } else {
    store.commit.authMod.SYNCING(false);
    throw 'error connecting to ThreadDB client';
  }
  store.commit.authMod.SYNCING(false);
  return client.threadClient;
}
