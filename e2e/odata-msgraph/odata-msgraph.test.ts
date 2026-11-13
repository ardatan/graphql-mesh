import { createTenv, type ServeRunner } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

const TOKEN = process.env.MSGRAPH_ACCESS_TOKEN || process.env.GRAPH_ACCESS_TOKEN;

/** Live `$metadata` is ~1.8MB — skip in CI unless opted in or a token is present. */
const runLiveMetadata =
  !process.env.CI || Boolean(TOKEN) || process.env.MSGRAPH_LIVE === '1';

const getMeQuery = /* GraphQL */ `
  query GetMe {
    me {
      id
      displayName
    }
  }
`;

(runLiveMetadata ? it : it.skip)(
  'composes Connectors from live MS Graph $metadata',
  async () => {
    jest.setTimeout(180_000);
    const { result } = await compose();
    expect(result).toContain('@join__directive');
    expect(result).toContain('name: "source"');
    expect(result).toContain('name: "connect"');
    expect(result).toContain('odata.metadata=minimal');
    expect(result).toContain('kind: "rest"');
    expect(result).toMatch(/\bme\b/);
    expect(result).toContain('graph.microsoft.com');
  },
  180_000,
);

describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
  (TOKEN ? it : it.skip)(
    'live GetMe',
    async () => {
      jest.setTimeout(180_000);
      // Connectors `{$env.MSGRAPH_ACCESS_TOKEN}` + Mesh `{env.MSGRAPH_ACCESS_TOKEN}`.
      process.env.MSGRAPH_ACCESS_TOKEN = TOKEN!;

      const composition = await compose({ output: 'graphql' });
      const { execute } = await serve({
        runner,
        supergraph: composition.output,
        env: {
          MSGRAPH_ACCESS_TOKEN: TOKEN!,
        },
      });

      const result = await execute({ query: getMeQuery });
      expect(result.errors).toBeUndefined();
      expect(result.data?.me).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          displayName: expect.any(String),
        }),
      );
    },
    180_000,
  );
});
