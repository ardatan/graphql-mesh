import type { GraphQLNamedType } from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import type { DirectiveArgsMap } from '../directives.js';

/**
 * `@entityInfo` is stripped from composed SDL (Connectors replace it) but kept on
 * `extensions.odataEntityInfo` for in-process Mesh resolvers.
 */
export function getEntityInfo(type: GraphQLNamedType | null | undefined) {
  if (!type) {
    return undefined;
  }
  const fromDirective = getDirectiveExtensions<DirectiveArgsMap>(type)?.entityInfo?.[0];
  if (fromDirective) {
    return fromDirective;
  }
  return (type.extensions as { odataEntityInfo?: DirectiveArgsMap['entityInfo'] } | undefined)
    ?.odataEntityInfo;
}
