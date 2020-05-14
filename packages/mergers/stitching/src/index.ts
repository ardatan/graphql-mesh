import { KeyValueCache, Hooks, RawSourceOutput } from '@graphql-mesh/types';
import { GraphQLSchema } from 'graphql';
import { stitchSchemas } from '@graphql-tools/stitch';

const mergeUsingStitching = async function ({
  rawSources,
  cache,
  hooks,
}: {
  rawSources: RawSourceOutput[];
  cache: KeyValueCache;
  hooks: Hooks;
}): Promise<GraphQLSchema> {
  return stitchSchemas({
    schemas: rawSources.map(rawSource => rawSource.schema),
  });
};

export default mergeUsingStitching;
