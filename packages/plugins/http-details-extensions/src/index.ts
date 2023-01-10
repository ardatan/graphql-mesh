import { isAsyncIterable, Path } from '@envelop/core';
import { MeshPlugin, MeshPluginOptions } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';

export interface MeshFetchHTTPInformation {
  sourceName: string;
  path: Path;
  request: {
    timestamp: number;
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  response: {
    timestamp: number;
    status: number;
    statusText: string;
    headers: Record<string, string>;
  };
  responseTime: number;
}

export default function useIncludeHttpDetailsInExtensions(
  opts: MeshPluginOptions<{ if: any }>,
): MeshPlugin<any> {
  if ('if' in opts && !opts.if) {
    return {};
  }
  const httpDetailsByContext = new WeakMap<any, MeshFetchHTTPInformation[]>();

  function getHttpDetailsByContext(context: any) {
    let httpDetails = httpDetailsByContext.get(context);
    if (!httpDetails) {
      httpDetails = [];
      httpDetailsByContext.set(context, httpDetails);
    }
    return httpDetails;
  }

  return {
    onFetch({ url, context, info, options }) {
      if (context != null) {
        const requestTimestamp = Date.now();
        return ({ response }) => {
          const responseTimestamp = Date.now();
          const responseTime = responseTimestamp - requestTimestamp;
          const httpDetailsList = getHttpDetailsByContext(context);
          const httpDetails: MeshFetchHTTPInformation = {
            sourceName: (info as any)?.sourceName,
            path: info?.path,
            request: {
              timestamp: requestTimestamp,
              url,
              method: options.method || 'GET',
              headers: getHeadersObj(options.headers as Headers),
            },
            response: {
              timestamp: responseTimestamp,
              status: response.status,
              statusText: response.statusText,
              headers: getHeadersObj(response.headers),
            },
            responseTime,
          };
          httpDetailsList.push(httpDetails);
        };
      }
      return undefined;
    },
    onExecute({ args: { contextValue } }) {
      return {
        onExecuteDone({ result, setResult }) {
          if (!isAsyncIterable(result)) {
            const httpDetailsList = httpDetailsByContext.get(contextValue);
            if (httpDetailsList != null) {
              setResult({
                ...result,
                extensions: {
                  ...result.extensions,
                  httpDetails: httpDetailsList,
                },
              });
            }
          }
        },
      };
    },
  };
}
