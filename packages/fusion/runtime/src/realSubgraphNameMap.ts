import { GraphQLSchema, isEnumType } from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';

/**
 * Map `join__Graph` enum value names → real subgraph names from `@join__graph`.
 */
export function getRealSubgraphNameMap(schema: GraphQLSchema): Map<string, string> {
  const realSubgraphNameMap = new Map<string, string>();
  const joinGraph = schema.getType('join__Graph');
  if (!isEnumType(joinGraph)) {
    return realSubgraphNameMap;
  }
  for (const enumValue of joinGraph.getValues()) {
    const enumValueDirectives = getDirectiveExtensions<{
      join__graph: { name: string };
    }>(enumValue, schema);
    const joinGraphDirectives = enumValueDirectives?.join__graph;
    if (!joinGraphDirectives?.length) {
      continue;
    }
    for (const joinGraphDirective of joinGraphDirectives) {
      if (joinGraphDirective?.name) {
        realSubgraphNameMap.set(enumValue.name, joinGraphDirective.name);
      }
    }
  }
  return realSubgraphNameMap;
}
