const STORAGE_KEY = 'sourcelink';
const DEV_API_URL = 'localhost:3003';
const API_URL = 'https://eduvault.herokuapp.com';
const PASSWORD_LOGIN = '/auth/local-login';
const PASSWORD_SIGNUP = '/auth/local-signup';
const VERIFY_JWT = '/verify-jwt';
const FACEBOOK_AUTH = '/auth/facebook';
const GOOGLE_AUTH = '/auth/google';
const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://thirsty-ardinghelli-577c63.netlify.app'
    : 'localhost:8080';
export {
  STORAGE_KEY,
  DEV_API_URL,
  API_URL,
  PASSWORD_LOGIN,
  PASSWORD_SIGNUP,
  VERIFY_JWT,
  FACEBOOK_AUTH,
  GOOGLE_AUTH,
  BASE_URL,
};
