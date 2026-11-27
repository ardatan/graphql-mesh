import type { Transport } from '@graphql-mesh/transport-common';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

/**
 * Map or getter used to load a transport package by `kind`
 * (`@graphql-mesh/transport-<kind>` by default).
 */
export type TransportsOption =
  | {
      [key: string]: MaybePromise<Transport | { default: Transport }>;
    }
  | ((kind: string) => MaybePromise<Transport | { default: Transport }>);

/**
 * Unwrap nested `default` exports until `getSubgraphExecutor` is found.
 * Node (and some bundlers) sometimes nest `default` multiple times.
 */
export function unwrapTransport(
  transport: Transport | { default: Transport } | Record<string, any>,
): Transport {
  let current: any = transport;
  while (current && !current.getSubgraphExecutor && current.default) {
    current = current.default;
  }
  return current as Transport;
}

/**
 * Default transport loader: dynamic-import `@graphql-mesh/transport-${kind}`
 * and return the unwrapped `Transport` export.
 */
export function defaultTransportsGetter(kind: string): MaybePromise<Transport> {
  const moduleName = `@graphql-mesh/transport-${kind}`;
  return handleMaybePromise(
    () => import(moduleName),
    transport => {
      if (!transport) {
        throw new Error(`${moduleName} module is empty`);
      }
      if (typeof transport !== 'object') {
        throw new Error(`${moduleName} module does not export an object`);
      }
      const unwrapped = unwrapTransport(transport);
      if (!unwrapped?.getSubgraphExecutor) {
        throw new Error(`${moduleName} module does not export "getSubgraphExecutor"`);
      }
      if (typeof unwrapped.getSubgraphExecutor !== 'function') {
        throw new Error(`${moduleName} module's export "getSubgraphExecutor" is not a function`);
      }
      return unwrapped;
    },
  );
}
