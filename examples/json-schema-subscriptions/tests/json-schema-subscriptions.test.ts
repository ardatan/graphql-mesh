import { join } from 'path';
import { GraphQLSchema } from 'graphql';
import { getComposedSchemaFromConfig } from '@graphql-mesh/compose-cli';
import { createServeRuntime } from '@graphql-mesh/serve-runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { createApi } from '../api/app';
import { composeConfig, serveConfig } from '../mesh.config';

describe('JSON Schema Subscriptions', () => {
  let supergraph: GraphQLSchema;
  let meshHttp: ReturnType<typeof createServeRuntime>;
  let api: ReturnType<typeof createApi>;
  let resetTodos = () => {};
  const cwd = join(__dirname, '..');
  beforeAll(async () => {
    supergraph = await getComposedSchemaFromConfig({
      ...composeConfig,
      cwd,
    });
    meshHttp = createServeRuntime<any>({
      ...serveConfig,
      supergraph,
      fetchAPI: {
        fetch: (...args) => api.app.fetch(...args),
      },
    });
    api = createApi(meshHttp.fetch as any);
  });
  afterEach(() => {
    resetTodos();
  });
  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(supergraph)).toMatchSnapshot();
  });
  it('subscriptions', async () => {
    expect.assertions(3);
    const initialResp = await meshHttp.fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query todos {
            todos {
              name
              content
            }
          }
        `,
      }),
    });
    const initialResult = await initialResp.json();
    expect(initialResult).toMatchObject({
      data: {
        todos: [],
      },
    });
    setTimeout(async () => {
      return meshHttp.fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            mutation addTodo {
              addTodo(input: { name: "Todo Subscription", content: "Todo Subscription Content" }) {
                name
                content
              }
            }
          `,
        }),
      });
    }, 1000);
    const subscriptionResp = await meshHttp.fetch('/graphql', {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          subscription todoAdded {
            todoAdded {
              name
              content
            }
          }
        `,
      }),
    });
    for await (const result of subscriptionResp.body) {
      const resInText = Buffer.from(result).toString('utf8');
      if (resInText.includes('data: ')) {
        expect(resInText).toContain(
          `data: {"data":{"todoAdded":{"name":"Todo Subscription","content":"Todo Subscription Content"}}}`,
        );
        break;
      }
    }

    const queryResp = await meshHttp.fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query todos {
            todos {
              name
              content
            }
          }
        `,
      }),
    });

    const queryResult = await queryResp.json();

    expect(queryResult).toMatchObject({
      data: {
        todos: [
          {
            name: 'Todo Subscription',
            content: 'Todo Subscription Content',
          },
        ],
      },
    });
  });
});
