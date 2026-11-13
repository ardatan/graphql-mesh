import type { GraphQLNamedType } from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import type { DirectiveArgsMap } from '../directives.js';

/**
 * First field name from a Federation `@key(fields:)` FieldSet.
 * OData metadata uses a single PropertyRef today.
 */
export function getEntityKeyFieldNameFromFields(
  fields: string | undefined | null,
): string | undefined {
  if (fields == null || fields === '') {
    return undefined;
  }
  return String(fields).trim().split(/[\s{]/)[0] || undefined;
}

export function getEntityKeyFieldName(type: GraphQLNamedType): string | undefined {
  const directives = getDirectiveExtensions<DirectiveArgsMap>(type);
  return getEntityKeyFieldNameFromFields(directives?.key?.[0]?.fields);
}
