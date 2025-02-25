import type { GraphQLFieldResolver } from 'graphql';
import { parseResolveInfo, type ResolveTree } from 'graphql-parse-resolve-info';
import urljoin from 'url-join';
import { Request } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { DataloaderFactory } from '../getDataloaderFactory.js';
import { getUrlString } from '../utils/getUrlString.js';
import { handleResponseText } from '../utils/handleResponseText.js';
import { prepareSearchParams } from '../utils/prepareSearchParams.js';

export interface PluralNavResolverOpts {
  navigationPropertyName: string;
  dataloaderFactory: DataloaderFactory;
  expandNavProps: boolean;
  headersFactory: (resolverData: any, method: string) => Record<string, string>;
}

export function createPluralNavResolver({
  navigationPropertyName,
  dataloaderFactory,
  expandNavProps,
  headersFactory,
}: PluralNavResolverOpts): GraphQLFieldResolver<any, any> {
  return function pluralNavResolver(root, args, context, info) {
    if (navigationPropertyName in root) {
      return root[navigationPropertyName];
    }
    const url = new URL(root['@odata.id']);
    url.href = urljoin(url.href, '/' + navigationPropertyName);
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
