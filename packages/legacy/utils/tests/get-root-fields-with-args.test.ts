import { buildSchema, parse, versionInfo } from 'graphql';
import { getRootFieldsWithArgs } from '../src/getRootFieldsWithArgs';

describe('getRootFieldsWithArgs variable values', () => {
  it(`resolves required args via variables on GraphQL ${versionInfo.major}`, () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        f(x: Int!): Int
      }
    `);
    const document = parse(/* GraphQL */ `
      query Q($x: Int!) {
        f(x: $x)
      }
    `);

    const fields = getRootFieldsWithArgs(schema, {
      document,
      variables: { x: 1 },
    });

    expect(fields.get('f')).toEqual({ x: 1 });
  });

  it(`keeps optional-arg defaults when the variable is omitted (GraphQL ${versionInfo.major})`, () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        f(x: Int = 7): Int
      }
    `);
    const document = parse(/* GraphQL */ `
      query Q($x: Int) {
        f(x: $x)
      }
    `);

    const fields = getRootFieldsWithArgs(schema, {
      document,
      variables: {},
    });

    expect(fields.get('f')).toEqual({ x: 7 });
  });
});
