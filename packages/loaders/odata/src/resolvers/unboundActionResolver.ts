import type { GraphQLFieldResolver } from 'graphql';
import urljoin from 'url-join';
import { Request } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { DataloaderFactory } from '../getDataloaderFactory.js';
import { getUrlString } from '../utils/getUrlString.js';
import { handleResponseText } from '../utils/handleResponseText.js';

export interface UnboundActionResolverOpts {
  actionName: string;
  dataloaderFactory: DataloaderFactory;
  headersFactory: (resolverData: any, method: string) => Record<string, string>;
  endpoint: string;
}

export function createUnboundActionResolver({
  actionName,
  dataloaderFactory,
  headersFactory,
  endpoint,
}: UnboundActionResolverOpts): GraphQLFieldResolver<any, any> {
  return function unboundActionResolver(root, args, context, info) {
    const url = new URL(endpoint);
    url.href = urljoin(url.href, '/' + actionName);
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
    return handleMaybePromise(
      () => dataloaderFactory(context).load(request),
      response =>
        handleMaybePromise(
          () => response.text(),
          responseText => handleResponseText(responseText, urlString, info),
        ),
    );
  };
}
