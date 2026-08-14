import type { YamlConfig } from '@graphql-mesh/types';
import { migrateLegacyConfig } from '../src/migrate';

async function migrate(config: YamlConfig.Config) {
  return migrateLegacyConfig(config);
}

describe('migrateLegacyConfig', () => {
  it('maps OpenAPI and GraphQL HTTP sources with prefix and filterSchema', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'Wiki',
          handler: {
            openapi: {
              source: './wiki.yaml',
            },
          },
          transforms: [
            {
              prefix: {
                value: 'Wiki_',
              },
            },
          ],
        },
        {
          name: 'Countries',
          handler: {
            graphql: {
              endpoint: 'https://countries.trevorblades.com/',
            },
          },
          transforms: [
            {
              filterSchema: {
                mode: 'wrap',
                filters: ['Query.continents'],
              },
            },
          ],
        },
      ],
    });

    expect(result.fatal).toBe(false);
    expect(result.messages).toEqual([]);
    expect(result.code).toMatchSnapshot();
    expect(result.addedPackages).toEqual(
      expect.arrayContaining([
        '@graphql-hive/gateway',
        '@graphql-mesh/compose-cli',
        '@omnigraph/openapi',
      ]),
    );
    expect(result.removedPackages).toEqual(
      expect.arrayContaining([
        '@graphql-mesh/cli',
        '@graphql-mesh/openapi',
        '@graphql-mesh/graphql',
      ]),
    );
    expect(result.code).not.toContain('plugins:');
    expect(result.code).toContain('loadOpenAPISubgraph');
    expect(result.code).toContain('loadGraphQLHTTPSubgraph');
    expect(result.code).toContain('createPrefixTransform');
    expect(result.code).toContain('createFilterTransform');
    expect(result.code).not.toContain('"mode"');
  });

  it('maps GraphQL code-first source to endpoint', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'Local',
          handler: {
            graphql: {
              source: './schema.ts',
            },
          },
        },
      ],
    });

    expect(result.fatal).toBe(false);
    expect(result.code).toContain('"endpoint":"./schema.ts"');
    expect(result.code).not.toContain('"source"');
  });

  it('fails on GraphQL multiple HTTP sources', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: {
            graphql: {
              sources: [{ endpoint: 'https://a' }, { endpoint: 'https://b' }],
            },
          },
        },
      ],
    });

    expect(result.fatal).toBe(true);
    expect(result.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('sources'),
        }),
      ]),
    );
  });

  it('fails on root-level transforms', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: { graphql: { endpoint: 'https://example.com/graphql' } },
        },
      ],
      transforms: [{ prefix: { value: 'Root_' } }],
    });

    expect(result.fatal).toBe(true);
    expect(result.messages.some(m => m.message.includes('Root-level transforms'))).toBe(true);
  });

  it('fails on removed transforms with replacement hints', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: { graphql: { endpoint: 'https://example.com/graphql' } },
          transforms: [{ typeMerging: { queryFields: [] } as any }],
        },
      ],
    });

    expect(result.fatal).toBe(true);
    expect(result.messages[0].message).toContain('createFederationTransform');
  });

  it('maps hive, responseCache, prometheus, rateLimit and maskedErrors plugins', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: { graphql: { endpoint: 'https://example.com/graphql' } },
        },
      ],
      plugins: [
        {
          hive: {
            token: 'token',
            persistedDocuments: { token: 'cdn' },
          },
        },
        {
          responseCache: {
            ttl: 1000,
          },
        },
        {
          prometheus: {
            skipIntrospection: true,
          },
        },
        {
          rateLimit: {
            max: 10,
            window: '1s',
          } as any,
        },
        {
          maskedErrors: true as any,
        },
      ],
    });

    expect(result.fatal).toBe(false);
    expect(result.code).toContain('reporting:');
    expect(result.code).toContain('"type":"hive"');
    expect(result.code).toContain('persistedDocuments:');
    expect(result.code).toContain('responseCaching:');
    expect(result.code).toContain('prometheus:');
    expect(result.code).toContain('rateLimiting:');
    expect(result.code).toContain('maskedErrors: true');
    expect(result.code).toMatchSnapshot();
  });

  it('maps serve options onto gatewayConfig', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: { graphql: { endpoint: 'https://example.com/graphql' } },
        },
      ],
      serve: {
        port: 4001,
        hostname: '0.0.0.0',
        endpoint: '/gql',
        cors: { origin: '*' },
        playground: false,
        healthCheckEndpoint: '/live',
        batchingLimit: 5,
      },
    });

    expect(result.fatal).toBe(false);
    expect(result.code).toContain('port: 4001');
    expect(result.code).toContain('host: "0.0.0.0"');
    expect(result.code).toContain('graphqlEndpoint: "/gql"');
    expect(result.code).toContain('graphiql: false');
    expect(result.code).toContain('healthCheckEndpoint: "/live"');
    expect(result.code).toContain('batching:');
    expect(result.code).toContain('cors:');
  });

  it('imports additionalResolvers strings and inlines objects', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: { graphql: { endpoint: 'https://example.com/graphql' } },
        },
      ],
      additionalResolvers: [
        './resolvers.ts',
        {
          targetTypeName: 'Query',
          targetFieldName: 'foo',
          sourceName: 'API',
          sourceTypeName: 'Query',
          sourceFieldName: 'foo',
        },
      ],
    });

    expect(result.fatal).toBe(false);
    expect(result.code).toContain(
      "import { default as additionalResolvers$0 } from './resolvers.ts'",
    );
    expect(result.code).toContain('additionalResolvers$0');
    expect(result.code).toContain('"targetFieldName":"foo"');
  });

  it('applies customFetch on compose and gateway', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: { graphql: { endpoint: 'https://example.com/graphql' } },
        },
      ],
      customFetch: './fetch.ts',
    });

    expect(result.fatal).toBe(false);
    expect(result.code).toContain("import { default as customFetch } from './fetch.ts'");
    expect(result.code).toContain('fetch: customFetch');
    expect(result.code).toContain('fetchAPI: { fetch: customFetch }');
  });

  it('warns on codegen and sdk but still writes config', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: { graphql: { endpoint: 'https://example.com/graphql' } },
        },
      ],
      codegen: {},
      sdk: {},
    });

    expect(result.fatal).toBe(false);
    expect(result.messages.filter(m => m.level === 'warn').map(m => m.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Code Generator'),
        expect.stringContaining('SDKs'),
      ]),
    );
  });

  it('fails on unknown handlers', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: {
            unknown: {},
          } as any,
        },
      ],
    });

    expect(result.fatal).toBe(true);
    expect(result.messages[0].message).toContain('unknown');
  });

  it('fails on supergraph handler', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'Super',
          handler: {
            supergraph: {
              source: './supergraph.graphql',
            },
          },
        },
      ],
    });

    expect(result.fatal).toBe(true);
    expect(result.messages[0].message).toContain('Hive Gateway');
  });

  it('maps extend typeDefs to createExtendTransform', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: { graphql: { endpoint: 'https://example.com/graphql' } },
          transforms: [
            {
              extend: {
                typeDefs: 'extend type Query { ping: String }',
                resolvers: './extend-resolvers.ts',
              },
            },
          ],
        },
      ],
    });

    expect(result.fatal).toBe(false);
    expect(result.code).toContain('createExtendTransform("extend type Query { ping: String }")');
    expect(result.messages.some(m => m.message.includes('extend.resolvers'))).toBe(true);
  });

  it('maps hoistField arrays to mapping option', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: { graphql: { endpoint: 'https://example.com/graphql' } },
          transforms: [
            {
              hoistField: [
                {
                  typeName: 'Query',
                  pathConfig: ['user', 'address'],
                  newFieldName: 'userAddress',
                },
              ],
            },
          ],
        },
      ],
    });

    expect(result.fatal).toBe(false);
    expect(result.code).toContain('createHoistFieldTransform');
    expect(result.code).toContain('"mapping"');
  });

  it('resolves unknown plugins via resolvePlugin', async () => {
    const result = await migrateLegacyConfig(
      {
        sources: [
          {
            name: 'API',
            handler: { graphql: { endpoint: 'https://example.com/graphql' } },
          },
        ],
        plugins: [{ mock: { mocks: true } as any }],
      },
      {
        resolvePlugin: async () => ({
          moduleName: '@graphql-mesh/plugin-mock',
          importName: 'useMock',
          factoryName: 'useMock',
        }),
      },
    );

    expect(result.fatal).toBe(false);
    expect(result.code).toContain("from '@graphql-mesh/plugin-mock'");
    expect(result.code).toContain('useMock({');
    expect(result.code).toContain('...ctx');
    expect(result.code).toContain('...{"mocks":true}');
  });

  it('does not slice non-object plugin config', async () => {
    const result = await migrateLegacyConfig(
      {
        sources: [
          {
            name: 'API',
            handler: { graphql: { endpoint: 'https://example.com/graphql' } },
          },
        ],
        plugins: [{ mock: true as any }],
      },
      {
        resolvePlugin: async () => ({
          moduleName: '@graphql-mesh/plugin-mock',
          importName: 'useMock',
          factoryName: 'useMock',
        }),
      },
    );

    expect(result.fatal).toBe(false);
    expect(result.code).toContain('useMock({\n          ...ctx\n        })');
    expect(result.code).not.toContain('ru');
  });

  it('emits named imports before skipSSLValidation assignment', async () => {
    const result = await migrate({
      sources: [
        {
          name: 'API',
          handler: { graphql: { endpoint: 'https://example.com/graphql' } },
        },
      ],
      require: ['dotenv/config'],
      skipSSLValidation: true,
    });

    const tlsIndex = result.code.indexOf("process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'");
    const namedImportIndex = result.code.indexOf('defineConfig as defineComposeConfig');
    const requireIndex = result.code.indexOf("import 'dotenv/config'");
    expect(requireIndex).toBeGreaterThanOrEqual(0);
    expect(namedImportIndex).toBeGreaterThan(requireIndex);
    expect(tlsIndex).toBeGreaterThan(namedImportIndex);
  });
});
