import { buildSchema, GraphQLObjectType, GraphQLString, GraphQLUnionType } from 'graphql';
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

  it('treats Thrift field0 stamp as authoritative after processDirectives', () => {
    const sdl = `
      union GetStatusBagOrThrowResult = GetStatusBagOrThrowSuccess | Boom
      type GetStatusBagOrThrowSuccess { value: StatusBag }
      type StatusBag { left: Int }
      type Boom { message: String }
      type Query { getStatusBagOrThrow: GetStatusBagOrThrowResult }
    `;
    const schema = processDirectives(buildSchema(sdl), {});
    const union = schema.getType('GetStatusBagOrThrowResult') as GraphQLUnionType;
    const resolveType = union.resolveType!;
    // Success with leftover message:undefined must not lose to Boom via scoring.
    expect(
      resolveType(
        { field0: true, value: { left: 1 }, message: undefined, __throw_Boom: false },
        null as any,
        { schema } as any,
        union,
      ),
    ).toBe('GetStatusBagOrThrowSuccess');
    expect(
      resolveType(
        {
          field0: false,
          value: { left: undefined },
          message: 'boom',
          __throw_Boom: true,
        },
        null as any,
        { schema } as any,
        union,
      ),
    ).toBe('Boom');
  });

  it('prefers success when Thrift __throw_* stamps are all false', () => {
    const resolveType = getTypeResolverForAbstractType({
      possibleTypes: [GoSuccess, First, Second],
    });
    // Leftover null exception fields must not beat `value` via scoring ties.
    expect(
      resolveType(
        { value: 'ok', message: null, __throw_First: false, __throw_Second: false },
        null as any,
        null as any,
        null as any,
      ),
    ).toBe('GoSuccess');
  });

  it('does not skip value members for ordinary REST field0:false payloads', () => {
    // Without `__throw_*` stamps, boolean field0 is not a Thrift union signal —
    // `{ field0: false, value: "ok" }` must still resolve to Value.
    const sdl = `
      union Result = Value | Other
      type Value { value: String }
      type Other { other: String }
      type Query { r: Result }
    `;
    const schema = processDirectives(buildSchema(sdl), {});
    const union = schema.getType('Result') as GraphQLUnionType;
    const resolveType = union.resolveType!;
    expect(resolveType({ field0: false, value: 'ok' }, null as any, { schema } as any, union)).toBe(
      'Value',
    );
  });
});
