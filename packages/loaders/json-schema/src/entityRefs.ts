/**
 * HATEOAS / OpenAPI-link entity-reference mappings and resolvable entity types.
 * Key: `${parentTypeName}.${fieldName}` → `{ entityKeyField: parentJsonField }`.
 * Used to bake Connectors selections like `supplier: { id: supplierId }`.
 */
const meshEntityRefsByTypeField = new Map<string, Record<string, string>>();

/** Types that have a GET-by-key connector (Query `entity: true` or equivalent). */
const meshEntityTypes = new Map<string, string[]>();

/**
 * Type-level `@connect` for entity types referenced via cross-schema HATEOAS stubs.
 * Keyed by entity type name (e.g. `Supplier`) so the linking subgraph can hydrate
 * stubs without Mesh `@resolveTo`.
 */
export type MeshTypeConnectArgs = {
  source: string;
  http: Record<string, unknown>;
  selection?: string;
};
const meshTypeConnectByEntity = new Map<string, MeshTypeConnectArgs>();

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

export function setMeshTypeConnect(entityTypeName: string, connect: MeshTypeConnectArgs): void {
  if (!entityTypeName || !connect?.http) {
    return;
  }
  meshTypeConnectByEntity.set(entityTypeName, { ...connect, http: { ...connect.http } });
}

export function getMeshTypeConnect(entityTypeName: string): MeshTypeConnectArgs | undefined {
  return meshTypeConnectByEntity.get(entityTypeName);
}

/** Test helper — clear registries between unit tests when needed. */
export function clearMeshEntityRegistries(): void {
  meshEntityRefsByTypeField.clear();
  meshEntityTypes.clear();
  meshTypeConnectByEntity.clear();
}
