import type { GraphQLSchema } from 'graphql';
import type { PruneSchemaOptions } from '@graphql-tools/utils';
import { pruneSchema } from '@graphql-tools/utils';
import type { SubgraphTransform } from '../compose';

export type PruneTransformOptions = {
  skipPruning: PruneSchemaOptions['skipPruning'] | string[];
} & Omit<PruneSchemaOptions, 'skipPruning'>;

export function createPruneTransform(options?: PruneTransformOptions): SubgraphTransform {
  return function pruneTransform(schema: GraphQLSchema) {
    const skipPruningOption = options?.skipPruning;
    const pruneSchemaOpts: PruneSchemaOptions = {
      ...options,
      skipPruning: skipPruningOption
        ? Array.isArray(skipPruningOption)
          ? type => skipPruningOption.includes(type.name)
          : skipPruningOption
        : undefined,
    };
    return pruneSchema(schema, pruneSchemaOpts);
  };
}
