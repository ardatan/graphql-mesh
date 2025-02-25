import {
  buildClientSchema,
  buildSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  Kind,
  lexicographicSortSchema,
  parse,
  print,
  validate,
  visit,
} from 'graphql';
import { getUnifiedGraphGracefully, type SubgraphConfig } from '@graphql-mesh/fusion-composition';
import { UnifiedGraphManager } from '@graphql-mesh/fusion-runtime';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import {
  getDocumentNodeFromSchema,
  isAsyncIterable,
  printSchemaWithDirectives,
} from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export function composeAndGetPublicSchema(subgraphs: SubgraphConfig[]) {
  const executor = composeAndGetExecutor(subgraphs);
  return handleMaybePromise(
    () => executor({ query: getIntrospectionQuery() }),
    result => buildClientSchema(result),
  );
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
  return function testExecutor({
    query,
    variables: variableValues,
  }: {
    query: string;
    variables?: Record<string, any>;
  }) {
    const document = parse(query);
    return handleMaybePromise(
      () => manager.getUnifiedGraph(),
      schema => {
        const validationErrors = validate(schema, document);
        if (validationErrors.length === 1) {
          throw validationErrors[0];
        }
        if (validationErrors.length > 1) {
          throw new AggregateError(validationErrors);
        }
        return handleMaybePromise(
          () => manager.getContext(),
          contextValue =>
            handleMaybePromise(
              () =>
                normalizedExecutor({
                  schema,
                  document,
                  contextValue,
                  variableValues,
                }),
              res => {
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
              },
            ),
        );
      },
    );
  };
}

export function expectTheSchemaSDLToBe(schema: GraphQLSchema, sdl: string) {
  const schemaFromSdl = buildSchema(sdl, {
    noLocation: true,
    assumeValid: true,
    assumeValidSDL: true,
  });
  const sortedSchemaFromSdl = printSchemaWithDirectives(lexicographicSortSchema(schemaFromSdl));
  let astFromGivenSchema = getDocumentNodeFromSchema(lexicographicSortSchema(schema));
  astFromGivenSchema = visit(astFromGivenSchema, {
    [Kind.DIRECTIVE_DEFINITION]() {
      return null;
    },
  });
  const sortedGivenSchema = print(astFromGivenSchema);
  expect(sortedGivenSchema).toBe(sortedSchemaFromSdl);
}
