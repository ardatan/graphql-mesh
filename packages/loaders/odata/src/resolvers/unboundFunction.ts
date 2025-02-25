import type { GraphQLFieldResolver } from 'graphql';
import { parseResolveInfo, type ResolveTree } from 'graphql-parse-resolve-info';
import urljoin from 'url-join';
import { Request } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { DataloaderFactory } from '../getDataloaderFactory.js';
import { getUrlString } from '../utils/getUrlString.js';
import { handleResponseText } from '../utils/handleResponseText.js';
import { prepareSearchParams } from '../utils/prepareSearchParams.js';

export interface UnboundFunctionResolverOpts {
  endpoint: string;
  functionName: string;
  expandNavProps: boolean;
  dataloaderFactory: DataloaderFactory;
  headersFactory: (resolverData: any, method: string) => Record<string, string>;
}

export function createUnboundFunctionResolver({
  endpoint,
  functionName,
  expandNavProps,
  dataloaderFactory,
  headersFactory,
}: UnboundFunctionResolverOpts): GraphQLFieldResolver<any, any> {
  return function functionResolver(root, args, context, info) {
    const url = new URL(endpoint);
    url.href = urljoin(url.href, '/' + functionName);
    url.href += `(${Object.entries(args)
      .filter(argEntry => argEntry[0] !== 'queryOptions')
      .map(argEntry => argEntry.join(' = '))
      .join(', ')})`;
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
