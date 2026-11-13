/** GraphQL field name for OData open-type / additional property bags (aligns with OpenAPI). */
export const ODATA_ADDITIONAL_PROPERTIES_FIELD = 'additionalProperties';

/**
 * Merge open-type bag fields into the parent input object before POST/PATCH.
 * Looks for `additionalProperties` (emitted for OpenType entities with `@resolveRoot` on output).
 */
export function rebuildOpenInputObjects(input: any) {
  if (input != null && typeof input === 'object') {
    if (ODATA_ADDITIONAL_PROPERTIES_FIELD in input) {
      Object.assign(input, input[ODATA_ADDITIONAL_PROPERTIES_FIELD]);
      delete input[ODATA_ADDITIONAL_PROPERTIES_FIELD];
    }
    for (const fieldName in input) {
      rebuildOpenInputObjects(input[fieldName]);
    }
  }
}
