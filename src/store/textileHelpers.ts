import { UserAuth } from '@textile/hub';
import { AuthState } from '../types';
import { Libp2pCryptoIdentity } from '@textile/threads-core';
import { Buffer } from 'buffer';

/** we should have different forms of getting the Textile userAuth,
 * 1. crypto wallet: ask crypto wallet to sign
 * 2. oauth: on log in, get the keypair encrypted by PIN and store in localStorage, challeng user with PIN, and keep the unencrypted keypair in app storage to keep signing
 * 3. password account: same as 2, but the server is storing only encrypted keypair, encryped by password. both 2 and 3 need to keep the plaintext public key for recovery
 */
const loginWithChallenge = (state: AuthState): (() => Promise<UserAuth>) => {
  // we pass identity into the function returning function to make it
  // available later in the callback
  return () => {
    return new Promise((resolve, reject) => {
      /** Initialize our websocket connection */
      console.log('state.API_WS_URL + /ws/auth', state.API_WS_URL + '/ws/auth');
      const socket = new WebSocket(state.API_WS_URL + '/ws/auth');
      /** Wait for our socket to open successfully */
      socket.onopen = () => {
        console.log('opened');
        socket.send(
          JSON.stringify({
            type: 'token-request',
            jwt: state.jwt,
          })
        );

        /** Listen for messages from the server */
        socket.onmessage = async msg => {
          const data = JSON.parse(msg.data);
          console.log('=================wss message===================', data);

          switch (data.type) {
            case 'error': {
              reject(data.value);
              break;
            }
            /** The server issued a new challenge */
            case 'challenge-request': {
              /** Convert the challenge json to a Buffer */
              const buf = Buffer.from(data.value);
              /** User our identity to sign the challenge */
              let keyPair: Libp2pCryptoIdentity;
              if (!state.keyPair) throw 'no keypair';
              else keyPair = state.keyPair;
              const signed = await keyPair.sign(buf);
              /** Send the signed challenge back to the server */
              socket.send(
                JSON.stringify({
                  type: 'challenge-response',
                  jwt: state.jwt,
                  signature: Buffer.from(signed).toJSON(),
                })
              );
              break;
            }
            /** New token generated */
            case 'token-response': {
              resolve(data.value);
              break;
            }
          }
        };
      };
    });
  };
};

export { loginWithChallenge };
