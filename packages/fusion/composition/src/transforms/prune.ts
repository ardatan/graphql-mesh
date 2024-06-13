import { GraphQLSchema } from 'graphql';
import { pruneSchema, PruneSchemaOptions } from '@graphql-tools/utils';
import { SubgraphTransform } from '../compose';

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
