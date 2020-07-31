import { AuthState, RootState, Deck } from '../types';
import { ActionContext } from 'vuex';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import store from '../store';
// import router from '../router';
// import { ApiRes } from '../types';
import router from '@/router';
import { Libp2pCryptoIdentity } from '@textile/threads-core';
import { Collection, Database, Client, ThreadID } from '@textile/hub';
import { deckSchema } from '../schemas';
import CryptoJS from 'crypto-js';
import { loginWithChallenge, connectClient, rehydrateKeyPair } from './textileHelpers';
import { CLIENT_RENEG_LIMIT } from 'tls';
// import { DBInfo } from '@textile/threads';
import { API_URL, PASSWORD_SIGNUP, DEV_API_URL, PASSWORD_LOGIN } from '../config';
import defaultDeck from '@/assets/defaultDeck.json';

export default {
  namespaced: true as true,
  state: {
    API_URL: process.env.NODE_ENV === 'production' ? 'https://' + API_URL : 'http://' + DEV_API_URL,
    API_WS_URL: process.env.NODE_ENV === 'production' ? 'wss://' + API_URL : 'ws://' + DEV_API_URL,
    PASSWORD_SIGNUP: PASSWORD_SIGNUP,
    PASSWORD_LOGIN: PASSWORD_LOGIN,
  } as AuthState,
  getters: {
    loggedIn: (state: AuthState) => state.loggedIn,
  },
  mutations: {
    AUTHTYPE(state: AuthState, type: 'google' | 'facebook' | 'password') {
      state.authType = type;
    },
    LOGGEDIN(state: AuthState, bool: boolean) {
      state.loggedIn = bool;
    },
    KEYPAIR(state: AuthState, keyPair: Libp2pCryptoIdentity) {
      state.keyPair = keyPair;
    },
    REMOVE_KEYPAIR(state: AuthState) {
      delete state.keyPair;
    },
    JWT(state: AuthState, jwt: string | undefined) {
      state.jwt = jwt;
    },
    PUBKEY(state: AuthState, key: string | undefined) {
      state.pubKey = key;
    },
    THREADID(state: AuthState, ID: ThreadID) {
      state.threadID = ID;
    },
    // DB(state: AuthState, db: Database) {
    //   state.db = db;
    // },
  },
  actions: {
    async passwordAuth(
      { state }: ActionContext<AuthState, RootState>,
      payload: { password: string; username: string; signup: boolean }
    ) {
      try {
        const options = {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
          data: {
            username: payload.username,
            password: payload.password,
          } as any,
        } as AxiosRequestConfig;
        if (payload.signup) {
          const keyPair = await Libp2pCryptoIdentity.fromRandom();
          const pubKey = keyPair.public.toString();
          store.commit.authMod.PUBKEY(pubKey);
          const encryptedKeyPair = CryptoJS.AES.encrypt(
            keyPair.toString(),
            payload.password
          ).toString();
          const newThreadID = ThreadID.fromRandom();
          options.data.threadIDStr = newThreadID.toString();
          options.data.encryptedKeyPair = encryptedKeyPair;
          options.data.pubKey = pubKey;
          options.url = state.API_URL + state.PASSWORD_SIGNUP;
        } else options.url = options.url = state.API_URL + state.PASSWORD_LOGIN;

        const response = await axios(options);
        const data = response.data;
        console.log('login/signup data', data);
        if (data.code !== 200) {
          if (data.message) return data.message;
          else return 'Unable to connect to database';
        } else {
          // console.log(data.data);
          const rehydratedKeyPair = await rehydrateKeyPair(
            data.data.encryptedKeyPair,
            data.data.pubKey,
            payload.password
          );
          const threadID = ThreadID.fromString(data.data.threadIDStr);
          await store.commit.authMod.KEYPAIR(rehydratedKeyPair);
          await store.commit.authMod.JWT(data.data.jwt);
          await store.commit.authMod.THREADID(threadID);
          store.commit.authMod.AUTHTYPE('password');
          // save a version of the key pair encrypted by the jwt in local storage in case we close the window
          const jwtEncryptedKeyPair = CryptoJS.AES.encrypt(
            rehydratedKeyPair.toString(),
            data.data.jwt
          ).toString();
          localStorage.setItem('EduVault_jwtEncryptedKeyPair', jwtEncryptedKeyPair);
          localStorage.setItem('EduVault_pubKey', data.data.pubKey);
          localStorage.setItem('EduVault_threadID', data.data.threadIDStr);

          const client = await connectClient(
            state.API_WS_URL + '/ws/auth',
            data.data.jwt,
            rehydratedKeyPair,
            threadID
          );
          if (client) {
            await store.commit.decksMod.CLIENT(client);
            await store.dispatch.decksMod.setUpListening();
            await store.dispatch.decksMod.deckMergeToState([defaultDeck]);
            const threadDeckInstances = await store.dispatch.decksMod.getAllDeckInstances();
            await store.dispatch.decksMod.deckMergeToState(threadDeckInstances.instancesList);
          } else throw 'unable to connect to Threads DB';
          store.commit.authMod.LOGGEDIN(true);
          router.push('/home');
          return 'success';
        }
      } catch (err) {
        console.log(err);
        console.log(err.response);
        if (err.response && err.response.data && err.response.data.message)
          return err.response.data.message;
        else return 'Issue connecting to database';
      }
    },

    async logout({ state }: ActionContext<AuthState, RootState>) {
      const options = {
        url: state.API_URL + '/logout',
        method: 'GET',
        withCredentials: true,
      } as AxiosRequestConfig;
      axios(options);
      store.commit.authMod.JWT(undefined);
      store.commit.authMod.PUBKEY(undefined);
      store.commit.authMod.REMOVE_KEYPAIR();
      store.commit.authMod.LOGGEDIN(false);
      localStorage.removeItem('EduVault_jwtEncryptedKeyPair');
      localStorage.removeItem('EduVault_pubKey');
      localStorage.removeItem('EduVault_threadID');
    },

    async checkAuth({ state }: ActionContext<AuthState, RootState>) {
      try {
        const options = {
          url: state.API_URL + '/auth-check',
          headers: { 'Access-Control-Allow-Origin': '*' },
          method: 'GET',
          withCredentials: true,
        } as AxiosRequestConfig;

        const authCheck = await axios(options);
        // console.log('authcheck', authCheck);

        if (authCheck.data.code == 200) {
          // if we don't have an identity, check for jwt and localstorage,
          if (state.keyPair) {
            store.commit.authMod.LOGGEDIN(true);
            return true;
          } else {
            const jwtEncryptedKeyPair = localStorage.getItem('EduVault_jwtEncryptedKeyPair');
            const storedPubKey = localStorage.getItem('EduVault_pubKey');
            const threadStr = localStorage.getItem('EduVault_threadID');
            // if we don't have items stored in localStorage we need to login
            if (!jwtEncryptedKeyPair || !storedPubKey || !threadStr) {
              store.commit.authMod.LOGGEDIN(false);
              console.log('couldnt find keys stored in local storage');
              return false;
            } else {
              // If we refreshed the page and don't have a jwt, we'll need to request a new one
              let jwt;
              if (!state.jwt) {
                const user = await store.dispatch.authMod.getUser();
                jwt = user.jwt;
              } else {
                jwt = state.jwt;
              }
              if (!jwt) {
                // if we failed, we'll need to login
                store.commit.authMod.LOGGEDIN(false);
                console.log('invalid jwt');
                return false;
              }
              // if we have all the info we need, rehydrate them and start back up the DB connection.
              const threadID = ThreadID.fromString(threadStr);
              let rehydratedKeyPair;
              try {
                rehydratedKeyPair = await rehydrateKeyPair(jwtEncryptedKeyPair, storedPubKey, jwt);
              } catch {
                store.commit.authMod.LOGGEDIN(false);
                console.log('error rehydrating keys');
                return false;
              }
              store.commit.authMod.KEYPAIR(rehydratedKeyPair);
              store.commit.authMod.JWT(jwt);
              store.commit.authMod.PUBKEY(storedPubKey);
              store.commit.authMod.THREADID(threadID);
              const client = await connectClient(
                state.API_WS_URL + '/ws/auth',
                jwt,
                rehydratedKeyPair,
                threadID
              );
              if (client) {
                store.commit.decksMod.CLIENT(client);
                await store.dispatch.decksMod.setUpListening();
                await store.dispatch.decksMod.deckMergeToState([defaultDeck]);
                const threadDeckInstances = await store.dispatch.decksMod.getAllDeckInstances();
                await store.dispatch.decksMod.deckMergeToState(threadDeckInstances.instancesList);
              } else throw 'unable to reconnect to Thread DB';
              store.commit.authMod.LOGGEDIN(true);
              return true;
            }
          }
        } else {
          store.commit.authMod.LOGGEDIN(false);
          console.log('authcheck failed (likely no cookie)');
          return false;
        }
      } catch (err) {
        console.log('other error', err, err.message);
        return false;
      }
    },

    async getUser({ state }: ActionContext<AuthState, RootState>) {
      try {
        const options = {
          url: state.API_URL + '/get-user',
          headers: { 'Access-Control-Allow-Origin': '*' },
          method: 'GET',
          withCredentials: true,
        } as AxiosRequestConfig;
        const response = await axios(options);
        if (!response.data || !response.data.data || !response.data.data.jwt) return null;
        else return response.data.data;
      } catch (err) {
        console.log(err);
        return null;
      }
    },
  },
};
