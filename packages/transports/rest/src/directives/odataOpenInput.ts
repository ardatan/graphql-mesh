/**
 * Flatten open-type GraphQL input: `{ …typedFields, rest: { extra: 1 } }` →
 * `{ …typedFields, extra: 1 }` before OData POST/PATCH body serialization.
 * Same helper as legacy `@omnigraph/odata` `rebuildOpenInputObjects`.
 */
export function rebuildOpenInputObjects(input: any): void {
  if (input == null || typeof input !== 'object') {
    return;
  }
  if ('rest' in input) {
    const rest = input.rest;
    if (rest != null && typeof rest === 'object' && !Array.isArray(rest)) {
      Object.assign(input, rest);
    }
    delete input.rest;
  }
  for (const fieldName in input) {
    rebuildOpenInputObjects(input[fieldName]);
  }
}
