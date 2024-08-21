import type { GraphQLFieldResolver } from 'graphql';
import urljoin from 'url-join';
import { mapMaybePromise } from '@graphql-mesh/utils';
import { Request } from '@whatwg-node/fetch';
import type { DataloaderFactory } from '../getDataloaderFactory';
import { getUrlString } from '../utils/getUrlString.js';
import { handleResponseText } from '../utils/handleResponseText.js';

export interface BoundActionResolverOpts {
  actionRef: string;
  dataloaderFactory: DataloaderFactory;
  headersFactory: (resolverData: any, method: string) => Record<string, string>;
}

export function createBoundActionResolver({
  actionRef,
  dataloaderFactory,
  headersFactory,
}: BoundActionResolverOpts): GraphQLFieldResolver<any, any> {
  return async function boundFieldResolver(root, args, context, info) {
    const url = new URL(root['@odata.id']);
    url.href = urljoin(url.href, '/' + actionRef);
    const urlString = getUrlString(url);
    const method = 'POST';
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
      body: JSON.stringify(args),
    });
    return mapMaybePromise(dataloaderFactory(context).load(request), response =>
      mapMaybePromise(response.text(), responseText =>
        handleResponseText(responseText, urlString, info),
      ),
    );
  };
}
