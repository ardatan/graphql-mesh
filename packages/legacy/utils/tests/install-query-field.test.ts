import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
} from 'graphql';
import { installQueryField } from '../src/install-query-field';

describe('installQueryField', () => {
  it('rewires Query self-references so schema.toConfig() stays valid', () => {
    const queryType: GraphQLObjectType = new GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        self: { type: queryType },
        hello: { type: GraphQLString },
      }),
    });
    const schema = new GraphQLSchema({ query: queryType });

    const entityUnion = new GraphQLUnionType({
      name: '_Entity',
      types: [
        new GraphQLObjectType({
          name: 'User',
          fields: { id: { type: GraphQLString } },
        }),
      ],
    });

    installQueryField(schema, '_entities', {
      type: new GraphQLNonNull(new GraphQLList(entityUnion)),
      resolve: () => [],
    });

    expect(schema.getQueryType()?.getFields()._entities).toBeDefined();
    expect(schema.getQueryType()?.getFields().self.type).toBe(schema.getQueryType());
    // Must not throw: duplicate Query types from unrewired self-refs.
    expect(() => new GraphQLSchema(schema.toConfig())).not.toThrow();
  });
});
