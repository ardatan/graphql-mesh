import { MergerFn } from '@graphql-mesh/types';
import { stitchSchemas } from '@graphql-tools/stitch';
import { wrapSchema } from '@graphql-tools/wrap';
import { mergeSingleSchema } from './mergeSingleSchema';

const mergeUsingStitching: MergerFn = async function (options) {
  if (options.rawSources.length === 1) {
    return mergeSingleSchema(options);
  }
  const { rawSources, typeDefs, resolvers, transforms } = options;
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
