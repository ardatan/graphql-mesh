import { MergerFn, MeshTransform } from '@graphql-mesh/types';
import { wrapSchema } from '@graphql-tools/wrap';
import { groupTransforms, applySchemaTransforms } from '@graphql-mesh/utils';
import { mergeSchemasAsync } from '@graphql-tools/merge';

const mergeBare: MergerFn = async ({ rawSources, typeDefs, resolvers, transforms }) => {
  const sourceMap = new Map();
  const schemas = rawSources.map(source => {
    let schema = source.schema;

    if (source.executor || source.transforms.length) {
      schema = wrapSchema({
        ...source,
        schema,
        transforms: source.transforms,
      });
    }
    sourceMap.set(source, schema);
    return schema;
  });

  let schema = await mergeSchemasAsync({
    schemas,
    typeDefs,
    resolvers,
  });

  let wrapTransforms: MeshTransform[] = [];
  let noWrapTransforms: MeshTransform[] = [];

  if (transforms?.length) {
    const transformGroups = groupTransforms(transforms);
    wrapTransforms = transformGroups.wrapTransforms;
    noWrapTransforms = transformGroups.noWrapTransforms;
  }

  if (wrapTransforms.length) {
    schema = wrapSchema({
      schema,
      transforms: [...wrapTransforms, ...noWrapTransforms],
    });
  } else if (noWrapTransforms.length) {
    schema = applySchemaTransforms(schema, undefined, schema, noWrapTransforms);
  }

  schema.extensions = schema.extensions || {};
  Object.defineProperty(schema.extensions, 'sourceMap', {
    get: () => sourceMap,
  });
  return schema;
};

export default mergeBare;
