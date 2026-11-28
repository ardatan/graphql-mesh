import type { GraphQLSchema } from 'graphql';
import { installRootProxyingResolvers } from './rootProxyingResolvers.js';

/**
 * Install shared root proxies that call {@link backboneExecutor}
 * (pass `info.schema` or omit). Does not store a per-schema Executor.
 */
export function attachBackboneExecutor(schema: GraphQLSchema): GraphQLSchema {
  installRootProxyingResolvers(schema);
  return schema;
}
