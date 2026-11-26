import { buildSchema, GraphQLSchema, isIntrospectionType } from 'graphql';
import { omitIntrospectionTypes } from '../src/omit-introspection-types';

describe('omitIntrospectionTypes', () => {
  it('strips introspection types from toConfig().types so GraphQLSchema rebuilds', () => {
    const schema = buildSchema(`type Query { hello: String }`);
    const config = schema.toConfig();
    expect(config.types.some(t => t.name.startsWith('__'))).toBe(true);

    const types = omitIntrospectionTypes(config.types);
    expect(types.every(t => !t.name.startsWith('__'))).toBe(true);
    expect(types.every(t => !isIntrospectionType(t))).toBe(true);

    const rebuilt = new GraphQLSchema({ ...config, types });
    expect(rebuilt.getQueryType()?.name).toBe('Query');
    expect(rebuilt.getType('__Schema')).toBeDefined();
  });
});
