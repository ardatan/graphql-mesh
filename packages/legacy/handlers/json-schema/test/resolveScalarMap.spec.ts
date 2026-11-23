import { GraphQLID, GraphQLString } from 'graphql';
import { GraphQLDate, GraphQLURL } from 'graphql-scalars';
import { resolveScalarMap } from '../src/resolveScalarMap.js';

describe('resolveScalarMap (YAML type-name strings)', () => {
  it('resolves ID / Date / URL names used in .meshrc.yml', () => {
    const map = resolveScalarMap({
      id: 'ID',
      oid: 'ID',
      date: 'Date',
      url: 'URL',
      string: 'String',
    });
    expect(map).toEqual({
      id: GraphQLID,
      oid: GraphQLID,
      date: GraphQLDate,
      url: GraphQLURL,
      string: GraphQLString,
    });
  });

  it('passes through scalar instances', () => {
    const map = resolveScalarMap({ id: GraphQLID });
    expect(map?.id).toBe(GraphQLID);
  });

  it('throws on unknown type names', () => {
    expect(() => resolveScalarMap({ id: 'NotAScalar' })).toThrow(/Unknown scalarMap type name/);
  });
});
