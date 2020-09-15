import { MergerFn } from '@graphql-mesh/types';
import { stitchSchemas } from '@graphql-tools/stitch';
import { wrapSchema } from '@graphql-tools/wrap';
import { mergeSingleSchema } from './mergeSingleSchema';
import { groupTransforms } from '@graphql-mesh/utils';
import { applySchemaTransforms } from '@graphql-tools/utils';

const mergeUsingStitching: MergerFn = async function (options) {
  if (options.rawSources.length === 1) {
    return mergeSingleSchema(options);
  }
  const { rawSources, typeDefs, resolvers, transforms } = options;
  let unifiedSchema = stitchSchemas({
    subschemas: rawSources,
    typeDefs,
    resolvers,
  });
  unifiedSchema.extensions = unifiedSchema.extensions || {};
  Object.defineProperty(unifiedSchema.extensions, 'sourceMap', {
    get: () => unifiedSchema.extensions.stitchingInfo.transformedSchemas,
  });
  if (transforms?.length) {
    const { noWrapTransforms, wrapTransforms } = groupTransforms(transforms);
    if (wrapTransforms.length) {
      unifiedSchema = wrapSchema(unifiedSchema, wrapTransforms);
    }
    if (noWrapTransforms.length) {
      unifiedSchema = applySchemaTransforms(unifiedSchema, noWrapTransforms);
    }
  }
  return unifiedSchema;
};

export default mergeUsingStitching;
