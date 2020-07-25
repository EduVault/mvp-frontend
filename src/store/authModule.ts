import { AuthState, State } from '../types';
import { ActionContext } from 'vuex';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import store from '../store';
// import router from '../router';
import { ApiRes } from '../types';
import { Buffer } from 'buffer';
import router from '@/router';

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
  },
  actions: {
    async passwordAuth(
      { state }: ActionContext<AuthState, State>,
      payload: { password: string; username: string; type: 'login' | 'signup' }
    ) {
      try {
        const response = await axios({
          url:
            payload.type === 'signup'
              ? state.API_URL + state.PASSWORD_SIGNUP
              : state.API_URL + state.PASSWORD_LOGIN,
          withCredentials: true,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          method: 'POST',
          data: {
            username: payload.username,
            password: payload.password,
          },
        });
        const data = response.data;
        // console.log('response.data', response.data);
        if (data.code !== 200) {
          if (data.message) return data.message;
          else return 'Unable to connect to database';
        } else {
          router.push('/home');
          store.commit.authMod.AUTHTYPE('password');
          return 'success';
        }
      } catch {
        return 'Unable to connect to database';
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
  },
};
