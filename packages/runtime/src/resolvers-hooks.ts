import { MeshPubSub, ResolverData } from '@graphql-mesh/types';
import { GraphQLSchema } from 'graphql';
import { composeResolvers } from '@graphql-tools/resolvers-composition';
import { IResolvers } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { extractResolvers } from '@graphql-mesh/utils';

export function applyResolversHooksToResolvers(resolvers: IResolvers, pubsub: MeshPubSub): IResolvers {
  return composeResolvers(resolvers, {
    '*.*':
      (originalResolver: any) =>
      async (...resolverArgs: any[]) => {
        let resolverData: ResolverData;

        let isArgsInResolversArgs: boolean;

        if (resolverArgs.length === 3) {
          resolverData = {
            root: resolverArgs[0],
            context: resolverArgs[1] || {},
            info: resolverArgs[2],
          };
          isArgsInResolversArgs = false;
        } else if (resolverArgs.length === 4) {
          resolverData = {
            root: resolverArgs[0],
            args: resolverArgs[1],
            context: resolverArgs[2] || {},
            info: resolverArgs[3],
          };
          isArgsInResolversArgs = true;
        } else {
          throw new Error('Unexpected resolver params given');
        }

        pubsub.publish('resolverCalled', { resolverData });

        try {
          const result = await (isArgsInResolversArgs
            ? originalResolver(resolverData.root, resolverData.args, resolverData.context, resolverData.info)
            : originalResolver(resolverData.root, resolverData.context, resolverData.info));

          pubsub.publish('resolverDone', { resolverData, result });

          return result;
        } catch (error) {
          pubsub.publish('resolverError', { resolverData, error });

          throw error;
        }
      },
  });
}

export function applyResolversHooksToSchema(schema: GraphQLSchema, pubsub: MeshPubSub): GraphQLSchema {
  const sourceResolvers = extractResolvers(schema);

  return addResolversToSchema({
    schema,
    resolvers: applyResolversHooksToResolvers(sourceResolvers, pubsub),
    updateResolversInPlace: true,
  });
}
