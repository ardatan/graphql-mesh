require('json-bigint-patch');
// Needed only for Jest
const { patchSymbols } = require('@whatwg-node/disposablestack');
patchSymbols();

// Yoga / gateway-runtime still read `fetchAPI.crypto` for request ids.
// @whatwg-node/fetch >=0.12 no longer exports it — use the platform crypto.
const whatwgFetch = require('@whatwg-node/fetch');
if (whatwgFetch && whatwgFetch.crypto == null) {
  Object.defineProperty(whatwgFetch, 'crypto', {
    value: globalThis.crypto,
    configurable: true,
    enumerable: true,
  });
}
