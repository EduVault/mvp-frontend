import { AuthState, RootState, Deck } from '../types';
import { ActionContext } from 'vuex';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import store from '../store';
// import { ApiRes } from '../types';
import router from '@/router';
import { Libp2pCryptoIdentity } from '@textile/threads-core';
import { ThreadID } from '@textile/hub';
import CryptoJS from 'crypto-js';
import { saveLoginData, passwordResolveAuthCheck, socialMediaResolveAuthCheck } from './utils';
import { API_URL_ROOT, PASSWORD_SIGNUP, DEV_API_URL_ROOT, PASSWORD_LOGIN } from '../config';
import defaultDeck from '@/assets/defaultDeck.json';
import { connectClient } from '../store/textileHelpers';

import Vue from 'vue';
import VueCookies from 'vue-cookies';
Vue.use(VueCookies);

export default {
  namespaced: true as true,
  state: {
    loggedIn: false,
    syncing: false,
    API_URL:
      process.env.NODE_ENV === 'production'
        ? 'https://' + API_URL_ROOT
        : 'http://' + DEV_API_URL_ROOT,
    API_WS_URL:
      process.env.NODE_ENV === 'production' ? 'wss://' + API_URL_ROOT : 'ws://' + DEV_API_URL_ROOT,
    PASSWORD_SIGNUP: PASSWORD_SIGNUP,
    PASSWORD_LOGIN: PASSWORD_LOGIN,
  } as AuthState,
  getters: {
    loggedIn: (state: AuthState) => state.loggedIn,
    syncing: (state: AuthState) => state.syncing,
  },
  mutations: {
    AUTHTYPE(state: AuthState, type: 'google' | 'facebook' | 'password') {
      state.authType = type;
    },
    LOGGEDIN(state: AuthState, bool: boolean) {
      state.loggedIn = bool;
    },
    SYNCING(state: AuthState, bool: boolean) {
      state.syncing = bool;
    },
    KEYPAIR(state: AuthState, keyPair: Libp2pCryptoIdentity | undefined) {
      state.keyPair = keyPair;
    },
    JWT(state: AuthState, jwt: string | undefined) {
      state.jwt = jwt;
    },
    PUBKEY(state: AuthState, key: string | undefined) {
      state.pubKey = key;
    },
    THREAD_ID(state: AuthState, ID: ThreadID | undefined) {
      state.threadID = ID;
    },
    THREAD_ID_STR(state: AuthState, ID: string | undefined) {
      state.threadIDStr = ID;
    },
    JWT_ENCRYPTED_KEYPAIR(state: AuthState, jwtEncryptedKeyPair: string | undefined) {
      state.jwtEncryptedKeyPair = jwtEncryptedKeyPair;
    },
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
            'X-Forwarded-Proto': 'https',
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
        const responseData = response.data;
        console.log('login cookie: ' + JSON.stringify(Vue.$cookies.get('eduvault.sess')));
        console.log('login/signup data: ' + JSON.stringify(responseData));
        if (responseData.code !== 200) {
          if (responseData.message) return responseData.message;
          else return 'Unable to connect to database';
        } else {
          const loginData = responseData.data;
          // console.log('loginData', loginData);
          await saveLoginData(loginData, payload.password);
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
        headers: {
          'X-Forwarded-Proto': 'https',
        },
        withCredentials: true,
      } as AxiosRequestConfig;
      axios(options);
      store.commit.authMod.JWT(undefined);
      store.commit.authMod.PUBKEY(undefined);
      store.commit.authMod.LOGGEDIN(false);
      store.commit.authMod.JWT_ENCRYPTED_KEYPAIR(undefined);
      store.commit.authMod.KEYPAIR(undefined);
      store.commit.authMod.PUBKEY(undefined);
      store.commit.authMod.THREAD_ID(undefined);
    },

    async checkAuth({ state }: ActionContext<AuthState, RootState>): Promise<boolean | undefined> {
      try {
        const options = {
          url: state.API_URL + '/auth-check',
          headers: {
            'X-Forwarded-Proto': 'https',
          },
          method: 'GET',
          withCredentials: true,
        } as AxiosRequestConfig;
        console.log('check auth cookie: ' + JSON.stringify(Vue.$cookies.get('eduvault.sess')));

        const authCheck = await axios(options);
        console.log(authCheck.data);
        if (authCheck.data.code == 200) {
          // if we don't have an identity, check for jwt and localstorage,
          if (state.keyPair) {
            store.commit.authMod.LOGGEDIN(true);
            return true;
          } else {
            console.log(state.authType);
            switch (state.authType) {
              case 'password': {
                return await passwordResolveAuthCheck(
                  state.jwtEncryptedKeyPair,
                  state.pubKey,
                  state.threadIDStr,
                  state.jwt
                );
              }
              case 'google' || 'facebook': {
                return socialMediaResolveAuthCheck(
                  state.jwtEncryptedKeyPair,
                  state.pubKey,
                  state.threadIDStr,
                  state.jwt,
                  state.authType
                );
              }
            }
          }
        } else {
          store.commit.authMod.LOGGEDIN(false);
          console.log('authcheck failed (likely no cookie)');
          return false;
        }
      } catch (err) {
        console.log('other error: ' + JSON.stringify(err, err.message));
        return false;
      }
    },

    async getUser({ state }: ActionContext<AuthState, RootState>) {
      try {
        const options = {
          url: state.API_URL + '/get-user',
          headers: {
            'X-Forwarded-Proto': 'https',
          },
          method: 'GET',
          withCredentials: true,
        } as AxiosRequestConfig;
        const response = await axios(options);
        console.log(response.data);
        if (!response.data || !response.data.data || !response.data.data.jwt) return null;
        else return response.data.data;
      } catch (err) {
        console.log(err);
        return null;
      }
    },
    async initialize(
      { state }: ActionContext<AuthState, RootState>,
      payload: {
        jwt: string;
        keyPair: Libp2pCryptoIdentity;
        threadID: ThreadID;
        retry: number;
      }
    ) {
      if (payload.jwt && payload.keyPair && payload.threadID) {
        try {
          const client = await connectClient(
            state.API_WS_URL + '/ws/auth',
            payload.jwt,
            payload.keyPair,
            payload.threadID
          );
          if (client) {
            await store.commit.decksMod.CLIENT(client);
            await store.dispatch.decksMod.setUpListening();
            // sync all remote instances with our local ones
            const threadDeckInstances = await store.dispatch.decksMod.getAllDeckInstances();
            await store.dispatch.decksMod.deckMergeToState(threadDeckInstances.instancesList);
          } else throw 'unable to connect to Threads DB';
        } catch (err) {
          if (
            err == 'unable to connect to Threads DB' ||
            err == 'error connecting to ThreadDB client'
          ) {
            payload.retry++;
            store.dispatch.authMod.initialize(payload);
          }
          console.log(err);
        }
      } else if (payload.retry > 1) {
        router.push('/login');
      } else {
        payload.retry++;
        store.dispatch.authMod.initialize(payload);
      }
    },
  },
};
