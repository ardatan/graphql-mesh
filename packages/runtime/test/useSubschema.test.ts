import { envelop, useEngine } from '@envelop/core';
import { Subschema } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { RenameRootFields, TransformEnumValues } from '@graphql-tools/wrap';
import {
  buildClientSchema,
  ExecutionResult,
  getIntrospectionQuery,
  IntrospectionQuery,
  printSchema,
  parse,
  validate,
  execute,
  subscribe,
  specifiedRules,
} from 'graphql';
import { useSubschema } from '../src/useSubschema';

describe('useSubschema', () => {
  const sdl = /* GraphQL */ `
    type Query {
      foo(baz: Baz!): String
    }
    enum Baz {
      B
      C
      D
    }
  `;
  const schema = makeExecutableSchema({
    typeDefs: sdl,
    resolvers: {
      Query: {
        foo: (_, { baz }) => baz,
      },
      Baz: {
        B: 'b',
        C: 'c',
        D: 'd',
      },
    },
  });
  const plugin = useSubschema(
    new Subschema({
      schema,
      transforms: [
        new RenameRootFields((operation, name) => {
          if (operation === 'Query' && name === 'foo') {
            return 'bar';
          }
          return name;
        }),
        new TransformEnumValues((typeName, externalValue, enumValueConfig) => [
          `A_${externalValue}`,
          {
            ...enumValueConfig,
            value: `A_${externalValue}`,
          },
        ]),
      ],
    })
  );
  const getEnveloped = envelop({
    plugins: [
      useEngine({
        parse,
        validate,
        execute,
        subscribe,
        specifiedRules,
      }),
      plugin,
    ],
  });
  it('should return correct introspection', async () => {
    const { schema, parse, validate, execute, contextFactory } = getEnveloped();
    const document = parse(getIntrospectionQuery());
    const errors = validate(schema, document);
    expect(errors).toHaveLength(0);
    const result = (await execute({
      schema,
      document,
      contextValue: await contextFactory(),
    })) as any as ExecutionResult<IntrospectionQuery>;
    const introspectedSchema = buildClientSchema(result.data);
    const printedIntrospectedSdl = printSchema(introspectedSchema);
    expect(printedIntrospectedSdl).toMatchInlineSnapshot(`
      "type Query {
        bar(baz: Baz!): String
      }

      enum Baz {
        A_B
        A_C
        A_D
      }"
    `);
  });
  it('should handle requests and responses correctly', async () => {
    const { schema, parse, validate, execute, contextFactory } = getEnveloped();
    const document = parse(/* GraphQL */ `
      query Test($baz: Baz!) {
        bar(baz: $baz)
      }
    `);
    const errors = validate(schema, document);
    expect(errors).toHaveLength(0);
    const result = (await execute({
      schema,
      document,
      variableValues: {
        baz: 'A_B',
      },
      contextValue: await contextFactory(),
    })) as any as ExecutionResult<IntrospectionQuery>;
    expect(result.data).toEqual({ bar: 'b' });
  });
});
