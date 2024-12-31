import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { fakePromise, isAsyncIterable, printSchemaWithDirectives } from '@graphql-tools/utils';
import { createApi } from '../api/app';

describe('JSON Schema Subscriptions', () => {
  let mesh: MeshInstance;
  let resetTodos = () => {};
  let meshHttp: MeshHTTPHandler;
  const baseDir = join(__dirname, '..');
  beforeAll(async () => {
    const config = await findAndParseConfig({
      dir: baseDir,
    });
    mesh = await getMesh({
      ...config,
      async fetchFn(url, options) {
        return api.app.fetch(url, options);
      },
    });
    meshHttp = createMeshHTTPHandler({
      baseDir,
      getBuiltMesh: () => fakePromise(mesh),
    });
    const api = createApi(meshHttp.fetch as any);
  });
  afterEach(() => {
    resetTodos();
  });
  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(mesh.schema)).toMatchSnapshot();
  });
  it('subscriptions', async () => {
    const subscription = /* GraphQL */ `
      subscription todoAdded {
        todoAdded {
          name
          content
        }
      }
    `;
    setTimeout(async () => {
      await meshHttp.fetch('/');
      return mesh.execute(
        /* GraphQL */ `
          mutation addTodo($name: String!, $content: String!) {
            addTodo(input: { name: $name, content: $content }) {
              name
              content
            }
          }
        `,
        {
          name: 'Todo Subscription',
          content: 'Todo Subscription Content',
        },
      );
    }, 1000);
    const subscriptionResult = await mesh.subscribe(subscription);
    if (!isAsyncIterable(subscriptionResult)) {
      throw new Error('Subscription result is not an async iterable');
    }
    for await (const result of subscriptionResult) {
      expect(result).toMatchObject({
        data: {
          todoAdded: {
            name: 'Todo Subscription',
            content: 'Todo Subscription Content',
          },
        },
      });
      break;
    }
    const query = /* GraphQL */ `
      query todos {
        todos {
          name
          content
        }
      }
    `;

    const queryResult = await mesh.execute(query);
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
  afterAll(() => {
    mesh.destroy();
  });
});
