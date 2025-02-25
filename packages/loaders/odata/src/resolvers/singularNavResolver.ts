import type { GraphQLFieldResolver, GraphQLObjectType } from 'graphql';
import { parseResolveInfo, type ResolveTree } from 'graphql-parse-resolve-info';
import urljoin from 'url-join';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import { Request } from '@whatwg-node/fetch';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { DirectiveArgsMap } from '../directives.js';
import type { DataloaderFactory } from '../getDataloaderFactory.js';
import { addIdentifierToUrl } from '../utils/addIdentifierToUrl.js';
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
    const returnTypeDirectives = getDirectiveExtensions<DirectiveArgsMap>(returnType);
    const entityInfo = returnTypeDirectives.entityInfo[0];
    addIdentifierToUrl(
      url,
      entityInfo.identifierFieldName,
      entityInfo.identifierFieldTypeRef,
      args,
    );
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
