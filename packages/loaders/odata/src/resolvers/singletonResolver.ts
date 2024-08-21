import type { GraphQLFieldResolver } from 'graphql';
import { parseResolveInfo, type ResolveTree } from 'graphql-parse-resolve-info';
import urljoin from 'url-join';
import type { ResolverData } from '@graphql-mesh/string-interpolation';
import { mapMaybePromise } from '@graphql-mesh/utils';
import { Request } from '@whatwg-node/fetch';
import type { DataloaderFactory } from '../getDataloaderFactory.js';
import { getUrlString } from '../utils/getUrlString.js';
import { handleResponseText } from '../utils/handleResponseText.js';
import { prepareSearchParams } from '../utils/prepareSearchParams.js';

export interface SingletonResolverOptions {
  endpoint: string;
  singletonName: string;
  dataloaderFactory: DataloaderFactory;
  expandNavProps: boolean;
  headersFactory: (resolverData: ResolverData, method: string) => Record<string, string>;
}

export function createSingletonResolver({
  endpoint,
  singletonName,
  dataloaderFactory,
  expandNavProps,
  headersFactory,
}: SingletonResolverOptions): GraphQLFieldResolver<any, any> {
  return function singletonResolver(root, args, context, info) {
    const url = new URL(endpoint);
    url.href = urljoin(url.href, '/' + singletonName);
    const parsedInfoFragment = parseResolveInfo(info) as ResolveTree;
    const searchParams = prepareSearchParams({
      fragment: parsedInfoFragment,
      schema: info.schema,

      expandNavProps,
    });
    searchParams?.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    const urlString = getUrlString(url);
    const method = 'GET';
    const request = new Request(urlString, {
      method,
      headers: headersFactory(
        {
          root,
          args,
          context,
          info,
          env: process.env,
        },
        method,
      ),
    });
    return mapMaybePromise(dataloaderFactory(context).load(request), response =>
      mapMaybePromise(response.text(), responseText =>
        handleResponseText(responseText, urlString, info),
      ),
    );
  };
}
