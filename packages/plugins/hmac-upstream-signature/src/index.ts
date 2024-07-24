import type { FetchAPI, GraphQLParams, Plugin as YogaPlugin } from 'graphql-yoga';
import jsonStableStringify from 'json-stable-stringify';
import type { OnSubgraphExecutePayload } from '@graphql-mesh/fusion-runtime';
import type { MeshServePlugin } from '@graphql-mesh/serve-runtime';
import { defaultPrintFn } from '@graphql-mesh/transport-common';
import { mapMaybePromise } from '@graphql-mesh/utils';
import type { ExecutionRequest, MaybePromise } from '@graphql-tools/utils';

export type HMACUpstreamSignatureOptions = {
  secret: string;
  shouldSign?: (
    input: Pick<OnSubgraphExecutePayload<{}>, 'subgraph' | 'subgraphName' | 'executionRequest'>,
  ) => boolean;
  extensionName?: string;
  serializeExecutionRequest?: (executionRequest: ExecutionRequest) => string;
};

const DEFAULT_EXTENSION_NAME = 'hmac-signature';
const DEFAULT_SHOULD_SIGN_FN: NonNullable<HMACUpstreamSignatureOptions['shouldSign']> = () => true;

export const defaultExecutionRequestSerializer = (executionRequest: ExecutionRequest) =>
  jsonStableStringify({
    query: defaultPrintFn(executionRequest.document),
    variables: executionRequest.variables,
  });
export const defaultParamsSerializer = (params: GraphQLParams) =>
  jsonStableStringify({
    query: params.query,
    variables: params.variables,
  });

function createCryptoKey({
  textEncoder,
  crypto,
  secret,
  usages,
}: {
  textEncoder: TextEncoder;
  crypto: Crypto;
  secret: string;
  usages: KeyUsage[];
}): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages,
  );
}

export function useHmacUpstreamSignature(options: HMACUpstreamSignatureOptions): MeshServePlugin {
  if (!options.secret) {
    throw new Error('Property "secret" is required for useHmacUpstreamSignature plugin');
  }

  const shouldSign = options.shouldSign || DEFAULT_SHOULD_SIGN_FN;
  const extensionName = options.extensionName || DEFAULT_EXTENSION_NAME;
  const serializeExecutionRequest =
    options.serializeExecutionRequest || defaultExecutionRequestSerializer;
  let key$: MaybePromise<CryptoKey>;
  let fetchAPI: FetchAPI;
  let textEncoder: TextEncoder;

  return {
    onYogaInit({ yoga }) {
      fetchAPI = yoga.fetchAPI;
    },
    onSubgraphExecute({ subgraphName, subgraph, executionRequest, setExecutionRequest }) {
      if (shouldSign({ subgraphName, subgraph, executionRequest })) {
        textEncoder ||= new fetchAPI.TextEncoder();
        key$ ||= createCryptoKey({
          textEncoder,
          crypto: fetchAPI.crypto,
          secret: options.secret,
          usages: ['sign'],
        });
        return mapMaybePromise(key$, async key => {
          key$ = key;
          const serializedExecutionRequest = serializeExecutionRequest(executionRequest);
          const encodedContent = textEncoder.encode(serializedExecutionRequest);
          const signature = await fetchAPI.crypto.subtle.sign('HMAC', key, encodedContent);
          const extensionValue = btoa(String.fromCharCode(...new Uint8Array(signature)));
          setExecutionRequest({
            ...executionRequest,
            extensions: {
              ...executionRequest.extensions,
              [extensionName]: extensionValue,
            },
          });
        });
      }
    },
  };
}

export type HMACUpstreamSignatureValidationOptions = {
  secret: string;
  extensionName?: string;
  serializeParams?: (params: GraphQLParams) => string;
};

export function useHmacSignatureValidation(
  options: HMACUpstreamSignatureValidationOptions,
): YogaPlugin {
  if (!options.secret) {
    throw new Error('Property "secret" is required for useHmacSignatureValidation plugin');
  }

  const extensionName = options.extensionName || DEFAULT_EXTENSION_NAME;
  let key$: Promise<CryptoKey>;
  let textEncoder: TextEncoder;
  const paramsSerializer = options.serializeParams || defaultParamsSerializer;

  return {
    onParams({ params, fetchAPI }) {
      textEncoder ||= new fetchAPI.TextEncoder();
      const extension = params.extensions?.[extensionName];
      if (!extension) {
        throw new Error(`Missing HMAC signature: extension ${extensionName} not found in request.`);
      }
      key$ ||= createCryptoKey({
        textEncoder,
        crypto: fetchAPI.crypto,
        secret: options.secret,
        usages: ['verify'],
      });
      return key$.then(async key => {
        const sigBuf = Uint8Array.from(atob(extension), c => c.charCodeAt(0));
        const serializedParams = paramsSerializer(params);
        const result = await fetchAPI.crypto.subtle.verify(
          'HMAC',
          key,
          sigBuf,
          textEncoder.encode(serializedParams),
        );

        if (!result) {
          throw new Error(
            `Invalid HMAC signature: extension ${extensionName} does not match the body content.`,
          );
        }
      });
    },
  };
}
