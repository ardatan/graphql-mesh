import { getComposerFromJSONSchema } from '../src/getComposerFromJSONSchema';
import {
  execute,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLString,
  isListType,
  isScalarType,
  parse,
  printType,
} from 'graphql';
import {
  EnumTypeComposer,
  GraphQLJSON,
  InputTypeComposer,
  ListComposer,
  ObjectTypeComposer,
  ScalarTypeComposer,
  SchemaComposer,
  UnionTypeComposer,
} from 'graphql-compose';
import { JSONSchema } from '@json-schema-tools/meta-schema';
import {
  GraphQLBigInt,
  GraphQLDate,
  GraphQLDateTime,
  GraphQLEmailAddress,
  GraphQLIPv4,
  GraphQLIPv6,
  GraphQLTime,
  GraphQLURL,
  GraphQLVoid,
} from 'graphql-scalars';
import { DefaultLogger } from '@graphql-mesh/utils';

describe('getComposerFromJSONSchema', () => {
  const logger = new DefaultLogger('getComposerFromJSONSchema - test');
  it('should return JSON scalar if given schema is boolean true', async () => {
    const result = await getComposerFromJSONSchema(true, logger);
    expect(result.input.getType()).toBe(GraphQLJSON);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLJSON);
  });
  it('should generate a new scalar type that validates the value against the given pattern in string schema', async () => {
    const pattern = '^\\d{10}$';
    const title = 'ExampleRegEx';
    const inputSchema: JSONSchema = {
      title,
      type: 'string',
      pattern,
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    // Scalar types are both input and output types
    expect(result.input).toBe(result.output);
    const outputComposer = result.output as ScalarTypeComposer;
    expect(isScalarType(outputComposer.getType())).toBeTruthy();
    expect(outputComposer.getTypeName()).toBe(title);
    const serializeFn = outputComposer.getSerialize();
    expect(() => serializeFn('not-valid-phone-number')).toThrow();
    expect(serializeFn('1231231234')).toBe('1231231234');
  });
  it('should generate a new scalar type that validates the value against the given const in string schema', async () => {
    const constStr = 'FOO';
    const title = 'ExampleConst';
    const inputSchema: JSONSchema = {
      title,
      type: 'string',
      const: constStr,
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    // Scalar types are both input and output types
    expect(result.input).toBe(result.output);
    const outputComposer = result.output as ScalarTypeComposer;
    expect(isScalarType(outputComposer.getType())).toBeTruthy();
    expect(outputComposer.getTypeName()).toBe(title);
    const serializeFn = outputComposer.getSerialize();
    expect(() => serializeFn('bar')).toThrow();
    expect(serializeFn(constStr)).toBe(constStr);
  });
  it('should generate a new enum type from enum schema', async () => {
    const enumValues = ['foo', 'bar', 'qux'];
    const title = 'ExampleEnum';
    const inputSchema: JSONSchema = {
      title,
      type: 'string',
      enum: enumValues,
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    // Enum types are both input and output types
    expect(result.input).toBe(result.output);
    const outputComposer = result.output as EnumTypeComposer;
    expect(outputComposer.toSDL()).toBe(
      /* GraphQL */ `
enum ExampleEnum {
  foo
  bar
  qux
}`.trim()
    );
  });
  it('should generate a new enum type from enum schema by sanitizing enum keys', async () => {
    const enumValues = ['0-foo', '1+bar', '2)qux'];
    const title = 'ExampleEnum';
    const inputSchema: JSONSchema = {
      title,
      type: 'string',
      enum: enumValues,
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    // Enum types are both input and output types
    expect(result.input).toBe(result.output);
    const outputComposer = result.output as EnumTypeComposer;
    expect(outputComposer.toSDL()).toMatchInlineSnapshot(`
"enum ExampleEnum {
  _0_MINUS_foo
  _1_PLUS_bar
  _2_RIGHT_PARENTHESIS_qux
}"
`);
  });
  it('should generate union types from oneOf object types', async () => {
    const inputSchema: JSONSchema = {
      title: 'User',
      type: 'object',
      oneOf: [
        {
          title: 'Writer',
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            posts: {
              type: 'array',
              items: {
                title: 'Post',
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                  },
                  title: {
                    type: 'string',
                  },
                  content: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        {
          title: 'Admin',
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            permissions: {
              type: 'array',
              items: {
                title: 'AdminPermission',
                type: 'string',
                enum: ['edit', 'delete'],
              },
            },
          },
        },
      ],
    };
    const outputSchema = /* GraphQL */ `
union User = Writer | Admin

type Writer {
  id: String
  name: String
  posts: [Post]
}

${printType(GraphQLString)}

type Post {
  id: String
  title: String
  content: String
}

type Admin {
  id: String
  name: String
  permissions: [AdminPermission]
}

enum AdminPermission {
  edit
  delete
}
    `.trim();

    const result = await getComposerFromJSONSchema(inputSchema, logger);
    const unionComposer = result.output as UnionTypeComposer;
    expect(
      unionComposer.toSDL({
        deep: true,
      })
    ).toBe(outputSchema);
  });
  it('should generate an input union type for oneOf definitions that contain scalar types', async () => {
    const title = 'ExampleOneOf';
    const inputSchema: JSONSchema = {
      title,
      oneOf: [
        {
          type: 'string',
        },
        {
          type: 'object',
          title: 'ExampleObject',
          properties: {
            id: {
              type: 'string',
            },
          },
        },
      ],
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(
      (result.input as InputTypeComposer).toSDL({
        deep: true,
      })
    ).toBe(
      /* GraphQL */ `
input ExampleOneOf_Input @oneOf {
  String: String
  ExampleObject_Input: ExampleObject_Input
}

${printType(GraphQLString)}

input ExampleObject_Input {
  id: String
}
    `.trim()
    );
    expect(
      (result.output as ObjectTypeComposer).toSDL({
        deep: true,
      })
    ).toBe(
      /* GraphQL */ `
scalar ExampleOneOf
    `.trim()
    );
  });
  it('should generate merged object types from allOf definitions', async () => {
    const inputSchema: JSONSchema = {
      title: 'ExampleAllOf',
      allOf: [
        {
          type: 'object',
          title: 'Foo',
          properties: {
            id: {
              type: 'string',
            },
          },
          required: ['id'],
        },
        {
          type: 'object',
          title: 'Bar',
          properties: {
            name: {
              type: 'string',
            },
          },
          required: ['name'],
        },
      ],
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect((result.input as InputTypeComposer).toSDL()).toBe(
      /* GraphQL */ `
input ExampleAllOf_Input {
  id: String!
  name: String!
}
    `.trim()
    );
    expect((result.output as InputTypeComposer).toSDL()).toBe(
      /* GraphQL */ `
type ExampleAllOf {
  id: String!
  name: String!
}
    `.trim()
    );
  });
  it('should generate JSON scalar for allOf definitions that contain scalar types', async () => {
    const title = 'ExampleAllOf';
    const inputSchema: JSONSchema = {
      title,
      allOf: [
        {
          type: 'string',
        },
        {
          type: 'object',
          title: 'ExampleObject',
          properties: {
            id: {
              type: 'string',
            },
          },
        },
      ],
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(result.input).toBe(result.output);
    const outputComposer = result.output as ScalarTypeComposer;
    expect(isScalarType(outputComposer.getType())).toBeTruthy();
    expect(outputComposer.getTypeName()).toBe(title);
  });
  it('should generate correct types for anyOf definitions', async () => {
    const inputSchema: JSONSchema = {
      title: 'ExampleAnyOf',
      anyOf: [
        {
          type: 'object',
          title: 'Foo',
          properties: {
            id: {
              type: 'string',
            },
          },
          required: ['id'],
        },
        {
          type: 'object',
          title: 'Bar',
          properties: {
            name: {
              type: 'string',
            },
          },
          required: ['name'],
        },
      ],
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect((result.input as InputTypeComposer).toSDL()).toBe(
      /* GraphQL */ `
input ExampleAnyOf_Input {
  id: String!
  name: String!
}
    `.trim()
    );
    expect((result.output as InputTypeComposer).toSDL()).toBe(
      /* GraphQL */ `
type ExampleAnyOf {
  id: String!
  name: String!
}
    `.trim()
    );
  });
  it('should generate JSON scalar for allOf definitions that contain scalar types', async () => {
    const title = 'ExampleAnyOf';
    const inputSchema: JSONSchema = {
      title,
      allOf: [
        {
          type: 'string',
        },
        {
          type: 'object',
          title: 'ExampleObject',
          properties: {
            id: {
              type: 'string',
            },
          },
        },
      ],
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(result.input).toBe(result.output);
    const outputComposer = result.output as ScalarTypeComposer;
    expect(isScalarType(outputComposer.getType())).toBeTruthy();
    expect(outputComposer.getTypeName()).toBe(title);
  });
  it('should return Boolean for boolean definition', async () => {
    const inputSchema: JSONSchema = {
      type: 'boolean',
    };

    const result = await getComposerFromJSONSchema(inputSchema, logger);

    expect(result.input.getType()).toBe(GraphQLBoolean);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLBoolean);
  });
  it('should return Void for null definition', async () => {
    const inputSchema: JSONSchema = {
      type: 'null',
    };

    const result = await getComposerFromJSONSchema(inputSchema, logger);

    expect(result.input.getType()).toBe(GraphQLVoid);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLVoid);
  });
  it('should return BigInt for int64 definition', async () => {
    const inputSchema: JSONSchema = {
      type: 'integer',
      format: 'int64',
    };

    const result = await getComposerFromJSONSchema(inputSchema, logger);

    expect(result.input.getType()).toBe(GraphQLBigInt);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLBigInt);
  });
  it('should return Int for int32 definition', async () => {
    const inputSchema: JSONSchema = {
      type: 'integer',
      format: 'int32',
    };

    const result = await getComposerFromJSONSchema(inputSchema, logger);

    expect(result.input.getType()).toBe(GraphQLInt);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLInt);
  });
  it('should return Int for integer definitions without format', async () => {
    const inputSchema: JSONSchema = {
      type: 'integer',
    };

    const result = await getComposerFromJSONSchema(inputSchema, logger);

    expect(result.input.getType()).toBe(GraphQLInt);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLInt);
  });
  it('should return Float for number definition', async () => {
    const inputSchema: JSONSchema = {
      type: 'number',
    };

    const result = await getComposerFromJSONSchema(inputSchema, logger);

    expect(result.input.getType()).toBe(GraphQLFloat);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLFloat);
  });
  it('should generate scalar types for minLength definition', async () => {
    const title = 'NonEmptyString';
    const inputSchema: JSONSchema = {
      title,
      type: 'string',
      minLength: 1,
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    const inputComposer = result.input as ScalarTypeComposer;
    expect(inputComposer).toBe(result.output);
    expect(inputComposer.getTypeName()).toBe(title);
    const serializeFn = inputComposer.getSerialize();
    expect(() => serializeFn('')).toThrow();
    expect(serializeFn('aa')).toBe('aa');
  });
  it('should generate scalar types for maxLength definition', async () => {
    const title = 'NonEmptyString';
    const inputSchema: JSONSchema = {
      title,
      type: 'string',
      maxLength: 2,
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    const inputComposer = result.input as ScalarTypeComposer;
    expect(inputComposer).toBe(result.output);
    expect(inputComposer.getTypeName()).toBe(title);
    const serializeFn = inputComposer.getSerialize();
    expect(() => serializeFn('aaa')).toThrow();
    expect(serializeFn('a')).toBe('a');
  });
  it('should generate scalar types for both minLength and maxLength definition', async () => {
    const title = 'NonEmptyString';
    const inputSchema: JSONSchema = {
      title,
      type: 'string',
      minLength: 1,
      maxLength: 2,
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    const inputComposer = result.input as ScalarTypeComposer;
    expect(inputComposer).toBe(result.output);
    expect(inputComposer.getTypeName()).toBe(title);
    const serializeFn = inputComposer.getSerialize();
    expect(() => serializeFn('aaa')).toThrow();
    expect(() => serializeFn('')).toThrow();
    expect(serializeFn('a')).toBe('a');
  });
  it('should return DateTime scalar for date-time format', async () => {
    const inputSchema: JSONSchema = {
      type: 'string',
      format: 'date-time',
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(result.input.getType()).toBe(GraphQLDateTime);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLDateTime);
  });
  it('should return Time scalar for time format', async () => {
    const inputSchema: JSONSchema = {
      type: 'string',
      format: 'time',
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(result.input.getType()).toBe(GraphQLTime);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLTime);
  });
  it('should return EmailAddress scalar for email format', async () => {
    const inputSchema: JSONSchema = {
      type: 'string',
      format: 'email',
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(result.input.getType()).toBe(GraphQLEmailAddress);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLEmailAddress);
  });
  it('should return IPv4 scalar for email format', async () => {
    const inputSchema: JSONSchema = {
      type: 'string',
      format: 'ipv4',
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(result.input.getType()).toBe(GraphQLIPv4);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLIPv4);
  });
  it('should return IPv6 scalar for email format', async () => {
    const inputSchema: JSONSchema = {
      type: 'string',
      format: 'ipv6',
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(result.input.getType()).toBe(GraphQLIPv6);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLIPv6);
  });
  it('should return URL scalar for uri format', async () => {
    const inputSchema: JSONSchema = {
      type: 'string',
      format: 'uri',
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(result.input.getType()).toBe(GraphQLURL);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLURL);
  });
  it('should return String for string definitions without format', async () => {
    const inputSchema: JSONSchema = {
      type: 'string',
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(result.input.getType()).toBe(GraphQLString);
    expect((result.output as ScalarTypeComposer).getType()).toBe(GraphQLString);
  });
  it('should return list type for array definitions with items as object', async () => {
    const inputSchema: JSONSchema = {
      type: 'array',
      items: {
        type: 'string',
      },
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(isListType(result.input.getType())).toBeTruthy();
    expect((result.input as ListComposer).ofType.getType()).toBe(GraphQLString);
    expect(isListType((result.output as ListComposer).getType())).toBeTruthy();
    expect((result.output as ListComposer).ofType.getType()).toBe(GraphQLString);
  });
  it('should return generic JSON type for array definitions with contains', async () => {
    const title = 'ExampleArray';
    const inputSchema: JSONSchema = {
      title,
      type: 'array',
      contains: {
        type: 'string',
      },
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(result.input).toBe(result.output);
    const outputComposer = result.output as ListComposer;
    expect(isListType(outputComposer.getType())).toBeTruthy();
    expect(isScalarType(outputComposer.ofType.getType())).toBeTruthy();
    expect(outputComposer.ofType.getTypeName()).toBe(title);
  });
  it('should return union type inside a list type if array definition has items as an array', async () => {
    const title = 'FooOrBar';
    const inputSchema: JSONSchema = {
      title: 'ExampleObject',
      type: 'object',
      properties: {
        fooOrBar: {
          title,
          type: 'array',
          items: [
            {
              title: 'Foo',
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                },
              },
            },
            {
              title: 'Bar',
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
          ],
        },
      },
    };

    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect(
      (result.output as ObjectTypeComposer).toSDL({
        deep: true,
      })
    ).toBe(
      /* GraphQL */ `
type ExampleObject {
  fooOrBar: [FooOrBar]
}

union FooOrBar = Foo | Bar

type Foo {
  id: String
}

${printType(GraphQLString)}

type Bar {
  name: String
}
`.trim()
    );
  });
  it('should create correct object types from object definition', async () => {
    const title = 'ExampleObject';
    const inputSchema: JSONSchema = {
      title,
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
      },
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect((result.input as InputTypeComposer).toSDL()).toBe(
      /* GraphQL */ `
input ExampleObject_Input {
  id: String
}
     `.trim()
    );
    expect((result.output as InputTypeComposer).toSDL()).toBe(
      /* GraphQL */ `
type ExampleObject {
  id: String
}
     `.trim()
    );
  });
  it('should create correct object types from object definition with additionalPropertiez', async () => {
    const title = 'ExampleObject';
    const inputSchema: JSONSchema = {
      title,
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
      },
      additionalProperties: {
        type: 'string',
      },
    };
    const result = await getComposerFromJSONSchema(inputSchema, logger);
    expect((result.input as InputTypeComposer).toSDL()).toContain(
      /* GraphQL */ `
scalar ExampleObject_Input
     `.trim()
    );
    expect((result.output as InputTypeComposer).toSDL()).toBe(
      /* GraphQL */ `
type ExampleObject {
  id: String
  additionalProperties: JSON
}
     `.trim()
    );
  });
  it('should return GraphQLSchema if object definition given with _schema title', async () => {
    const inputSchema: JSONSchema = {
      title: '_schema',
      type: 'object',
      properties: {
        query: {
          title: 'Query',
          type: 'object',
          properties: {
            foo: {
              type: 'string',
            },
          },
        },
      },
    };
    const { output } = await getComposerFromJSONSchema(inputSchema, logger);
    expect(output instanceof SchemaComposer).toBeTruthy();
    expect((output as SchemaComposer).toSDL()).toContain(
      /* GraphQL */ `
type Query {
  foo: String
}
     `.trim()
    );
  });
  it('should return Query type if object definition given with Query title', async () => {
    const inputSchema: JSONSchema = {
      title: 'Query',
      type: 'object',
      properties: {
        foo: {
          type: 'string',
        },
      },
    };
    const { output } = await getComposerFromJSONSchema(inputSchema, logger);
    expect(output instanceof ObjectTypeComposer).toBeTruthy();
    expect((output as SchemaComposer).toSDL()).toContain(
      /* GraphQL */ `
type Query {
  foo: String
}
     `.trim()
    );
  });
  it('should return Mutation type if object definition given with Query title', async () => {
    const inputSchema: JSONSchema = {
      title: 'Mutation',
      type: 'object',
      properties: {
        foo: {
          type: 'string',
        },
      },
    };
    const { output } = await getComposerFromJSONSchema(inputSchema, logger);
    expect(output instanceof ObjectTypeComposer).toBeTruthy();
    expect((output as SchemaComposer).toSDL()).toContain(
      /* GraphQL */ `
type Mutation {
  foo: String
}
     `.trim()
    );
  });
  it('should return Subscription type if object definition given with Subscription title', async () => {
    const inputSchema: JSONSchema = {
      title: 'Subscription',
      type: 'object',
      properties: {
        foo: {
          type: 'string',
        },
      },
    };
    const { output } = await getComposerFromJSONSchema(inputSchema, logger);
    expect(output instanceof ObjectTypeComposer).toBeTruthy();
    expect((output as SchemaComposer).toSDL()).toContain(
      /* GraphQL */ `
type Subscription {
  foo: String
}
     `.trim()
    );
  });
  it('should add arguments to Query fields with the object definition QueryTitle', async () => {
    const inputSchema: JSONSchema = {
      title: '_schema',
      type: 'object',
      properties: {
        query: {
          title: 'Query',
          type: 'object',
          properties: {
            foo: {
              type: 'string',
            },
          },
        },
        queryInput: {
          title: 'QueryInput',
          type: 'object',
          properties: {
            foo: {
              title: 'Foo',
              type: 'object',
              properties: {
                bar: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    };
    const { output } = await getComposerFromJSONSchema(inputSchema, logger);
    expect(output instanceof SchemaComposer).toBeTruthy();
    expect((output as SchemaComposer).toSDL()).toBe(
      /* GraphQL */ `
type Query {
  foo(input: Foo_Input): String
}

${printType(GraphQLString)}

input Foo_Input {
  bar: String
}
     `.trim()
    );
  });
  it('should choose correct type in union type generated from oneOf', async () => {
    const FooOrBar = {
      title: 'FooOrBar',
      oneOf: [
        {
          title: 'Foo',
          type: 'object',
          properties: {
            fooId: {
              type: 'string',
            },
          },
          required: ['fooId'],
        },
        {
          title: 'Bar',
          type: 'object',
          properties: {
            barId: {
              type: 'string',
            },
          },
        },
      ],
    };
    const inputSchema: JSONSchema = {
      title: '_schema',
      type: 'object',
      properties: {
        query: {
          title: 'Query',
          type: 'object',
          properties: {
            fooOrBarButFoo: FooOrBar,
            fooOrBarButBar: FooOrBar,
          },
        },
      },
    };

    const result = await getComposerFromJSONSchema(inputSchema, logger);

    const schemaComposer = result.output as SchemaComposer;
    const fooId = 'FOO_ID';
    const barId = 'BAR_ID';
    schemaComposer.addResolveMethods({
      Query: {
        fooOrBarButFoo: () => ({
          fooId: 'FOO_ID',
        }),
        fooOrBarButBar: () => ({
          barId: 'BAR_ID',
        }),
      },
    });
    const schema = schemaComposer.buildSchema();
    const executionResponse = await execute({
      schema,
      document: parse(/* GraphQL */ `
        fragment FooOrBarFragment on FooOrBar {
          __typename
          ... on Foo {
            fooId
          }
          ... on Bar {
            barId
          }
        }
        query TestQuery {
          fooOrBarButFoo {
            ...FooOrBarFragment
          }
          fooOrBarButBar {
            ...FooOrBarFragment
          }
        }
      `),
    });
    expect(executionResponse?.data?.fooOrBarButFoo?.__typename).toBe('Foo');
    expect(executionResponse?.data?.fooOrBarButFoo?.fooId).toBe(fooId);
    expect(executionResponse?.data?.fooOrBarButBar?.__typename).toBe('Bar');
    expect(executionResponse?.data?.fooOrBarButBar?.barId).toBe(barId);
  });
  it('should handle non-string enum values', async () => {
    const FooEnum = {
      title: 'FooEnum',
      type: 'string' as const,
      enum: [-1, 1],
    };
    const { output } = await getComposerFromJSONSchema(FooEnum, logger);
    expect(output instanceof EnumTypeComposer).toBeTruthy();
    const enumTypeComposer = output as EnumTypeComposer;
    const enumValuesMap = enumTypeComposer.getFields();
    expect(enumValuesMap).toMatchInlineSnapshot(`
Object {
  "NEGATIVE_1": Object {
    "deprecationReason": undefined,
    "description": undefined,
    "directives": Array [],
    "extensions": Object {},
    "value": -1,
  },
  "_1": Object {
    "deprecationReason": undefined,
    "description": undefined,
    "directives": Array [],
    "extensions": Object {},
    "value": 1,
  },
}
`);
  });
  it('should handle strings with non-latin characters', async () => {
    const FooEnum = {
      title: 'FooEnum',
      type: 'string' as const,
      enum: ['לא', 'כן'],
    };

    const { output } = await getComposerFromJSONSchema(FooEnum, logger);
    expect(output instanceof EnumTypeComposer).toBeTruthy();
    const enumTypeComposer = output as EnumTypeComposer;
    const enumValuesMap = enumTypeComposer.getFields();
    expect(enumValuesMap).toMatchInlineSnapshot(`
      Object {
        "_1499__1503_": Object {
          "deprecationReason": undefined,
          "description": undefined,
          "directives": Array [],
          "extensions": Object {},
          "value": "כן",
        },
        "_1500__1488_": Object {
          "deprecationReason": undefined,
          "description": undefined,
          "directives": Array [],
          "extensions": Object {},
          "value": "לא",
        },
      }
    `);
  });
});
