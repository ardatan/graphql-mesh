import { type Plugin as YogaPlugin } from 'graphql-yoga';
import type { GatewayPlugin } from '@graphql-hive/gateway-runtime';
import {
  useJWT as useYogaJWT,
  type JWTExtendContextFields,
  type JwtPluginOptions,
} from '@graphql-yoga/plugin-jwt';

export {
  createInlineSigningKeyProvider,
  createRemoteJwksSigningKeyProvider,
  extractFromConnectionParams,
  extractFromCookie,
  extractFromHeader,
  type GetSigningKeyFunction,
  type JWTExtendContextFields,
  type JwtPluginOptions,
  type ExtractTokenFunction,
} from '@graphql-yoga/plugin-jwt';

export type JWTAuthPluginOptions = JwtPluginOptions & {
  forward?: {
    payload?: boolean | string;
    token?: boolean | string;
    extensionsFieldName?: string;
  };
};

/**
 * This Yoga plugin is used to extracted the forwarded (from Mesh gateway) the JWT token and claims.
 * Use this plugin in your Yoga server to extract the JWT token and claims from the forwarded extensions.
 */
export function useForwardedJWT(config: {
  extensionsFieldName?: string;
  extendContextFieldName?: string;
}): YogaPlugin<{ jwt?: JWTExtendContextFields }> {
  const extensionsJwtFieldName = config.extensionsFieldName ?? 'jwt';
  const extendContextFieldName = config.extendContextFieldName ?? 'jwt';

  return {
    onContextBuilding({ context, extendContext }) {
      if (context.params.extensions?.[extensionsJwtFieldName]) {
        const jwt = context.params.extensions[extensionsJwtFieldName]!;

        extendContext({
          [extendContextFieldName]: jwt,
        });
      }
    },
  };
}

/**
 * This Mesh Gateway plugin is used to extract the JWT token and payload from the request and forward it to the subgraph.
 */
export function useJWT(
  options: JWTAuthPluginOptions,
): GatewayPlugin<{ jwt?: JWTExtendContextFields }> {
  const forwardPayload = options?.forward?.payload ?? true;
  const forwardToken = options?.forward?.token ?? false;
  const shouldForward = forwardPayload || forwardToken;
  const fieldName = options?.forward?.extensionsFieldName ?? 'jwt';

  return {
    onPluginInit({ addPlugin }) {
      // TODO: fix useYogaJWT typings to inherit the context
      addPlugin(useYogaJWT(options));
    },
    // When a subgraph is about to be executed, we check if the initial request has a JWT token
    // that needs to be passed. At the moment, only GraphQL subgraphs will have the option to forward tokens/payload.
    // The JWT info will be passed to the subgraph execution request.
    onSubgraphExecute({ executionRequest, subgraphName, setExecutionRequest, logger }) {
      if (shouldForward && executionRequest.context.jwt) {
        const jwtData: Partial<JWTExtendContextFields> = {
          payload: forwardPayload ? executionRequest.context.jwt.payload : undefined,
          token: forwardToken ? executionRequest.context.jwt.token : undefined,
        };

        logger.debug(
          `Forwarding JWT payload to subgraph ${subgraphName}, payload: `,
          jwtData.payload,
        );

        setExecutionRequest({
          ...executionRequest,
          extensions: {
            ...executionRequest.extensions,
            [fieldName]: jwtData,
          },
        });
      }
    },
  };
}

export default useJWT;
