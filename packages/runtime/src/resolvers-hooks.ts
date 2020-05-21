import { Hooks } from '@graphql-mesh/types';
import { GraphQLSchema } from 'graphql';
import { composeResolvers } from '@graphql-tools/resolvers-composition';
import { IResolvers, getResolversFromSchema } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';

export function applyResolversHooksToResolvers(resolvers: IResolvers, hooks: Hooks): IResolvers {
  return composeResolvers(resolvers, {
    '*.*': originalResolver => async (parent, args, context, info) => {
      const resolverData = {
        parent,
        args,
        context,
        info,
      };
      hooks.emit('resolverCalled', resolverData);

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

        const result = await originalResolver(parent, args, context, info);

        hooks.emit('resolverDone', resolverData, result);

        return result;
      } catch (e) {
        hooks.emit('resolverError', resolverData, e);

        throw e;
      }
    },
  });
}

export function applyResolversHooksToSchema(schema: GraphQLSchema, hooks: Hooks): GraphQLSchema {
  const sourceResolvers = getResolversFromSchema(schema);

  return addResolversToSchema({
    schema,
    resolvers: applyResolversHooksToResolvers(sourceResolvers, hooks),
    updateResolversInPlace: true,
  });
}
