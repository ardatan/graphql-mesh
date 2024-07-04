import type { GraphQLSchema } from 'graphql';
import type { MaybePromise } from '@graphql-tools/utils';
import type { MeshServePlugin } from './types';

export function useChangingSchema(
  getSchema: () => MaybePromise<GraphQLSchema>,
  schemaChanged: (cb: (schema: GraphQLSchema) => void) => void,
): MeshServePlugin {
  let schemaSet = false;
  const schemaByRequest = new WeakMap<Request, GraphQLSchema>();
  return {
    onPluginInit({ setSchema }) {
      schemaChanged(schema => {
        setSchema(schema);
        schemaSet = true;
      });
    },
    onRequestParse({ request }) {
      return {
        async onRequestParseDone() {
          if (!schemaSet) {
            // only if the schema is not already set do we want to get it
            schemaByRequest.set(request, await getSchema());
          }
        },
      };
    },
    onEnveloped({ context, setSchema }) {
      if (context?.request == null) {
        throw new Error(
          'Request object is not available in the context. Make sure you use this plugin with GraphQL Mesh.',
        );
      }
      const schema = schemaByRequest.get(context.request);
      if (schema && !schemaSet) {
        // the schema will be available in the request only if schemaChanged was never invoked
        // also avoid setting the schema multiple times by checking whether it was already set
        setSchema(schema);
      }
    },
  };
}
