import type { GraphQLFieldResolver } from 'graphql';
import urljoin from 'url-join';
import { Request } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { DataloaderFactory } from '../getDataloaderFactory.js';
import { getUrlString } from '../utils/getUrlString.js';
import { handleResponseText } from '../utils/handleResponseText.js';
import { rebuildOpenInputObjects } from '../utils/rebuildOpenInputObjects.js';

export interface CreateEntitySetResolverOpts {
  endpoint: string;
  entitySetName: string;
  dataloaderFactory: DataloaderFactory;
  headersFactory: (resolverData: any, method: string) => Record<string, string>;
}

export function createCreateEntitySetResolver({
  endpoint,
  entitySetName,
  dataloaderFactory,
  headersFactory,
}: CreateEntitySetResolverOpts): GraphQLFieldResolver<any, any> {
  return function entitySetResolver(root, args, context, info) {
    const url = new URL(endpoint);
    url.href = urljoin(url.href, '/' + entitySetName);
    const urlString = getUrlString(url);
    rebuildOpenInputObjects(args.input);
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
      body: JSON.stringify(args.input),
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
