import { Hooks } from '@graphql-mesh/types';
import { GraphQLSchema, GraphQLResolveInfo, Kind } from 'graphql';
import {
  extractResolversFromSchema,
  composeResolvers
} from '@graphql-toolkit/common';
import { addResolveFunctionsToSchema, IResolvers } from 'graphql-tools-fork';

export function applyResolversHooksToResolvers(
  resolvers: IResolvers,
  hooks: Hooks
): IResolvers {
  return composeResolvers(resolvers, {
    '*.*': originalResolver => (
      parentOrKind,
      args,
      context,
      info: GraphQLResolveInfo
    ) => {
      // In case this is a scalar resolver, just run it as-is, without wrapping
      // TODO: Fix in graphql-toolkit
      if (parentOrKind && parentOrKind.kind) {
        return originalResolver(parentOrKind, args, context, info);
      }

      hooks.emit('resolverCalled', { parent: parentOrKind, args, context, info });

      return Promise.resolve(originalResolver(parentOrKind, args, context, info))
        .then(result => {
          hooks.emit('resolverDone', { parent: parentOrKind, args, context, info }, result);

          return result;
        })
        .catch(e => {
          hooks.emit('resolverError', { parent: parentOrKind, args, context, info }, e);

          throw e;
        });
    }
  });
}

export function applyResolversHooksToSchema(
  schema: GraphQLSchema,
  hooks: Hooks
): GraphQLSchema {
  const sourceResolvers = extractResolversFromSchema(schema);

  return addResolveFunctionsToSchema({
    schema,
    resolvers: applyResolversHooksToResolvers(sourceResolvers, hooks)
  });
}
