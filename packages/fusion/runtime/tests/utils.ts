import {
  buildSchema,
  GraphQLSchema,
  lexicographicSortSchema,
  parse,
  printSchema,
  validate,
} from 'graphql';
import { getUnifiedGraphGracefully, type SubgraphConfig } from '@graphql-mesh/fusion-composition';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { isAsyncIterable } from '@graphql-tools/utils';
import { UnifiedGraphManager } from '../src/unifiedGraphManager.js';

export function composeAndGetPublicSchema(subgraphs: SubgraphConfig[]) {
  const manager = new UnifiedGraphManager({
    getUnifiedGraph: () => getUnifiedGraphGracefully(subgraphs),
    transports() {
      return {
        getSubgraphExecutor({ subgraphName }) {
          return createDefaultExecutor(
            subgraphs.find(subgraph => subgraph.name === subgraphName).schema,
          );
        },
      };
    },
  });
  return manager.getUnifiedGraph();
}

export function composeAndGetExecutor(subgraphs: SubgraphConfig[]) {
  const manager = new UnifiedGraphManager({
    getUnifiedGraph: () => getUnifiedGraphGracefully(subgraphs),
    transports() {
      return {
        getSubgraphExecutor({ subgraphName }) {
          const subgraph = subgraphs.find(subgraph => subgraph.name === subgraphName);
          if (!subgraph) {
            throw new Error(`Subgraph not found: ${subgraphName}`);
          }
          return createDefaultExecutor(subgraph.schema);
        },
      };
    },
  });
  return async function testExecutor({
    query,
    variables,
  }: {
    query: string;
    variables?: Record<string, any>;
  }) {
    const document = parse(query);
    const schema = await manager.getUnifiedGraph();
    const validationErrors = validate(schema, document);
    if (validationErrors.length === 1) {
      throw validationErrors[0];
    }
    if (validationErrors.length > 1) {
      throw new AggregateError(validationErrors);
    }
    const context = await manager.getContext();
    const res = await normalizedExecutor({
      schema,
      document,
      contextValue: context,
      variableValues: variables,
    });
    if (isAsyncIterable(res)) {
      throw new Error('AsyncIterable is not supported');
    }
    if (res.errors?.length === 1) {
      throw res.errors[0];
    }
    if (res.errors?.length > 1) {
      throw new AggregateError(res.errors);
    }
    return res.data;
  };
}

export function expectTheSchemaSDLToBe(schema: GraphQLSchema, sdl: string) {
  const schemaFromSdl = buildSchema(sdl, {
    noLocation: true,
    assumeValid: true,
    assumeValidSDL: true,
  });
  const sortedSchemaFromSdl = printSchema(lexicographicSortSchema(schemaFromSdl));
  const sortedGivenSchema = printSchema(lexicographicSortSchema(schema));
  expect(sortedGivenSchema).toBe(sortedSchemaFromSdl);
}
