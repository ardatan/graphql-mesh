/**
 * HATEOAS / OpenAPI-link entity-reference mappings and resolvable entity types.
 * Key: `${parentTypeName}.${fieldName}` → `{ entityKeyField: parentJsonField }`.
 * Used to bake Connectors selections like `supplier: { id: supplierId }`.
 */
const meshEntityRefsByTypeField = new Map<string, Record<string, string>>();

/** Types that have a GET-by-key connector (Query `entity: true` or equivalent). */
const meshEntityTypes = new Map<string, string[]>();

export function setMeshEntityRef(
  typeName: string,
  fieldName: string,
  ref: Record<string, string>,
): void {
  if (!typeName || !fieldName || !ref || !Object.keys(ref).length) {
    return;
  }
  meshEntityRefsByTypeField.set(`${typeName}.${fieldName}`, { ...ref });
}

export function getMeshEntityRef(
  typeName: string,
  fieldName: string,
): Record<string, string> | undefined {
  return meshEntityRefsByTypeField.get(`${typeName}.${fieldName}`);
}

/**
 * Mark a GraphQL object type as entity-resolvable (has a by-key HTTP connector).
 * `keyFields` defaults to `['id']`.
 */
export function registerMeshEntityType(typeName: string, keyFields: string[] = ['id']): void {
  if (!typeName || !keyFields.length) {
    return;
  }
  meshEntityTypes.set(typeName, [...keyFields]);
}

export function getMeshEntityKeyFields(typeName: string): string[] | undefined {
  return meshEntityTypes.get(typeName);
}

export function isMeshEntityType(typeName: string): boolean {
  return meshEntityTypes.has(typeName);
}

/** Test helper — clear registries between unit tests when needed. */
export function clearMeshEntityRegistries(): void {
  meshEntityRefsByTypeField.clear();
  meshEntityTypes.clear();
}
