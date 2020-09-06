import { MergerFn } from '@graphql-mesh/types';
import { extendSchema, GraphQLSchema } from 'graphql';
import { wrapSchema } from '@graphql-tools/wrap';
import { addResolversToSchema } from '@graphql-tools/schema';

export const mergeSingleSchema: MergerFn = ({ rawSources, typeDefs, resolvers, transforms }) => {
  if (rawSources.length !== 1) {
    throw new Error('This merger supports only one schema');
  }
  const [source] = rawSources;
  let schema: GraphQLSchema;
  if (source.executor || source.subscriber || source.transforms?.length || transforms?.length) {
    schema = wrapSchema(source, transforms);
  } else {
    schema = source.schema;
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
  schema.extensions = schema.extensions || {};
  Object.defineProperty(schema.extensions, 'sourceMap', {
    get: () => new Map([[source, source.schema]]),
  });
  return schema;
};
