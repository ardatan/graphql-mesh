import {
  buildClientSchema,
  buildSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  lexicographicSortSchema,
  printSchema,
  validate,
} from 'graphql';
import { composeSubgraphs, SubgraphConfig } from '@graphql-mesh/fusion-composition';
import { mapMaybePromise } from '@graphql-mesh/utils';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { getExecutorForFusiongraph } from '../src/useFusiongraph';

export function composeAndGetPublicSchema(subgraphs: SubgraphConfig[]) {
  const executor = composeAndGetExecutor(subgraphs);
  return mapMaybePromise(
    executor({
      query: getIntrospectionQuery(),
    }),
    introspection => buildClientSchema(introspection),
  );
}

export function composeAndGetExecutor(subgraphs: SubgraphConfig[]) {
  const fusiongraph = composeSubgraphs(subgraphs);
  return getExecutorForFusiongraph({
    getFusiongraph: () => fusiongraph,
    transports() {
      return {
        getSubgraphExecutor({ subgraphName }) {
          const subgraphConfig = subgraphs.find(s => s.name === subgraphName);
          if (!subgraphConfig) {
            throw new Error(`Subgraph ${subgraphName} not found`);
          }
          const subgraphExecutor = createDefaultExecutor(subgraphConfig.schema);
          return function defaultExecutor(req) {
            const validationErrors = validate(subgraphConfig.schema, req.document);
            if (validationErrors.length) {
              return {
                errors: validationErrors,
              };
            }
            return subgraphExecutor(req);
          };
        },
      };
    },
  });
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
