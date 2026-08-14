import { GraphQLSchema, isNonNullType, isNullableType, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI from '../src/index.js';

describe('required-ref-param', () => {
  let schema: GraphQLSchema;

  beforeAll(async () => {
    schema = await loadGraphQLSchemaFromOpenAPI('TestAPI', {
      endpoint: 'http://localhost:3000',
      source: './fixtures/required-ref-param.yaml',
      cwd: __dirname,
    });
  });

  it('should generate the schema correctly', () => {
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('schema');
  });

  it('required param should be non-null and optional param should be nullable (issue #9538)', () => {
    const queryType = schema.getQueryType()!;
    const getFooField = queryType.getFields()['getFoo'];
    const getBarField = queryType.getFields()['getBar'];

    expect(getFooField).toBeDefined();
    expect(getBarField).toBeDefined();

    // getFoo's id param is required: should be non-null UUID!
    const fooIdArg = getFooField.args.find(a => a.name === 'id');
    expect(fooIdArg).toBeDefined();
    expect(isNonNullType(fooIdArg!.type)).toBe(true);

    // getBar's id param is optional: should be nullable UUID
    const barIdArg = getBarField.args.find(a => a.name === 'id');
    expect(barIdArg).toBeDefined();
    expect(isNullableType(barIdArg!.type)).toBe(true);

    // Both should use the same underlying UUID scalar (no UUID2, UUID3 etc)
    const fooIdType = isNonNullType(fooIdArg!.type) ? fooIdArg!.type.ofType : fooIdArg!.type;
    const barIdType = barIdArg!.type;
    expect(fooIdType.toString()).toBe(barIdType.toString());
  });
});
