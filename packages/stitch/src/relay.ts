import { isInterfaceType, Kind, type GraphQLResolveInfo } from 'graphql';
import { type MergedTypeConfig, type SubschemaConfig } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';

const defaultRelayMergeConfig: MergedTypeConfig = {
  selectionSet: `{ id }`,
  fieldName: 'node',
  args: ({ id }: any) => ({ id }),
};

export function handleRelaySubschemas(
  subschemas: SubschemaConfig[],
  getTypeNameFromId?: (id: string) => string,
) {
  const typeNames: string[] = [];

  for (const subschema of subschemas) {
    const nodeType = subschema.schema.getType('Node');
    if (nodeType) {
      if (!isInterfaceType(nodeType)) {
        throw new Error(`Node type should be an interface!`);
      }
      const implementations = subschema.schema.getPossibleTypes(nodeType);
      for (const implementedType of implementations) {
        typeNames.push(implementedType.name);

        subschema.merge = subschema.merge || {};
        subschema.merge[implementedType.name] = defaultRelayMergeConfig;
      }
    }
  }

  const relaySubschemaConfig: SubschemaConfig = {
    schema: makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          node(id: ID!): Node
        }
        interface Node {
          id: ID!
        }
        ${typeNames
          .map(
            typeName => `
          type ${typeName} implements Node {
            id: ID!
          }
        `,
          )
          .join('\n')}
      `,
      resolvers: {
        Query: {
          node: (_, { id }) => ({ id }),
        },
        Node: {
          __resolveType: ({ id }: { id: string }, _: any, info: GraphQLResolveInfo) => {
            if (!getTypeNameFromId) {
              const possibleTypeNames = new Set<string>();
              for (const fieldNode of info.fieldNodes) {
                if (fieldNode.selectionSet?.selections) {
                  for (const selection of fieldNode.selectionSet?.selections || []) {
                    switch (selection.kind) {
                      case Kind.FRAGMENT_SPREAD: {
                        const fragment = info.fragments[selection.name.value];
                        if (!fragment) {
                          throw new Error(`Cannot find fragment ${selection.name.value}`);
                        }
                        possibleTypeNames.add(fragment.typeCondition.name.value);
                        break;
                      }
                      case Kind.INLINE_FRAGMENT: {
                        const possibleTypeName = selection.typeCondition?.name.value;
                        if (possibleTypeName) {
                          possibleTypeNames.add(possibleTypeName);
                        }
                        break;
                      }
                    }
                  }
                }
              }
              // Fragment conditions may include interfaces such as Node; only
              // concrete implementations of Node are valid __resolveType results.
              const concreteTypeNames = [...possibleTypeNames].filter(name =>
                typeNames.includes(name),
              );
              if (concreteTypeNames.length === 1) {
                return concreteTypeNames[0];
              }
              console.warn(
                `You need to define getTypeNameFromId as a parameter to handleRelaySubschemas or add a fragment for "node" operation with specific single type condition!`,
              );
              // Multiple (or zero) concrete types remain: require getTypeNameFromId
              // rather than guessing from the first fragment condition.
              return typeNames[0];
            }
            return getTypeNameFromId(id);
          },
        },
      },
    }),
  };

  subschemas.push(relaySubschemaConfig);
  return subschemas;
}
