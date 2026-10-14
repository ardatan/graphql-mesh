import { execute, parse, type GraphQLSchema } from 'graphql';
import { LegacyLogger, Logger } from '@graphql-hive/logger';
import { handleResolveToDirectives, wrapExecutorWithHooks } from '@graphql-mesh/fusion-runtime';
import { getInContextSDK } from '@graphql-mesh/utils';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { stitchSchemas } from '@graphql-tools/stitch';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { describe, expect, it, jest } from '@jest/globals';
import { createEntityCache, type EntityRule } from '../src/index.js';
import { createMemoryEntityStore } from '../src/memory-store.js';

const log = new Logger({ level: false });
const logger = LegacyLogger.from(log);
function hook(
  executor: any,
  schema: GraphQLSchema,
  source: string,
  cache: ReturnType<typeof createEntityCache>,
) {
  return wrapExecutorWithHooks({
    executor,
    subgraphName: source,
    onSubgraphExecuteHooks: [cache.plugin.onSubgraphExecute!],
    getSubgraphSchema: () => schema,
    transportEntryMap: {},
    transportContext: { log, logger },
    instrumentation: () => undefined,
  });
}
const rule: EntityRule = {
  source: 'Assets',
  field: 'equipmentMetadata',
  revision: 'v1',
  entityType: 'Equipment',
  ttlSeconds: 86400,
  ordering: 'key-grouped',
  isComplete: () => true, // #9658: these fixture resolvers exhaust every requested identity group.
  scope: () => 'public',
  identityField: 'assetTag',
  selection: field =>
    !!field.selectionSet &&
    field.selectionSet.selections.every(
      node => node.kind === 'Field' && ['assetTag', 'description'].includes(node.name.value),
    ),
  batch: args => ({ keys: args.tags as string[], withKeys: keys => ({ tags: keys }) }),
  identity: row => (row as any)?.assetTag ?? null,
};

// #9658: exercise supported Hive hooks and real delegate batching without a source-specific runtime adapter.
describe('entity cache through Mesh and Hive delegation', () => {
  it('reuses non-Strapi canonical rows through @resolveTo across vendors while live stock and price refresh', async () => {
    let stock = 2;
    const metadata = makeExecutableSchema({
      typeDefs:
        'type Equipment { assetTag: ID! description: String } type Query { equipmentMetadata(tags: [ID!]!): [Equipment] }',
      resolvers: {
        Query: {
          equipmentMetadata: (_r, { tags }) =>
            tags.map((assetTag: string) => ({ assetTag, description: `Reusable ${assetTag}` })),
        },
      },
    });
    const inventory = makeExecutableSchema({
      typeDefs:
        'type Offer { assetTag: ID! price: Int! stock: Int! } type Query { offers(vendor: ID!): [Offer!]! }',
      resolvers: {
        Query: {
          offers: (_r, { vendor }) => [
            { assetTag: 'T23', price: vendor === 'one' ? 500 : 700, stock },
          ],
        },
      },
    });
    const cache = createEntityCache({ store: createMemoryEntityStore(), rules: [rule] });
    const executor = jest.fn((req: any) =>
      execute({
        schema: metadata,
        document: req.document,
        variableValues: req.variables,
        contextValue: req.context,
      }),
    );
    const sources = [
      { name: 'Assets', schema: metadata, executor: hook(executor, metadata, 'Assets', cache) },
      { name: 'Inventory', schema: inventory },
    ];
    const resolvers: any[] = [];
    const typeDefs = handleResolveToDirectives(
      '',
      `extend type Offer { metadata: Equipment @resolveTo(sourceName: "Assets", sourceTypeName: "Query", sourceFieldName: "equipmentMetadata", keyField: "assetTag", keysArg: "tags") }`,
      resolvers,
    );
    const unified = stitchSchemas({ subschemas: sources, typeDefs, resolvers });
    const sdk = getInContextSDK(unified, sources as any, logger, []);
    const document = parse(
      'query($vendor:ID!){ offers(vendor:$vendor){ price stock metadata { description } } }',
    );
    const cold: any = await execute({
      schema: unified,
      document,
      variableValues: { vendor: 'one' },
      contextValue: { ...sdk },
    });
    stock = 8;
    const warm: any = await execute({
      schema: unified,
      document,
      variableValues: { vendor: 'two' },
      contextValue: { ...sdk },
    });
    expect(cold.errors).toBeUndefined();
    expect(warm.errors).toBeUndefined();
    expect(warm.data.offers[0].metadata).toEqual(cold.data.offers[0].metadata);
    expect(warm.data.offers[0].price).toBe(700);
    expect(warm.data.offers[0].stock).toBe(8);
    expect(warm.data.offers[0].metadata).toEqual({ description: 'Reusable T23' });
    expect(executor).toHaveBeenCalledTimes(1);
    expect(cache.metrics.hits).toBe(1);
  });
  it('reuses entity rows through real stitching @merge directive batching', async () => {
    const directives = stitchingDirectives();
    const inventory = makeExecutableSchema({
      typeDefs: `${directives.stitchingDirectivesTypeDefs} type Equipment @key(selectionSet: "{ assetTag }") { assetTag: ID! stock: Int } type Query { equipment: [Equipment!]! }`,
      resolvers: {
        Query: {
          equipment: () => [
            { assetTag: 'T23', stock: 2 },
            { assetTag: 'T24', stock: 3 },
          ],
        },
      },
    });
    const metadata = makeExecutableSchema({
      typeDefs: `${directives.stitchingDirectivesTypeDefs} type Equipment @key(selectionSet: "{ assetTag }") { assetTag: ID! description: String } type Query { equipmentMetadata(tags: [ID!]!): [Equipment] @merge(keyField: "assetTag") }`,
      resolvers: {
        Query: {
          equipmentMetadata: (_r, { tags }) =>
            tags.map((assetTag: string) => ({ assetTag, description: `Reusable ${assetTag}` })),
        },
      },
    });
    const cache = createEntityCache({ store: createMemoryEntityStore(), rules: [rule] });
    const executor = jest.fn((req: any) =>
      execute({ schema: metadata, document: req.document, variableValues: req.variables }),
    );
    const unified = stitchSchemas({
      subschemaConfigTransforms: [directives.stitchingDirectivesTransformer],
      subschemas: [
        { schema: inventory },
        { name: 'Assets', schema: metadata, executor: hook(executor, metadata, 'Assets', cache) },
      ],
    });
    const document = parse('{ equipment { assetTag stock description } }');
    const cold = await execute({ schema: unified, document, contextValue: { request: 'cold' } });
    const warm = await execute({ schema: unified, document, contextValue: { request: 'warm' } });
    expect(cold.errors).toBeUndefined();
    expect(warm).toEqual(cold);
    expect(executor).toHaveBeenCalledTimes(1);
    expect(cache.metrics.hits).toBe(2);
  });
});
