import type { GraphQLSchema } from 'graphql';
import { mapMaybePromise } from '@graphql-mesh/utils';
import type { MaybePromise } from '@graphql-tools/utils';
import type { MeshServePlugin } from './types';

export function useChangingSchema(
  getSchema: () => MaybePromise<GraphQLSchema>,
  setSchemaCallback: (setSchema: (schema: GraphQLSchema) => void) => void,
): MeshServePlugin {
  let currentSchema: GraphQLSchema | undefined;
  let setSchema: (schema: GraphQLSchema) => void;
  return {
    onPluginInit(payload) {
      setSchema = function (schema: GraphQLSchema) {
        if (currentSchema !== schema) {
          currentSchema = schema;
          payload.setSchema(schema);
        }
      };
      setSchemaCallback(setSchema);
    },
    // @ts-expect-error - Typing issue with onRequestParse
    onRequestParse() {
      return {
        onRequestParseDone() {
          return mapMaybePromise(getSchema(), setSchema);
        },
      };
    },
  };
}
