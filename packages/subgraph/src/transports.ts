import type { GraphQLSchema } from 'graphql';
import type { Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import {
  createDefaultExecutor,
  type Transport,
  type TransportContext,
  type TransportEntry,
} from '@graphql-mesh/transport-common';
import { processDirectives } from '@graphql-mesh/transport-connect';
import type { KeyValueCache, MeshFetch } from '@graphql-mesh/types';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export type TransportsOption =
  | {
      [key: string]: MaybePromise<Transport | { default: Transport }>;
    }
  | ((kind: string) => MaybePromise<Transport | { default: Transport }>);

function defaultTransportsGetter(kind: string): MaybePromise<Transport> {
  const moduleName = `@graphql-mesh/transport-${kind}`;
  return handleMaybePromise(
    () => import(moduleName),
    transport => {
      if (!transport) {
        throw new Error(`${moduleName} module is empty`);
      }
      let current: any = transport;
      while (current && !current.getSubgraphExecutor && current.default) {
        current = current.default;
      }
      if (!current?.getSubgraphExecutor) {
        throw new Error(`${moduleName} module does not export "getSubgraphExecutor"`);
      }
      return current as Transport;
    },
  );
}

function unwrapTransport(transport: Transport | { default: Transport }): Transport {
  let current: any = transport;
  while (current && !current.getSubgraphExecutor && current.default) {
    current = current.default;
  }
  return current as Transport;
}

/**
 * Read `@transport(kind, subgraph, location, ...)` from schema extensions.
 * Bare Connectors subgraphs may omit `@transport` (Gateway infers `connect`).
 */
export function getTransportEntryFromSchema(schema: GraphQLSchema): TransportEntry | undefined {
  const directives = getDirectiveExtensions(schema);
  const transportDirs = directives?.transport;
  if (!Array.isArray(transportDirs) || !transportDirs.length) {
    return undefined;
  }
  const first = transportDirs[0] as Partial<TransportEntry>;
  if (!first || typeof first !== 'object') {
    return undefined;
  }
  return {
    kind: first.kind || 'connect',
    subgraph: first.subgraph || '',
    location: first.location,
    headers: first.headers,
    options: first.options,
  };
}

function schemaHasConnectDirectives(schema: GraphQLSchema): boolean {
  const schemaDirs = getDirectiveExtensions(schema);
  if (schemaDirs?.source?.length || schemaDirs?.connect?.length) {
    return true;
  }
  for (const type of Object.values(schema.getTypeMap())) {
    if (!('getFields' in type)) continue;
    for (const field of Object.values(type.getFields())) {
      const dirs = (field.extensions as any)?.directives;
      if (dirs?.connect?.length) {
        return true;
      }
      if (field.astNode?.directives?.some(d => d.name.value === 'connect')) {
        return true;
      }
    }
    const typeDirs = (type.extensions as any)?.directives;
    if (typeDirs?.connect?.length) {
      return true;
    }
  }
  return schema.getDirective('connect') != null;
}

export interface ApplyTransportOptions {
  fetch?: MeshFetch;
  log?: Logger;
  pubsub?: PubSub;
  cwd?: string;
  cache?: KeyValueCache;
  transports?: TransportsOption;
}

/**
 * Wire Mesh transport directives into an executable schema.
 *
 * - `connect` (or bare `@connect` / `@source` with no `@transport`): use
 *   `processDirectives` so field resolvers live on the schema.
 * - Other kinds: load `@graphql-mesh/transport-<kind>`, run
 *   `getSubgraphExecutor`, then `wrapSchema` so the result is still a
 *   `GraphQLSchema` any GraphQL server can host.
 */
export function applyTransportExecution(
  schema: GraphQLSchema,
  options: ApplyTransportOptions = {},
): MaybePromise<GraphQLSchema> {
  const entry = getTransportEntryFromSchema(schema);
  const kind = entry?.kind || (schemaHasConnectDirectives(schema) ? 'connect' : undefined);

  if (!kind) {
    // No transport / connect annotations: return schema as-is (manual resolvers only).
    return schema;
  }

  if (kind === 'connect') {
    return processDirectives(schema, {
      globalFetch: options.fetch,
      log: options.log,
      pubsub: options.pubsub,
      ...(entry?.options || {}),
    });
  }

  const transportEntry: TransportEntry = entry || {
    kind,
    subgraph: '',
  };

  const transports = options.transports || defaultTransportsGetter;
  const transportContext: TransportContext = {
    log: options.log as Logger,
    fetch: options.fetch,
    cwd: options.cwd,
    pubsub: options.pubsub,
    cache: options.cache,
  };

  return handleMaybePromise(
    () => (typeof transports === 'function' ? transports(kind) : transports[kind]),
    loaded => {
      if (!loaded) {
        throw new Error(`Transport "${kind}" is empty`);
      }
      const transport = unwrapTransport(loaded);
      if (!transport.getSubgraphExecutor) {
        throw new Error(`Transport "${kind}" does not have "getSubgraphExecutor"`);
      }

      const getTransportExecutor = (nestedEntry: TransportEntry) =>
        handleMaybePromise(
          () =>
            typeof transports === 'function'
              ? transports(nestedEntry.kind)
              : transports[nestedEntry.kind],
          nestedLoaded => {
            const nested = unwrapTransport(nestedLoaded);
            return nested.getSubgraphExecutor({
              subgraphName: nestedEntry.subgraph || '',
              transportEntry: nestedEntry,
              subgraph: schema,
              getTransportExecutor,
              ...transportContext,
              log: transportContext.log,
            });
          },
        );

      return handleMaybePromise(
        () =>
          transport.getSubgraphExecutor({
            subgraphName: transportEntry.subgraph || '',
            transportEntry,
            subgraph: schema,
            getTransportExecutor,
            ...transportContext,
            log: transportContext.log,
          }),
        executor =>
          wrapSchema({
            schema,
            executor: executor || createDefaultExecutor(schema),
          }),
      );
    },
  );
}
