import type { GraphQLFieldResolver } from 'graphql';
import urljoin from 'url-join';
import { Request } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { DataloaderFactory } from '../getDataloaderFactory.js';
import { getUrlString } from '../utils/getUrlString.js';

export interface EntitySetCountResolverOptions {
  endpoint: string;
  entitySetName: string;
  dataloaderFactory: DataloaderFactory;
  headersFactory: (resolverData: any, method: string) => Record<string, string>;
}

export function createEntitySetCountResolver({
  endpoint,
  entitySetName,
  dataloaderFactory,
  headersFactory,
}: EntitySetCountResolverOptions): GraphQLFieldResolver<any, any> {
  return function entitySetCountResolver(root, args, context, info) {
    const url = new URL(endpoint);
    url.href = urljoin(url.href, `/${entitySetName}/$count`);
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
    return handleMaybePromise(
      () => dataloaderFactory(context).load(request),
      response => response.text(),
    );
  };
}
