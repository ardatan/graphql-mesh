import { RawSourceOutput } from '.';
import { KeyValueCache, Hooks } from '@graphql-mesh/types';
import { GraphQLSchema } from 'graphql';
import { mergeSchemas } from 'graphql-tools';

export async function createStitchedSchema({
  rawSources,
  cache,
  hooks,
}: {
  rawSources: RawSourceOutput[];
  cache: KeyValueCache;
  hooks: Hooks;
}): Promise<GraphQLSchema> {
  return mergeSchemas({
    schemas: rawSources.map(rawSource => rawSource.schema),
  });
}
