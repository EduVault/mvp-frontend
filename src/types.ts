import { Libp2pCryptoIdentity } from '@textile/threads-core';

export interface Card {
  _id: string;
  frontText: string;
  backText: string;
}
export interface Deck {
  _id: string;
  cards: Card[];
  title: string;
}

export interface EditCardPayload {
  frontText: string;
  backText: string;
  deckTitle: string;
  _id: string;
}
export interface DeleteCardPayload {
  _id: string;
  deckTitle: string;
}
export interface AuthState {
  API_URL: string;
  PASSWORD_SIGNUP: string;
  PASSWORD_LOGIN: string;
  loggedIn: null | boolean;
  keyPair: Libp2pCryptoIdentity;
  authType: 'google' | 'facebook' | 'password' | null;
}
export interface DecksState {
  decks: Deck[];
}
export interface State {
  authMod: AuthState;
  decksMod: DecksState;
}

export interface ApiRes<T> {
  data: T;
  code: number;
  message: string;
}
export interface PasswordRes {
  username: string;
  _id: string;
  token: string;
}
