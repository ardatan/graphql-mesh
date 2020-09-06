import { MergerFn } from '@graphql-mesh/types';
import { extendSchema } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';
import { addResolversToSchema } from '@graphql-tools/schema';
import { pruneSchema } from '@graphql-tools/utils';

export const mergeSingleSchema: MergerFn = ({ rawSources, typeDefs, resolvers, transforms }) => {
  if (rawSources.length !== 1) {
    throw new Error('This merger supports only one schema');
  }
  const [source] = rawSources;
  let schema = source.schema;
  typeDefs?.forEach(typeDef => {
    schema = extendSchema(schema, typeDef);
  });
  if (source.executor || source.subscriber || source.transforms?.length || transforms?.length) {
    schema = wrapSchema(
      {
        ...source,
        schema,
      },
      transforms
    );
  }
  if (resolvers) {
    schema = addResolversToSchema({
      schema,
      resolvers,
      updateResolversInPlace: true,
    });
  }
  schema.extensions = schema.extensions || {};
  Object.defineProperty(schema.extensions, 'sourceMap', {
    get: () => new Map([[source, source.schema]]),
  });
  return pruneSchema(schema);
};
