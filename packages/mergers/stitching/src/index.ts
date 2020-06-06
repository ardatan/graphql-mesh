import { MergerFn } from '@graphql-mesh/types';
import { GraphQLSchema } from 'graphql';
import { stitchSchemas } from '@graphql-tools/stitch';
import { applySchemaTransforms } from '@graphql-tools/utils';

const mergeUsingStitching: MergerFn = async function ({
  rawSources,
  typeDefs,
  resolvers,
  transforms,
}): Promise<GraphQLSchema> {
  const unifiedSchema = stitchSchemas({
    subschemas: rawSources,
    typeDefs,
    resolvers,
    schemaTransforms: [schema => applySchemaTransforms(schema, transforms)],
  });
  (unifiedSchema.extensions as any).sourceMap = unifiedSchema.extensions.stitchingInfo.transformedSchemas;
  return unifiedSchema;
};

export default mergeUsingStitching;
