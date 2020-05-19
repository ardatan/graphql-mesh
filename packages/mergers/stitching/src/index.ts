import { KeyValueCache, Hooks, RawSourceOutput } from '@graphql-mesh/types';
import { GraphQLSchema } from 'graphql';
import { mergeSchemas } from 'graphql-tools';

const mergeUsingStitching = async function ({
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
};

export default mergeUsingStitching;
