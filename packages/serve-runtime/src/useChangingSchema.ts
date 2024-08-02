import type { GraphQLSchema } from 'graphql';
import { mapMaybePromise } from '@graphql-mesh/utils';
import type { MaybePromise } from '@graphql-tools/utils';
import type { MeshServePlugin } from './types';

export function useChangingSchema(getSchema: () => MaybePromise<GraphQLSchema>): MeshServePlugin {
  let currentSchema: GraphQLSchema | undefined;
  let setSchema: (schema: GraphQLSchema) => void;
  return {
    onPluginInit(payload) {
      setSchema = payload.setSchema;
    },
    // @ts-expect-error - Typing issue with onRequestParse
    onRequestParse() {
      return {
        onRequestParseDone() {
          return mapMaybePromise(getSchema(), schema => {
            if (currentSchema !== schema) {
              currentSchema = schema;
              setSchema(schema);
            }
          });
        },
      };
    },
  };
}
