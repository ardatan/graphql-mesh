import { Hooks } from '@graphql-mesh/types';
import { GraphQLSchema, GraphQLResolveInfo } from 'graphql';
import { extractResolversFromSchema, composeResolvers } from '@graphql-toolkit/common';
import { addResolveFunctionsToSchema, IResolvers } from 'graphql-tools-fork';

export function applyResolversHooksToResolvers(resolvers: IResolvers, hooks: Hooks): IResolvers {
  return composeResolvers(resolvers, {
    '*.*': originalResolver => async (parentOrKind, args, context, info: GraphQLResolveInfo) => {
      hooks.emit('resolverCalled', {
        parent: parentOrKind,
        args,
        context,
        info,
      });

      try {
        /*
        // Patch SDK for stitching
        for (let apiName in context) {
          if (typeof context[apiName] === 'object' && 'api' in context[apiName]) {
            for (let fnName in context[apiName].api) {
              const originalFn = context[apiName].api[fnName].bind(context[apiName].api);
              context[apiName].api[fnName] = (passedArgs: any, passedContext: any, passedInfo: any) => 
                originalFn(passedArgs || args, passedContext || context, passedInfo ||info);
            }
          }
        }
        */

        const result = await originalResolver(parentOrKind, args, context, info);

        hooks.emit('resolverDone', { parent: parentOrKind, args, context, info }, result);

        return result;
      } catch (e) {
        hooks.emit('resolverError', { parent: parentOrKind, args, context, info }, e);

        throw e;
      }
    },
  });
}

export function applyResolversHooksToSchema(schema: GraphQLSchema, hooks: Hooks): GraphQLSchema {
  const sourceResolvers = extractResolversFromSchema(schema);

  return addResolveFunctionsToSchema({
    schema,
    resolvers: applyResolversHooksToResolvers(sourceResolvers, hooks),
  });
}
