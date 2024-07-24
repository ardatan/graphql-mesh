import { type Plugin as YogaPlugin } from 'graphql-yoga';
import type { MeshServePlugin } from '@graphql-mesh/serve-runtime';
import {
  useJWT as useYogaJWT,
  type JWTExtendContextFields,
  type JwtPluginOptions,
} from '@graphql-yoga/plugin-jwt';

export {
  createInlineSigningKeyProvider,
  createRemoteJwksSigningKeyProvider,
  extractFromCookie,
  extractFromHeader,
  type GetSigningKeyFunction,
  type JWTExtendContextFields,
  type JwtPluginOptions,
  type ExtractTokenFunction,
} from '@graphql-yoga/plugin-jwt';

export type JWTAuthPluginOptions = Omit<JwtPluginOptions, 'extendContext'> & {
  forward?: {
    claims?: boolean | string;
    token?: boolean | string;
    extensionsFieldName?: string;
  };
};

export function useExtractedJWT(config: {
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

export function useJWT(
  options: JWTAuthPluginOptions,
): MeshServePlugin<{ jwt?: JWTExtendContextFields }> {
  const forwardClaims = options?.forward?.claims ?? true;
  const forwardToken = options?.forward?.token ?? false;
  const shouldForward = forwardClaims || forwardToken;
  const fieldName = options?.forward?.extensionsFieldName ?? 'jwt';

  return {
    onPluginInit({ addPlugin }) {
      // TODO: fix useYogaJWT typings to inherit the context
      addPlugin(useYogaJWT(options) as any);
    },
    // When a subgraph is about to be executed, we check if the initial request has a JWT token
    // that needs to be passed. At the moment, only GraphQL subgraphs will have the option to forward tokens/claims.
    // The JWT info will be passed to the subgraph execution request.
    onSubgraphExecute({ executionRequest, setExecutionRequest }) {
      if (shouldForward && executionRequest.context.jwt) {
        const jwtData: Partial<JWTExtendContextFields> = {
          payload: forwardClaims ? executionRequest.context.jwt.payload : undefined,
          token: forwardToken ? executionRequest.context.jwt.token : undefined,
        };

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
