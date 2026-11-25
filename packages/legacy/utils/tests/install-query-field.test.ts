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
  const entitiesField = () => {
    const entityUnion = new GraphQLUnionType({
      name: '_Entity',
      types: [
        new GraphQLObjectType({
          name: 'User',
          fields: { id: { type: GraphQLString } },
        }),
      ],
    });
    return {
      type: new GraphQLNonNull(new GraphQLList(entityUnion)),
      resolve: () => [],
    };
  };

  it('rewires Query self-references so schema.toConfig() stays valid', () => {
    const queryType: GraphQLObjectType = new GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        self: { type: queryType },
        hello: { type: GraphQLString },
      }),
    });
    let schema = new GraphQLSchema({ query: queryType });

    schema = installQueryField(schema, '_entities', entitiesField());

    expect(schema.getQueryType()?.getFields()._entities).toBeDefined();
    expect(schema.getQueryType()?.getFields().self.type).toBe(schema.getQueryType());
    expect(() => new GraphQLSchema(schema.toConfig())).not.toThrow();
  });

  it('rewires Query references from other types (Foo.query: Query)', () => {
    let queryType: GraphQLObjectType;
    let fooType: GraphQLObjectType;
    fooType = new GraphQLObjectType({
      name: 'Foo',
      fields: () => ({
        id: { type: GraphQLString },
        query: { type: queryType },
      }),
    });
    queryType = new GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        foo: { type: fooType },
        hello: { type: GraphQLString },
      }),
    });
    let schema = new GraphQLSchema({ query: queryType, types: [fooType] });

    schema = installQueryField(schema, '_entities', entitiesField());

    const query = schema.getQueryType()!;
    const foo = schema.getType('Foo') as GraphQLObjectType;
    expect(query.getFields()._entities).toBeDefined();
    expect(foo.getFields().query.type).toBe(query);
    expect(query.getFields().foo.type).toBe(foo);
    expect(() => new GraphQLSchema(schema.toConfig())).not.toThrow();
  });
});
