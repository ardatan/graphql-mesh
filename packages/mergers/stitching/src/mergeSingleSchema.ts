import { MergerFn, MeshTransform } from '@graphql-mesh/types';
import { extendSchema } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';
import { addResolversToSchema } from '@graphql-tools/schema';
import { groupTransforms, applySchemaTransforms } from '@graphql-mesh/utils';

export const mergeSingleSchema: MergerFn = ({ rawSources, typeDefs, resolvers, transforms }) => {
  if (rawSources.length !== 1) {
    throw new Error('This merger supports only one schema');
  }
  const [source] = rawSources;
  let schema = source.schema;

  let wrapTransforms: MeshTransform[] = [];
  let noWrapTransforms: MeshTransform[] = [];

  if (transforms?.length) {
    const transformGroups = groupTransforms(transforms);
    wrapTransforms = transformGroups.wrapTransforms;
    noWrapTransforms = transformGroups.noWrapTransforms;
  }

  if (source.executor || source.transforms.length) {
    const firstRoundTransforms = [...source.transforms];
    if (!typeDefs && !resolvers) {
      firstRoundTransforms.push(...wrapTransforms, ...noWrapTransforms);
    }
    schema = wrapSchema({
      ...source,
      schema,
      transforms: firstRoundTransforms,
    });
  }
  if (typeDefs || resolvers) {
    typeDefs?.forEach(typeDef => {
      schema = extendSchema(schema, typeDef);
    });
    if (resolvers) {
      schema = addResolversToSchema({
        schema,
        resolvers,
        updateResolversInPlace: true,
      });
    }
    if (wrapTransforms.length) {
      schema = wrapSchema({
        schema,
        transforms: [...wrapTransforms, ...noWrapTransforms],
      });
    } else if (noWrapTransforms.length) {
      schema = applySchemaTransforms(schema, undefined, schema, noWrapTransforms);
    }
  }
  schema.extensions = schema.extensions || {};
  Object.defineProperty(schema.extensions, 'sourceMap', {
    get: () => new Map([[source, schema]]),
  });
  return schema;
};
