/**
 * Optional ambient types for dynamic `import('@graphql-mesh/transport-connect')`.
 * Runtime does not depend on that package; openapi/json-schema/odata pull it in
 * when Connect is used. Reprocess after `additionalTypeDefs` is a no-op when absent.
 */
declare module '@graphql-mesh/transport-connect' {
  import type { GraphQLSchema } from 'graphql';
  export function processDirectives(
    schema: GraphQLSchema,
    opts?: {
      globalFetch?: unknown;
      pubsub?: unknown;
      log?: unknown;
      preserveExistingFieldResolvers?: boolean;
    },
  ): GraphQLSchema;
}
