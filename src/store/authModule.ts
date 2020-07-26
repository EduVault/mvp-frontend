import { AuthState, State } from '../types';
import { ActionContext } from 'vuex';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import store from '../store';
// import router from '../router';
import { ApiRes } from '../types';
import { Buffer } from 'buffer';
import router from '@/router';
import { Libp2pCryptoIdentity } from '@textile/threads-core';
import CryptoJS from 'crypto-js';

export default {
  namespaced: true as true,
  state: {
    authType: null,
    loggedIn: null,
    API_URL:
      process.env.NODE_ENV === 'production' || process.env.VUE_APP_NODE_ENV === 'production'
        ? process.env.VUE_APP_API_URL
        : process.env.VUE_APP_DEV_API_URL,
    PASSWORD_SIGNUP: process.env.VUE_APP_PASSWORD_SIGNUP,
    PASSWORD_LOGIN: process.env.VUE_APP_PASSWORD_LOGIN,
  } as AuthState,
  getters: {
    loggedIn(state: AuthState) {
      return state.loggedIn;
    },
  },
  mutations: {
    AUTHTYPE(state: AuthState, type: 'google' | 'facebook' | 'password' | null) {
      state.authType = type;
    },
    LOGGEDIN(state: AuthState, bool: boolean) {
      state.loggedIn = bool;
    },
    KEYPAIR(state: AuthState, keyPair: Libp2pCryptoIdentity) {
      state.keyPair = keyPair;
    },
  },
  actions: {
    async passwordAuth(
      { state }: ActionContext<AuthState, State>,
      payload: { password: string; username: string; signup: boolean }
    ) {
      console.log(payload.signup);
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
        console.log(options);
        if (payload.signup) {
          const keyPair = await Libp2pCryptoIdentity.fromRandom();
          const pubKey = keyPair.public.toString();
          const encryptedKeyPair = CryptoJS.AES.encrypt(
            keyPair.toString(),
            payload.password
          ).toString();

          options.data.encryptedKeyPair = encryptedKeyPair;
          options.data.pubKey = pubKey;
          options.url = state.API_URL + state.PASSWORD_SIGNUP;
          console.log(pubKey);
        } else options.url = options.url = state.API_URL + state.PASSWORD_LOGIN;
        console.log(options);
        const response = await axios(options);
        console.log('response', response);
        const data = response.data;
        console.log('response.data', response.data);
        if (data.code !== 200) {
          if (data.message) return data.message;
          else return 'Unable to connect to database';
        } else {
          console.log('data.data', data.data);
          const decryptedKeyPairBytes = CryptoJS.AES.decrypt(
            data.data.encryptedKeyPair,
            payload.password
          );
          const decryptedKeyPairString = decryptedKeyPairBytes.toString(CryptoJS.enc.Utf8);
          const rehydratedKeyPair = await Libp2pCryptoIdentity.fromString(decryptedKeyPairString);
          const testPubKey = rehydratedKeyPair.public.toString();
          console.log('keys match: ', testPubKey === options.data.pubKey);
          store.commit.authMod.KEYPAIR(rehydratedKeyPair);
          store.commit.authMod.AUTHTYPE('password');
          router.push('/home');
          return 'success';
        }
      } catch (err) {
        console.log(err);
        if (err.response && err.response.data && err.response.data.data)
          return err.response.data.data;
        else return 'Unable to connect to database';
      }
    },

    async logout({ state }: ActionContext<AuthState, State>) {
      const options = {
        url: state.API_URL + '/logout',
        method: 'GET',
        withCredentials: true,
      } as AxiosRequestConfig;
      axios(options);
    },
    async checkAuth({ state }: ActionContext<AuthState, State>) {
      try {
        const options = {
          url: state.API_URL + '/auth-check',
          headers: { 'Access-Control-Allow-Origin': '*' },
          method: 'GET',
          withCredentials: true,
        } as AxiosRequestConfig;

        const authCheck = await axios(options);
        console.log('authcheck', authCheck);

        if (authCheck.data.code == 200) {
          store.commit.authMod.LOGGEDIN(true);
          return true;
        } else {
          store.commit.authMod.LOGGEDIN(false);
          return false;
        }
      } catch {
        return false;
      }
    },
    async getKeys({ state }: ActionContext<AuthState, State>) {
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
    /** we should have different forms of getting the Textile userAuth,
     * 1. crypto wallet: ask crypto wallet to sign
     * 2. oauth: on log in, get the keypair encrypted by PIN and store in localStorage, challeng user with PIN, and keep the unencrypted keypair in app storage to keep signing
     * 3. password account: same as 2, but the server is storing only encrypted keypair, encryped by password. both 2 and 3 need to keep the plaintext public key for recovery
     */
    async loginWithChallenge({ state }: ActionContext<AuthState, State>) {
      // we pass identity into the function returning function to make it
      // available later in the callback
      return () => {
        return new Promise((resolve, reject) => {
          /** Initialize our websocket connection */
          const socket = new WebSocket(state.API_URL + '/ws/userauth');
          /** Wait for our socket to open successfully */
          socket.onopen = () => {
            socket.send(
              JSON.stringify({
                type: 'token-request',
              })
            );

            /** Listen for messages from the server */
            socket.onmessage = async event => {
              const data = JSON.parse(event.data);
              switch (data.type) {
                case 'error': {
                  reject(data.value);
                  break;
                }
                /** The server issued a new challenge */
                case 'challenge': {
                  /** Convert the challenge json to a Buffer */
                  const buf = Buffer.from(data.value);
                  /** User our identity to sign the challenge */
                  const signed = await state.keyPair.sign(buf);
                  /** Send the signed challenge back to the server */
                  socket.send(
                    JSON.stringify({
                      type: 'challenge',
                      sig: Buffer.from(signed).toJSON(),
                    })
                  );
                  break;
                }
                /** New token generated */
                case 'token': {
                  resolve(data.value);
                  break;
                }
              }
            };
          };
        });
      };
    },
  },
};
