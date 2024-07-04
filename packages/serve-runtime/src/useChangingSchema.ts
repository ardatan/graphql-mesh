import type { GraphQLSchema } from 'graphql';
import type { MaybePromise } from '@graphql-tools/utils';
import type { MeshServePlugin } from './types';

export function useChangingSchema(
  getSchema: () => MaybePromise<GraphQLSchema>,
  schemaChanged: (cb: (schema: GraphQLSchema) => void) => void,
): MeshServePlugin {
  let currentSchema: GraphQLSchema | undefined;
  const schemaByRequest = new WeakMap<Request, GraphQLSchema>();
  return {
    onPluginInit({ setSchema }) {
      schemaChanged(schema => {
        if (currentSchema !== schema) {
          setSchema(schema);
          currentSchema = schema;
        }
      });
    },
    onRequestParse({ request }) {
      return {
        async onRequestParseDone() {
          if (!currentSchema) {
            // only if the schema is not already set do we want to get it
            const schema = await getSchema();
            currentSchema = schema;
            schemaByRequest.set(request, schema);
          }
        },
      };
    },
    onEnveloped({ context, setSchema }) {
      const schema = context?.request && schemaByRequest.get(context.request);
      if (schema && schema !== currentSchema) {
        // the schema will be available in the request only if schemaChanged was never invoked
        // also avoid setting the schema multiple times by checking whether it was already set
        setSchema(schema);
      }
    },
  };
}
