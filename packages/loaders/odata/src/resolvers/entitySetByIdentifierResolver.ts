import type { GraphQLFieldResolver } from 'graphql';
import { parseResolveInfo, type ResolveTree } from 'graphql-parse-resolve-info';
import urljoin from 'url-join';
import { Request } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { DataloaderFactory } from '../getDataloaderFactory.js';
import { addIdentifierToUrl } from '../utils/addIdentifierToUrl.js';
import { getUrlString } from '../utils/getUrlString.js';
import { handleResponseText } from '../utils/handleResponseText.js';
import { prepareSearchParams } from '../utils/prepareSearchParams.js';

export interface EntitySetByIdentifierResolverConfig {
  endpoint: string;
  entitySetName: string;
  identifierFieldName: string;
  identifierFieldTypeRef: string;
  dataloaderFactory: DataloaderFactory;
  expandNavProps: boolean;
  headersFactory: (resolverData: any, method: string) => Record<string, string>;
}

export function createEntitySetByIdentifierResolver({
  endpoint,
  entitySetName,
  identifierFieldName,
  identifierFieldTypeRef,
  dataloaderFactory,
  expandNavProps,
  headersFactory,
}: EntitySetByIdentifierResolverConfig): GraphQLFieldResolver<any, any> {
  return function entitySetByIdentifierResolver(root, args, context, info) {
    const url = new URL(endpoint);
    url.href = urljoin(url.href, '/' + entitySetName);
    addIdentifierToUrl(url, identifierFieldName, identifierFieldTypeRef, args);
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
