import { MergerFn } from '@graphql-mesh/types';
import { GraphQLSchema } from 'graphql';
import { stitchSchemas } from '@graphql-tools/stitch';

const mergeUsingStitching: MergerFn = async function ({ rawSources, typeDefs, resolvers }): Promise<GraphQLSchema> {
  return stitchSchemas({
    subschemas: rawSources.map(rawSource => rawSource.schema),
    typeDefs,
    resolvers,
  });
};

export default mergeUsingStitching;
