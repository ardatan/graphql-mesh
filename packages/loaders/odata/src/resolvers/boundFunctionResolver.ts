import type { GraphQLFieldResolver } from 'graphql';
import { parseResolveInfo, type ResolveTree } from 'graphql-parse-resolve-info';
import urljoin from 'url-join';
import { Request } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { DataloaderFactory } from '../getDataloaderFactory.js';
import { getUrlString } from '../utils/getUrlString.js';
import { handleResponseText } from '../utils/handleResponseText.js';
import { prepareSearchParams } from '../utils/prepareSearchParams.js';

export interface BoundFunctionResolverOpts {
  functionRef: string;
  expandNavProps: boolean;
  dataloaderFactory: DataloaderFactory;
  headersFactory: (resolverData: any, method: string) => Record<string, string>;
}

export function createBoundFunctionResolver({
  functionRef,
  expandNavProps,
  dataloaderFactory,
  headersFactory,
}: BoundFunctionResolverOpts): GraphQLFieldResolver<any, any> {
  return function boundFunctionResolver(root, args, context, info) {
    const url = new URL(root['@odata.id']);
    url.href = urljoin(url.href, '/' + functionRef);
    const argsEntries = Object.entries(args);
    if (argsEntries.length) {
      url.href += `(${argsEntries
        .filter(argEntry => argEntry[0] !== 'queryOptions')
        .map(([argName, value]) => [argName, typeof value === 'string' ? `'${value}'` : value])
        .map(argEntry => argEntry.join('='))
        .join(',')})`;
    }
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
