import { envelop } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { RenameRootFields } from '@graphql-tools/wrap';
import { buildClientSchema, ExecutionResult, getIntrospectionQuery, IntrospectionQuery, printSchema } from 'graphql';
import { useSubschema } from '../src/useSubschema';

describe('useSubschema', () => {
  const sdl = /* GraphQL */ `
    type Query {
      foo: String
    }
  `;
  const schema = makeExecutableSchema({
    typeDefs: sdl,
    resolvers: {
      Query: {
        foo: () => 'bar',
      },
    },
  });
  const { plugin } = useSubschema({
    schema,
    transforms: [
      new RenameRootFields((operation, name) => {
        if (operation === 'Query' && name === 'foo') {
          return 'bar';
        }
        return name;
      }),
    ],
  });
  const getEnveloped = envelop({
    plugins: [plugin],
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
    expect(printedIntrospectedSdl).toContain(
      /* GraphQL */ `
type Query {
  bar: String
}
    `.trim()
    );
  });
  it('should handle requests and responses correctly', async () => {
    const { schema, parse, validate, execute, contextFactory } = getEnveloped();
    const document = parse(/* GraphQL */ `
      query Test {
        bar
      }
    `);
    const errors = validate(schema, document);
    expect(errors).toHaveLength(0);
    const result = (await execute({
      schema,
      document,
      contextValue: await contextFactory(),
    })) as any as ExecutionResult<IntrospectionQuery>;
    expect(result.data).toEqual({ bar: 'bar' });
  });
});
