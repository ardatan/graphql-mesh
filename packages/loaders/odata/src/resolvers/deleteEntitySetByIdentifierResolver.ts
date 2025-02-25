import type { GraphQLFieldResolver } from 'graphql';
import urljoin from 'url-join';
import { Request } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { DataloaderFactory } from '../getDataloaderFactory.js';
import { addIdentifierToUrl } from '../utils/addIdentifierToUrl.js';
import { getUrlString } from '../utils/getUrlString.js';
import { handleResponseText } from '../utils/handleResponseText.js';

export interface DeleteEntitySetByIdentifierResolverOpts {
  endpoint: string;
  entitySetName: string;
  identifierFieldName: string;
  identifierFieldTypeRef: string;
  dataloaderFactory: DataloaderFactory;
  headersFactory: (resolverData: any, method: string) => Record<string, string>;
}

export function createDeleteEntitySetByIdentifierResolver({
  endpoint,
  entitySetName,
  identifierFieldName,
  identifierFieldTypeRef,
  dataloaderFactory,
  headersFactory,
}: DeleteEntitySetByIdentifierResolverOpts): GraphQLFieldResolver<any, any> {
  return function deleteEntitySetByIdentifierResolver(root, args, context, info) {
    const url = new URL(endpoint);
    url.href = urljoin(url.href, '/' + entitySetName);
    addIdentifierToUrl(url, identifierFieldName, identifierFieldTypeRef, args);
    const urlString = getUrlString(url);
    const method = 'DELETE';
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
      response =>
        handleMaybePromise(
          () => response.text(),
          responseText => handleResponseText(responseText, urlString, info),
        ),
    );
  };
}
