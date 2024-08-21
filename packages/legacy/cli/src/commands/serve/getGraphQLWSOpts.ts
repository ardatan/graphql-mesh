import type { execute, ExecutionArgs, subscribe } from 'graphql';
import type { useServer } from 'graphql-ws/lib/use/ws';
import type { MeshInstance } from '@graphql-mesh/runtime';

export function getGraphQLWSOptions(getBuiltMesh: () => Promise<MeshInstance>) {
  // yoga's envelop may augment the `execute` and `subscribe` operations
  // so we need to make sure we always use the freshest instance
  type EnvelopedExecutionArgs = ExecutionArgs & {
    rootValue: {
      execute: typeof execute;
      subscribe: typeof subscribe;
    };
  };
  return {
    execute: (args: EnvelopedExecutionArgs) => args.rootValue.execute(args),
    subscribe: (args: EnvelopedExecutionArgs) => args.rootValue.subscribe(args),
    onSubscribe: async (ctx, msg) => {
      const { getEnveloped } = await getBuiltMesh();
      const { schema, execute, subscribe, contextFactory, parse, validate } = getEnveloped(ctx);

      const args: EnvelopedExecutionArgs = {
        schema,
        operationName: msg.payload.operationName,
        document: parse(msg.payload.query),
        variableValues: msg.payload.variables,
        contextValue: await contextFactory(),
        rootValue: {
          execute,
          subscribe,
        },
      };

      const errors = validate(args.schema, args.document);
      if (errors.length) return errors;
      return args;
    },
  } as Parameters<typeof useServer>[0];
}
