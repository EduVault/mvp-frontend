import { AuthState, State } from '../types';
import { ActionContext } from 'vuex';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import store from '../store';
// import router from '../router';
import { ApiRes, PasswordRes } from '../types';

export default {
  namespaced: true as true,
  state: {
    authType: null,
    API_URL:
      process.env.NODE_ENV === 'production' || process.env.VUE_APP_NODE_ENV === 'production'
        ? process.env.VUE_APP_API_URL
        : process.env.VUE_APP_DEV_API_URL,
    PASSWORD_SIGNUP: process.env.VUE_APP_PASSWORD_SIGNUP,
    PASSWORD_LOGIN: process.env.VUE_APP_PASSWORD_LOGIN,
    VERIFY_JWT: process.env.VUE_APP_VERIFY_JWT,
  } as AuthState,
  getters: {
    jwtNotExpired(state: AuthState) {
      const jwt = state.jwt;
      if (!jwt || jwt.split('.').length < 3) {
        return false;
      } else {
        const data = JSON.parse(atob(jwt.split('.')[1]));
        const exp = new Date(data.exp * 1000);
        const now = new Date();
        return (now < exp) as boolean;
      }
    },
  },
  mutations: {
    JWT(state: AuthState, jwt: string | null) {
      state.jwt = jwt;
    },
    AUTHTYPE(state: AuthState, type: 'google' | 'facebook' | 'password' | null) {
      state.authType = type;
    },
  },
  actions: {
    async callAPI<T>(
      { state }: ActionContext<AuthState, State>,
      payload: {
        path: string;
        headers: HeadersInit;
        method: string;
        data: object | null;
      }
    ) {
      const options = {
        url: state.API_URL + payload.path,
        headers: payload.headers,
        method: payload.method,
        data: payload.data,
      } as AxiosRequestConfig;
      if (payload.data) {
        options.data = payload.data;
      }
      // console.log('calling API, options', options);
      try {
        const response = await axios(options);
        return response as AxiosResponse<ApiRes<T>>;
      } catch (error) {
        return error.response as AxiosResponse<ApiRes<T>>;
      }
    },
    async passwordSignup(
      { state }: ActionContext<AuthState, State>,
      payload: { password: string; username: string }
    ) {
      const headers = {
        'Content-Type': 'application/json',
      } as HeadersInit;
      try {
        const response = (await store.dispatch.authMod.callAPI({
          path: state.PASSWORD_SIGNUP,
          headers: headers,
          method: 'POST',
          data: {
            username: payload.username,
            password: payload.password,
          },
        })) as AxiosResponse<ApiRes<PasswordRes>>;
        response.data.data.token;
        if (!response.data.data.token) {
          if (response.data.message) return response.data.message;
          else return 'Unable to connect to database';
        } else {
          // console.log('response.data.data.token', response.data.data.token);
          store.commit.authMod.JWT(response.data.data.token);
          store.commit.authMod.AUTHTYPE('password');
          store.dispatch.authMod.verifyJwt();
          return 'success';
        }
      } catch {
        return 'Unable to connect to database';
      }
    },
    async verifyJwt({ state }: ActionContext<AuthState, State>) {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'bearer ' + state.jwt,
      } as HeadersInit;
      try {
        const response = await store.dispatch.authMod.callAPI({
          path: state.VERIFY_JWT,
          headers: headers,
          method: 'GET',
          data: null,
        });
        if (response.status == 200) return true;
        else return false;
      } catch {
        return false;
      }
    },
    async passwordLogin(
      { state }: ActionContext<AuthState, State>,
      payload: { password: string; username: string }
    ) {
      const headers = {
        'Content-Type': 'application/json',
      } as HeadersInit;
      try {
        const response = (await store.dispatch.authMod.callAPI({
          path: state.PASSWORD_LOGIN,
          headers: headers,
          method: 'POST',
          data: {
            username: payload.username,
            password: payload.password,
          },
        })) as AxiosResponse<ApiRes<PasswordRes>>;
        if (!response.data.data.token) {
          if (response.data.message) return response.data.message;
          else return 'Unable to connect to database';
        } else {
          // console.log('response.data.data.token', response.data.data.token);

          store.commit.authMod.JWT(response.data.data.token);
          return 'success';
        }
      } catch {
        return 'Unable to connect to database';
      }
    },
    // payload: {
    //   googleGivenName?: string;
    //   googleFamilyName?: string;
    //   googleImageUrl?: string;
    //   googleEmail: string;
    //   googleIdToken: string;
    // }
    async googleLogin({ state }: ActionContext<AuthState, State>, googleIdToken: string) {
      try {
        const options = {
          url: state.API_URL + '/auth/google',
          method: 'GET',
        } as AxiosRequestConfig;
        // console.log(options);
        const result = await axios(options);
        // console.log(result);
        // send token to backend, get jwt back
      } catch (err) {
        // throw err;
        console.log(err);
      }
    },
  },
};
