import type { GraphQLResolveInfo } from 'graphql';
import type { Path } from '@envelop/core';
import { isAsyncIterable } from '@envelop/core';
import type { MeshPlugin } from '@graphql-mesh/types';
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

interface IfFnContext {
  url: string;
  context: any;
  info: GraphQLResolveInfo;
  options: RequestInit;
  env: Record<string, string>;
}

export default function useIncludeHttpDetailsInExtensions(opts: {
  if: boolean | string | number;
}): MeshPlugin<any> {
  if (typeof opts.if === 'boolean') {
    if (!opts.if) {
      return {};
    }
  }
  let ifFn: (interpolationObj: IfFnContext) => boolean = () => true;
  if (typeof opts.if === 'string') {
    ifFn = ({ url, context, info, options, env }) => {
      // eslint-disable-next-line no-new-func
      return new Function('url', 'context', 'info', 'options', 'env', 'return ' + opts.if)(
        url,
        context,
        info,
        options,
        env,
      );
    };
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
      if (context != null && ifFn({ url, context, info, options, env: process.env })) {
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
              headers: options.headers,
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
