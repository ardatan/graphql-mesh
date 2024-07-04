---
'@graphql-mesh/transport-common': minor
---

Define transports using a default export satisfying the `Transport` generic

For example, a custom http transport implementation looks like this:

```ts
// http-transport.ts

import { Transport } from '@graphql-mesh/transport-common';

export interface HTTPTransportOptions {
  cache?: boolean;
}

export default {
  getSubgraphExecutor(opts) {
    // <the implementation of your executor getter>
  },
} satisfies Transport<'http', HTTPTransportOptions>;
```

and is used for Mesh serve like this:

```ts
// mesh.config.ts

import { defineConfig } from '@graphql-mesh/serve-cli';

export const serveConfig = defineConfig({
  transport: {
    http: import('./http-transport'),
  },
});
```

or like this:

```ts
// mesh.config.ts

import { defineConfig } from '@graphql-mesh/serve-cli';
import httpTransport from './http-transport';

export const serveConfig = defineConfig({
  transport: {
    http: httpTransport,
  },
});
```
