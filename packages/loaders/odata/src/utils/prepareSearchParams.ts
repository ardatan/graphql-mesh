import { isAbstractType, type GraphQLSchema } from 'graphql';
import {
  simplifyParsedResolveInfoFragmentWithType,
  type ResolveTree,
} from 'graphql-parse-resolve-info';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import { URLSearchParams } from '@whatwg-node/fetch';
import type { DirectiveArgsMap } from '../directives.js';
import { QUERY_OPTIONS_FIELDS } from './QueryOptionsFields.js';

interface PrepareSearchParamsOptions {
  fragment: ResolveTree;
  schema: GraphQLSchema;
  expandNavProps: boolean;
}

export function prepareSearchParams({
  fragment,
  schema,
  expandNavProps,
}: PrepareSearchParamsOptions) {
  const fragmentTypeNames = Object.keys(fragment.fieldsByTypeName) as string[];
  const returnType = schema.getType(fragmentTypeNames[0]);
  const { args, fields } = simplifyParsedResolveInfoFragmentWithType(fragment, returnType) as {
    args: Record<string, any>;
    fields: Record<string, any>;
  };
  const searchParams = new URLSearchParams();
  if ('queryOptions' in args) {
    const { queryOptions } = args as any;
    for (const param in QUERY_OPTIONS_FIELDS) {
      if (param in queryOptions) {
        searchParams.set('$' + param, queryOptions[param]);
      }
    }
  }

  // $select doesn't work with inherited types' fields. So if there is an inline fragment for
  // implemented types, we cannot use $select
  const isSelectable = !isAbstractType(returnType);

  if (isSelectable) {
    const returnTypeDirectives = getDirectiveExtensions<DirectiveArgsMap>(returnType);
    const entityInfo = returnTypeDirectives?.entityInfo?.[0];
    const selectionFields: string[] = [];
    const expandedFields: string[] = [];
    for (const fieldName in fields) {
      if (entityInfo.actualFields.includes(fieldName)) {
        selectionFields.push(fieldName);
      }
      if (expandNavProps && entityInfo.navigationFields.includes(fieldName)) {
        const searchParams = prepareSearchParams({
          fragment: fields[fieldName],
          schema,

          expandNavProps,
        });
        const searchParamsStr = decodeURIComponent(searchParams.toString());
        expandedFields.push(`${fieldName}(${searchParamsStr.split('&').join(';')})`);
        selectionFields.push(fieldName);
      }
    }
    if (!selectionFields.includes(entityInfo.identifierFieldName)) {
      selectionFields.push(entityInfo.identifierFieldName);
    }
    if (selectionFields.length) {
      searchParams.set('$select', selectionFields.join(','));
    }
    if (expandedFields.length) {
      searchParams.set('$expand', expandedFields.join(','));
    }
  }
  return searchParams;
}
