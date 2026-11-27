const { GraphQLObjectType } = require('graphql');
const { mapSchema, MapperKind } = require('@graphql-tools/utils');

/**
 * GitHub's root Query implements Node. Under federation that lets any Node
 * field (and relay: Query!) reach sibling subgraph Query fields without a
 * Query @key. Drop the interface so Geo + Github can compose.
 */
module.exports = class StripQueryNodeInterface {
  transformSchema(schema) {
    return mapSchema(schema, {
      [MapperKind.OBJECT_TYPE](type) {
        if (type.name !== 'Query' || type.getInterfaces().length === 0) {
          return undefined;
        }
        const config = type.toConfig();
        return new GraphQLObjectType({
          ...config,
          interfaces: [],
          isTypeOf: undefined,
        });
      },
    });
  }
};
