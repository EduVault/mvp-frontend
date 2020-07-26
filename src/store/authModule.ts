import { AuthState, RootState } from '../types';
import { ActionContext } from 'vuex';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import store from '../store';
// import router from '../router';
import { ApiRes } from '../types';
import router from '@/router';
import { Libp2pCryptoIdentity } from '@textile/threads-core';
import { Collection, Database, Client, ThreadID } from '@textile/hub';
import { deckSchema } from '../schemas';
import CryptoJS from 'crypto-js';
import { loginWithChallenge } from './textileHelpers';
const TEXTILE_API = process.env.VUE_APP_TEXTILE_API;

export default {
  namespaced: true as true,
  state: {
    jwt: '',
    pubKey: '',
    API_URL:
      process.env.NODE_ENV === 'production' || process.env.VUE_APP_NODE_ENV === 'production'
        ? 'https://' + process.env.VUE_APP_API_URL
        : 'http://' + process.env.VUE_APP_DEV_API_URL,
    API_WS_URL:
      process.env.NODE_ENV === 'production' || process.env.VUE_APP_NODE_ENV === 'production'
        ? 'wss://' + process.env.VUE_APP_API_URL
        : 'ws://' + process.env.VUE_APP_DEV_API_URL,
    PASSWORD_SIGNUP: process.env.VUE_APP_PASSWORD_SIGNUP,
    PASSWORD_LOGIN: process.env.VUE_APP_PASSWORD_LOGIN,
  } as AuthState,
  getters: {
    loggedIn(state: AuthState) {
      return state.loggedIn;
    },
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
    JWT(state: AuthState, jwt: string) {
      state.jwt = jwt;
    },
    PUBKEY(state: AuthState, key: string) {
      state.pubKey = key;
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
          const encryptedKeyPair = CryptoJS.AES.encrypt(
            keyPair.toString(),
            payload.password
          ).toString();
          options.data.encryptedKeyPair = encryptedKeyPair;
          options.data.pubKey = pubKey;
          store.commit.authMod.PUBKEY(pubKey);
          options.url = state.API_URL + state.PASSWORD_SIGNUP;
        } else options.url = options.url = state.API_URL + state.PASSWORD_LOGIN;
        const response = await axios(options);
        const data = response.data;
        if (data.code !== 200) {
          if (data.message) return data.message;
          else return 'Unable to connect to database';
        } else {
          // console.log(data.data);
          const decryptedKeyPairBytes = CryptoJS.AES.decrypt(
            data.data.encryptedKeyPair,
            payload.password
          );
          const decryptedKeyPairString = decryptedKeyPairBytes.toString(CryptoJS.enc.Utf8);
          const rehydratedKeyPair = await Libp2pCryptoIdentity.fromString(decryptedKeyPairString);
          const testPubKey = rehydratedKeyPair.public.toString();
          console.log('keys match: ', testPubKey === data.data.pubKey);
          store.commit.authMod.KEYPAIR(rehydratedKeyPair);
          store.commit.authMod.JWT(data.data.jwt);
          store.commit.authMod.AUTHTYPE('password');
          // save a version of the key pair encrypted by the jwt in local storage in case we close the window
          const jwtEncryptedKeyPair = CryptoJS.AES.encrypt(
            decryptedKeyPairString,
            data.data.jwt
          ).toString();
          localStorage.setItem('EduVault_jwtEncryptedKeyPair', jwtEncryptedKeyPair);
          localStorage.setItem('EduVault_pubKey', data.data.pubKey);

          const loginCallback = loginWithChallenge(state);
          state.client = Client.withUserAuth(await loginCallback(), TEXTILE_API);
          state.threadId = ThreadID.fromRandom();
          console.log('stuck? 3');

          await state.client.newDB(state.threadId, 'DB');
          const afterCheck = await state.client.getDBInfo(state.threadId);
          console.log('afterCheck', afterCheck);

          await state.client.newCollection(state.threadId, 'Deck', deckSchema);

          router.push('/home');
          return 'success';
        }
      } catch (err) {
        console.log(err);
        if (
          err.response &&
          err.response.data &&
          err.response.data.data &&
          err.response.data.data.error
        )
          return err.response.data.data.error;
        else return 'Unable to connect to database';
      }
    },

    async logout({ state }: ActionContext<AuthState, RootState>) {
      const options = {
        url: state.API_URL + '/logout',
        method: 'GET',
        withCredentials: true,
      } as AxiosRequestConfig;
      axios(options);
      store.commit.authMod.JWT('');
      store.commit.authMod.PUBKEY('');
      store.commit.authMod.REMOVE_KEYPAIR();
      console.log('deleted keypair', state.keyPair);
      store.commit.authMod.LOGGEDIN(false);
      localStorage.setItem('EduVault_jwtEncryptedKeyPair', '');
      localStorage.setItem('EduVault_pubKey', '');
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
            // if we don't have localStorage we need to login
            const jwtEncryptedKeyPair = localStorage.getItem('EduVault_jwtEncryptedKeyPair');
            const storedPubKey = localStorage.getItem('EduVault_pubKey');
            if (
              !jwtEncryptedKeyPair ||
              jwtEncryptedKeyPair === '' ||
              !storedPubKey ||
              storedPubKey == ''
            ) {
              store.commit.authMod.LOGGEDIN(false);
              return false;
            } else {
              let jwt;
              if (!state.jwt || state.jwt === '') jwt = await store.dispatch.authMod.getJwt();
              else jwt = state.jwt;
              if (!jwt || jwt === '') {
                store.commit.authMod.LOGGEDIN(false);
                return false;
              }

              const decryptedKeyPairString = CryptoJS.AES.decrypt(
                jwtEncryptedKeyPair,
                jwt
              ).toString(CryptoJS.enc.Utf8);
              const rehydratedKeyPair = await Libp2pCryptoIdentity.fromString(
                decryptedKeyPairString
              );
              const testPubKey = rehydratedKeyPair.public.toString();
              const keysMatch = testPubKey === storedPubKey;
              console.log('rehydrate without login===keys match: ', keysMatch);
              if (!keysMatch) {
                store.commit.authMod.LOGGEDIN(false);
                return false;
              } else {
                store.commit.authMod.KEYPAIR(rehydratedKeyPair);
                store.commit.authMod.JWT(jwt);
                store.commit.authMod.PUBKEY(storedPubKey);
                store.commit.authMod.LOGGEDIN(true);
                return true;
              }
            }
          }
        } else {
          store.commit.authMod.LOGGEDIN(false);
          return false;
        }
      } catch {
        return false;
      }
    },
    async getJwt({ state }: ActionContext<AuthState, RootState>): Promise<string> {
      try {
        const options = {
          url: state.API_URL + '/get-jwt',
          headers: { 'Access-Control-Allow-Origin': '*' },
          method: 'GET',
          withCredentials: true,
        } as AxiosRequestConfig;
        const response = await axios(options);
        if (!response.data || !response.data.data || !response.data.data.jwt) return '';
        else return response.data.data.jwt;
      } catch (err) {
        console.log(err);
        return '';
      }
    },
    async getKeys({ state }: ActionContext<AuthState, RootState>) {
      const socket = new WebSocket(state.API_URL + '/ws/userauth');
      /** Wait for our socket to open successfully */
      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: 'keys-request',
          })
        );
      };
    },
  },
};
