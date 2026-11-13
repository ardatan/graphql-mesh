import type { GraphQLField } from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import type { DirectiveArgsMap } from '../directives.js';

/** Runtime shape of `getDirectiveExtensions` — each directive key is an array. */
type DirectiveExtensions = {
  [K in keyof DirectiveArgsMap]?: Array<NonNullable<DirectiveArgsMap[K]>>;
};

function fieldDirectives(field: GraphQLField<any, any>): DirectiveExtensions {
  return (getDirectiveExtensions(field) as DirectiveExtensions) || {};
}

/** `@navProp` / `@pluralNav` / `@singularNav` — any navigation accessor. */
export function isODataNavigationField(field: GraphQLField<any, any>): boolean {
  const d = fieldDirectives(field);
  return Boolean(d.navProp?.length || d.pluralNav?.length || d.singularNav?.length);
}

/**
 * Fields that participate in `$expand` on the parent entity.
 * `@singularNav` (e.g. `FriendsById`) is a separate by-id fetch, not an expand path.
 */
export function isODataExpandableNavigationField(field: GraphQLField<any, any>): boolean {
  const d = fieldDirectives(field);
  return Boolean(d.navProp?.length || d.pluralNav?.length);
}

/** Structural / property fields for `$select` (excludes nav, bound ops, open-type bag). */
export function isODataEntityPropertyField(field: GraphQLField<any, any>): boolean {
  const d = fieldDirectives(field);
  if (isODataNavigationField(field)) {
    return false;
  }
  if (d.boundFunction?.length || d.boundAction?.length) {
    return false;
  }
  // `additionalProperties: JSON @resolveRoot` — not an OData $select property
  if (d.resolveRoot?.length) {
    return false;
  }
  return true;
}

export function getNavigationPropertyName(field: GraphQLField<any, any>): string | undefined {
  const d = fieldDirectives(field);
  return (
    d.navProp?.[0]?.navigationPropertyName ||
    d.pluralNav?.[0]?.navigationPropertyName ||
    d.singularNav?.[0]?.navigationPropertyName
  );
}
