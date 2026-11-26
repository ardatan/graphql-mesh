import { buildSchema, Kind, parse, print } from 'graphql';
import { schemaFromExecutor, WrapFields, wrapSchema } from '../src/index.js';

describe('WrapFields fragment directives', () => {
  it('preserves @skip/@include from fragments when hoisting fields', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        user: User
      }
      type User {
        id: ID!
        name: String
        email: String
      }
    `);
    const transform = new WrapFields('User', ['wrapped'], ['UserWrapper'], ['name', 'email']);
    const wrapped = wrapSchema({
      schema,
      transforms: [transform],
    });
    expect(wrapped.getType('UserWrapper')).toBeDefined();

    const ctx = { nextIndex: 0, paths: Object.create(null) } as any;
    // Drive MapFields via transformRequest on a selection that uses conditional fragments
    const req = transform.transformRequest(
      {
        document: parse(/* GraphQL */ `
          {
            user {
              wrapped {
                ... on UserWrapper @include(if: true) {
                  name
                }
                ...Skipped @skip(if: true)
              }
            }
          }
          fragment Skipped on UserWrapper {
            email
          }
        `),
      },
      { schema: wrapped } as any,
      ctx,
    );
    const printed = print(req.document);
    // Hoisted fields should carry the fragment directives
    expect(printed).toMatch(/name[\s\S]*@include|@include[\s\S]*name/);
    expect(printed).toMatch(/email[\s\S]*@skip|@skip[\s\S]*email/);
  });

  it('treats fragment name constructor as an ordinary visited key', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        user: User
      }
      type User {
        id: ID!
        name: String
      }
    `);
    const transform = new WrapFields('User', ['wrapped'], ['UserWrapper'], ['name']);
    wrapSchema({ schema, transforms: [transform] });
    const ctx = { nextIndex: 0, paths: Object.create(null) } as any;
    const req = transform.transformRequest(
      {
        document: parse(/* GraphQL */ `
          {
            user {
              wrapped {
                ...constructor
              }
            }
          }
          fragment constructor on UserWrapper {
            name
          }
        `),
      },
      {} as any,
      ctx,
    );
    expect(print(req.document)).toContain('name');
  });
});

describe('schemaFromExecutor async iterator cleanup', () => {
  it('calls iterator.return after reading', async () => {
    let returnCalled = false;
    const introspectionData = {
      data: {
        __schema: {
          queryType: { name: 'Query' },
          mutationType: null,
          subscriptionType: null,
          types: [
            {
              kind: 'OBJECT',
              name: 'Query',
              fields: [
                {
                  name: 'hello',
                  args: [],
                  type: { kind: 'SCALAR', name: 'String' },
                  isDeprecated: false,
                  deprecationReason: null,
                },
              ],
              interfaces: [],
            },
            {
              kind: 'SCALAR',
              name: 'String',
            },
          ],
          directives: [],
        },
      },
    };

    const executor = async () => {
      return {
        [Symbol.asyncIterator]() {
          let done = false;
          return {
            async next() {
              if (done) {
                return { done: true, value: undefined };
              }
              done = true;
              return { done: false, value: introspectionData };
            },
            async return() {
              returnCalled = true;
              return { done: true, value: undefined };
            },
          };
        },
      } as any;
    };

    const schema = await schemaFromExecutor(executor);
    expect(schema.getQueryType()?.getFields().hello).toBeDefined();
    expect(returnCalled).toBe(true);
  });

  it('calls iterator.return when next fails', async () => {
    let returnCalled = false;
    const executor = async () =>
      ({
        [Symbol.asyncIterator]() {
          return {
            async next() {
              throw new Error('boom');
            },
            async return() {
              returnCalled = true;
              return { done: true, value: undefined };
            },
          };
        },
      }) as any;

    await expect(schemaFromExecutor(executor)).rejects.toThrow('boom');
    expect(returnCalled).toBe(true);
  });
});

// silence unused import if tree-shaken oddly
void Kind;
