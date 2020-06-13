import { MergerFn } from '@graphql-mesh/types';
import { stitchSchemas } from '@graphql-tools/stitch';
import { wrapSchema } from '@graphql-tools/wrap';

const mergeUsingStitching: MergerFn = async function ({ rawSources, typeDefs, resolvers, transforms }) {
  const unifiedSchema = stitchSchemas({
    subschemas: rawSources,
    typeDefs,
    resolvers,
  });
  unifiedSchema.extensions = unifiedSchema.extensions || {};
  Object.defineProperty(unifiedSchema.extensions, 'sourceMap', {
    get: () => unifiedSchema.extensions.stitchingInfo.transformedSchemas,
  });
  if (transforms?.length) {
    return wrapSchema(unifiedSchema, transforms);
  }
  return unifiedSchema;
};

export default mergeUsingStitching;
