import { Deck } from '../types';
import { orderBy } from 'lodash';
import CryptoJS from 'crypto-js';
import { Libp2pCryptoIdentity } from '@textile/threads-core';
import store from './index';
import { ThreadID } from '@textile/hub';

/** Combine the backlog and the current list of decks to be added. Return only the newest editions.
 * @param decksRaw the most recent list of decks being added to the thread
 * @param backlog the previous backlog
 */
export function combineBacklog(decksRaw: Deck[], backlog: Deck[]) {
  console.log('combineBacklog', decksRaw, backlog);
  const combined = decksRaw.concat(backlog);
  console.log('combined', combined);
  const ordered = orderBy(combined, ['updatedAt', 'desc']);
  console.log(ordered);
  const pruned: Deck[] = [];
  ordered.forEach(deck => {
    const prunedIDs = pruned.map(deck => deck._id);
    if (!prunedIDs.includes(deck._id)) pruned.push(deck);
  });
  console.log('pruned', pruned);
  return pruned;
}

export async function rehydrateKeyPair(
  encryptedKeyPair: string,
  oldPubkey: string,
  decrpyter: string
) {
  const decryptedKeyPairBytes = CryptoJS.AES.decrypt(encryptedKeyPair, decrpyter);
  const decryptedKeyPairString = decryptedKeyPairBytes.toString(CryptoJS.enc.Utf8);
  const rehydratedKeyPair = await Libp2pCryptoIdentity.fromString(decryptedKeyPairString);
  const testMatching = rehydratedKeyPair.public.toString() === oldPubkey;
  // console.log('keys match: ', testMatching);
  if (!testMatching) throw 'Unable to decrypt keys from server';
  return rehydratedKeyPair;
}

export async function saveLoginData(loginData: any, password: string) {
  const rehydratedKeyPair = await rehydrateKeyPair(
    loginData.encryptedKeyPair,
    loginData.pubKey,
    password
  );
  if (store.state.authMod.threadIDStr !== loginData.threadIDStr)
    store.commit.authMod.THREAD_ID_STR(loginData.threadIDStr);
  const threadID = ThreadID.fromString(loginData.threadIDStr);
  if (store.state.authMod.keyPair !== rehydratedKeyPair)
    await store.commit.authMod.KEYPAIR(rehydratedKeyPair);
  if (store.state.authMod.jwt !== loginData.jwt) await store.commit.authMod.JWT(loginData.jwt);
  if (store.state.authMod.threadID !== threadID) await store.commit.authMod.THREAD_ID(threadID);
  await store.commit.authMod.AUTHTYPE('password');
  const jwtEncryptedKeyPair = CryptoJS.AES.encrypt(
    rehydratedKeyPair.toString(),
    loginData.jwt
  ).toString();
  if (store.state.authMod.jwtEncryptedKeyPair !== jwtEncryptedKeyPair)
    await store.commit.authMod.JWT_ENCRYPTED_KEYPAIR(jwtEncryptedKeyPair);
  if (store.state.authMod.pubKey !== loginData.pubKey)
    await store.commit.authMod.PUBKEY(loginData.pubKey);
}
