import type { GraphQLSchema } from 'graphql';
import { mapMaybePromise } from '@graphql-mesh/utils';
import type { MaybePromise } from '@graphql-tools/utils';
import type { GatewayPlugin } from '../types';

export function useChangingSchema(
  getSchema: () => MaybePromise<GraphQLSchema>,
  setSchemaCallback: (setSchema: (schema: GraphQLSchema) => void) => void,
): GatewayPlugin {
  let currentSchema: GraphQLSchema | undefined;
  let setSchema: (schema: GraphQLSchema) => void;
  return {
    onPluginInit(payload) {
      setSchema = function (schema: GraphQLSchema) {
        if (schema != null && currentSchema !== schema) {
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
