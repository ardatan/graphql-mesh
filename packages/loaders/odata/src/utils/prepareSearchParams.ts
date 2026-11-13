import { isAbstractType, isObjectType, type GraphQLObjectType, type GraphQLSchema } from 'graphql';
import {
  simplifyParsedResolveInfoFragmentWithType,
  type ResolveTree,
} from 'graphql-parse-resolve-info';
import { URLSearchParams } from '@whatwg-node/fetch';
import {
  getNavigationPropertyName,
  isODataEntityPropertyField,
  isODataExpandableNavigationField,
} from './entityFieldKind.js';
import { getEntityKeyFieldName } from './getEntityKeyFieldName.js';
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

  if (isSelectable && isObjectType(returnType)) {
    const identifierFieldName = getEntityKeyFieldName(returnType as GraphQLObjectType);
    const fieldMap = (returnType as GraphQLObjectType).getFields();
    const selectionFields: string[] = [];
    const expandedFields: string[] = [];
    for (const fieldName in fields) {
      const field = fieldMap[fieldName];
      if (!field) {
        continue;
      }
      if (isODataEntityPropertyField(field)) {
        selectionFields.push(fieldName);
      }
      if (expandNavProps && isODataExpandableNavigationField(field)) {
        const navName = getNavigationPropertyName(field) || fieldName;
        const nestedSearchParams = prepareSearchParams({
          fragment: fields[fieldName],
          schema,
          expandNavProps,
        });
        const searchParamsStr = decodeURIComponent(nestedSearchParams.toString());
        expandedFields.push(`${navName}(${searchParamsStr.split('&').join(';')})`);
        selectionFields.push(navName);
      }
    }
    if (identifierFieldName && !selectionFields.includes(identifierFieldName)) {
      selectionFields.push(identifierFieldName);
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
