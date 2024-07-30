import type { GraphQLSchema } from 'graphql';
import { mapMaybePromise } from '@graphql-mesh/utils';
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
        onRequestParseDone() {
          if (!currentSchema) {
            // only if the schema is not already set do we want to get it
            return mapMaybePromise(getSchema(), schema => {
              schemaByRequest.set(request, schema);
            }) as any; // TODO: PromiseLike in Mesh MaybePromise is not assignable to type Yoga's PromiseOrValue
          }
        },
      };
    },
    onEnveloped({ context, setSchema }) {
      const schema = context?.request && schemaByRequest.get(context.request);
      if (schema && currentSchema !== schema) {
        // the schema will be available in the request only if schemaChanged was never invoked
        // also avoid setting the schema multiple times by checking whether it was already set
        setSchema(schema);
        currentSchema = schema;
      }
    },
  };
}
