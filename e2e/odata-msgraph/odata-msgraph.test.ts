import { createTenv, type ServeRunner, type Service } from '@e2e/tenv';

const { compose, serve, service } = createTenv(__dirname);

/** Mock Bearer for Connectors `{$env.MSGRAPH_ACCESS_TOKEN}` against local Graph service. */
const MOCK_TOKEN = 'e2e-msgraph-mock-token';

const getMeQuery = /* GraphQL */ `
  query GetMe {
    me {
      id
      displayName
    }
  }
`;

describe('Microsoft Graph Connectors', () => {
  let graph: Service;

  beforeAll(async () => {
    graph = await service('Graph');
  });

  it('composes Connectors from fixture $metadata', async () => {
    const { result } = await compose({
      output: 'graphql',
      services: [graph],
      maskServicePorts: true,
    });
    expect(result).toContain('name: "source"');
    expect(result).toContain('name: "connect"');
    expect(result).toContain('odata.metadata=minimal');
    expect(result).toContain('kind: "rest"');
    expect(result).toMatch(/\bme\b/);
    // Federation lifts `@key` into `@join__type(..., key: "id")`.
    expect(result).toMatch(/key:\s*"id"/);
    expect(result).toMatchSnapshot();
  });

  describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
    it('GetMe via mock Graph', async () => {
      process.env.MSGRAPH_ACCESS_TOKEN = MOCK_TOKEN;
      const composition = await compose({
        output: 'graphql',
        services: [graph],
      });
      const { execute } = await serve({
        runner,
        supergraph: composition.output,
        env: {
          MSGRAPH_ACCESS_TOKEN: MOCK_TOKEN,
        },
      });
      await expect(execute({ query: getMeQuery })).resolves.toMatchSnapshot();
    });
  });
});
