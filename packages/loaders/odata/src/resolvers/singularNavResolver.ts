import type { GraphQLFieldResolver, GraphQLObjectType } from 'graphql';
import { parseResolveInfo, type ResolveTree } from 'graphql-parse-resolve-info';
import urljoin from 'url-join';
import { Request } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { DataloaderFactory } from '../getDataloaderFactory.js';
import { addIdentifierToUrl } from '../utils/addIdentifierToUrl.js';
import { getEntityKeyFieldName } from '../utils/getEntityKeyFieldName.js';
import { getUrlString } from '../utils/getUrlString.js';
import { handleResponseText } from '../utils/handleResponseText.js';
import { prepareSearchParams } from '../utils/prepareSearchParams.js';

export interface SingularNavResolverOpts {
  navigationPropertyName: string;
  dataloaderFactory: DataloaderFactory;
  expandNavProps: boolean;
  headersFactory: (resolverData: any, method: string) => Record<string, string>;
}

export function createSingularNavResolver({
  navigationPropertyName,
  dataloaderFactory,
  expandNavProps,
  headersFactory,
}: SingularNavResolverOpts): GraphQLFieldResolver<any, any> {
  return function singularNavResolver(root, args, context, info) {
    if (navigationPropertyName in root) {
      return root[navigationPropertyName];
    }
    const url = new URL(root['@odata.id']);
    url.href = urljoin(url.href, '/' + navigationPropertyName);
    const returnType = info.returnType as GraphQLObjectType;
    const identifierFieldName = getEntityKeyFieldName(returnType);
    if (!identifierFieldName) {
      throw new Error(
        `Missing @key(fields) on ${returnType.name} for singular navigation "${navigationPropertyName}"`,
      );
    }
    addIdentifierToUrl(url, identifierFieldName, args);
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
          env: globalThis.process?.env,
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
