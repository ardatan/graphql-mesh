import { MergerFn, MeshTransform } from '@graphql-mesh/types';
import { extendSchema } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';
import { addResolversToSchema } from '@graphql-tools/schema';
import { groupTransforms } from '@graphql-mesh/utils';
import { applySchemaTransforms } from '@graphql-tools/utils';

export const mergeSingleSchema: MergerFn = ({ rawSources, typeDefs, resolvers, transforms }) => {
  if (rawSources.length !== 1) {
    throw new Error('This merger supports only one schema');
  }
  const [source] = rawSources;
  let schema = source.schema;

  let wrapTransforms: MeshTransform[] = [];
  let noWrapTransforms: MeshTransform[] = [];
  if (transforms?.length || source.transforms?.length) {
    const transformGroups = groupTransforms([...(transforms || []), ...(source.transforms || [])]);
    wrapTransforms = transformGroups.wrapTransforms;
    noWrapTransforms = transformGroups.noWrapTransforms;
  }

  if (source.executor || source.subscriber || wrapTransforms.length) {
    schema = wrapSchema(
      {
        ...source,
        schema,
      },
      wrapTransforms
    );
  }
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
  if (noWrapTransforms.length) {
    schema = applySchemaTransforms(schema, noWrapTransforms);
  }
  schema.extensions = schema.extensions || {};
  Object.defineProperty(schema.extensions, 'sourceMap', {
    get: () => new Map([[source, source.schema]]),
  });
  return schema;
};
