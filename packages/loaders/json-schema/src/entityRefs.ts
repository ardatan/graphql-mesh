/**
 * HATEOAS cross-subgraph entity-reference mappings.
 * Key: `${parentTypeName}.${fieldName}` → `{ entityKeyField: parentJsonField }`.
 * Used to bake Connectors selections like `supplier: { id: supplierId }`.
 */
const meshEntityRefsByTypeField = new Map<string, Record<string, string>>();

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
