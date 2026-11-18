import { GraphQLObjectType, GraphQLString, GraphQLUnionType, buildSchema } from 'graphql';
import { getTypeResolverForAbstractType } from '../src/directives/getTypeResolverForAbstractType.js';
import { processDirectives } from '../src/directives/process.js';

describe('abstract resolveType __throw_* discriminators', () => {
  const First = new GraphQLObjectType({
    name: 'First',
    fields: { message: { type: GraphQLString } },
  });
  const Second = new GraphQLObjectType({
    name: 'Second',
    fields: { message: { type: GraphQLString } },
  });
  const GoSuccess = new GraphQLObjectType({
    name: 'GoSuccess',
    fields: { value: { type: GraphQLString } },
  });

  it('prefers __throw_<Type>===true over shared field-name scoring', () => {
    const resolveType = getTypeResolverForAbstractType({
      possibleTypes: [GoSuccess, First, Second],
    });
    expect(
      resolveType(
        { message: 'x', __throw_Second: true, __throw_First: false },
        null as any,
        null as any,
        null as any,
      ),
    ).toBe('Second');
    expect(
      resolveType(
        { message: 'x', __throw_First: true, __throw_Second: false },
        null as any,
        null as any,
        null as any,
      ),
    ).toBe('First');
  });

  it('survives processDirectives overwriting union resolveType after SDL rebuild', () => {
    const sdl = `
      union GoResult = GoSuccess | First | Second
      type GoSuccess { value: String }
      type First { message: String }
      type Second { message: String }
      type Query { go: GoResult }
    `;
    const schema = processDirectives(buildSchema(sdl), {});
    const union = schema.getType('GoResult') as GraphQLUnionType;
    const resolveType = union.resolveType!;
    expect(
      resolveType(
        { message: 'from-second', __throw_Second: true, __throw_First: false, field0: false },
        null as any,
        { schema } as any,
        union,
      ),
    ).toBe('Second');
  });
});
