import { Libp2pCryptoIdentity } from '@textile/threads-core';
import { Client, Database, Collection, ThreadID } from '@textile/hub';
import { JSONSchema } from '@textile/threads-database';
// import { DBInfo } from '@textile/threads';

/** @param ttl Time To Live. Please set at now plus 1.5e10 (half year)  Unix epoch date at which can we safely delete the card without worrying about sync issues */
export interface Card {
  _id: string;
  frontText: string;
  backText: string;
  updatedAt: number;
  deleted?: boolean;
  ttl?: number;
}

/** @param ttl Time To Live. Please set at now plus 1.5e10 (half year)  Unix epoch date at which can we safely delete the card without worrying about sync issues */
export interface Deck {
  _id: string;
  cards: Card[];
  title: string;
  updatedAt: number;
  deleted?: boolean;
  ttl?: number;
}
export const deckSchema: JSONSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  id: 'https://github.com/Jewcub/textile-app',
  title: 'Deck',
  type: 'object',
  required: ['_id'],

  definitions: {
    card: {
      title: 'Card',
      type: 'object',
      properties: {
        _id: { type: 'string' },
        frontText: { type: 'string' },
        backText: { type: 'string' },
        updatedAt: { type: 'integer' },
      },
    },
  },
  properties: {
    _id: { type: 'string' },
    title: { type: 'string' },
    updatedAt: { type: 'integer' },
    cards: {
      type: 'array',
      items: { $ref: '#/definitions/card' },
      default: [],
    },
  },
};

export interface EditCardPayload {
  card: Card;
  deckId: string;
}
export interface DeleteCardPayload {
  _id: string;
  deckId: string;
}
export interface AuthState {
  API_URL: string;
  API_WS_URL: string;
  PASSWORD_SIGNUP: string;
  PASSWORD_LOGIN: string;
  loggedIn: boolean;
  keyPair: Libp2pCryptoIdentity;
  authType: 'google' | 'facebook' | 'password' | undefined;
  jwt: string | undefined;
  pubKey: string | undefined;
  threadID: ThreadID;
  // deckCollection: Collection<Deck>;
  // db: Database;
  // DbInfo: DBInfo;
}
export interface DecksState {
  decks: Deck[];
  client: Client;
  deckCollection: Collection<Deck>;
  backlog?: Deck[];
}
export interface RootState {
  authMod: AuthState;
  decksMod: DecksState;
}

// export interface ApiRes<T> {
//   data: T;
//   code: number;
//   message: string;
// }
// export interface PasswordRes {
//   username: string;
//   _id: string;
//   token: string;
// }
