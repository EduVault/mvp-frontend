full flow of encrypting/decrypting ID key pairs

```js
const keyPair = await Libp2pCryptoIdentity.fromRandom();
const pubKey = keyPair.public.toString();
const encrypedKeyPair = CryptoJS.AES.encrypt(keyPair.toString(), payload.password);
const encrypedKeyPairString = CryptoJS.AES.encrypt(keyPair.toString(), payload.password).toString();
// can decrypt from the object or the string
const decryptedKeyPairBytes = CryptoJS.AES.decrypt(
  encrypedKeyPair | encrypedKeyPairString,
  payload.password
);
const decryptedKeyPairString = decryptedKeyPairBytes.toString(CryptoJS.enc.Utf8);
const rehydratedKeyPair = await Libp2pCryptoIdentity.fromString(decryptedKeyPairString);
const testPubKey = rehydratedKeyPair.public.toString();
console.log(testPubKey === pubKey);
```
