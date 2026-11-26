/**
 * Whether `typeName.fieldName` is a gateway-local field recorded on
 * `stitchingInfo.localFields` (additionalResolvers / @resolveTo / typeDefs).
 */
export function isLocalField(
  localFields: Map<string, Set<string>> | undefined,
  typeName: string,
  fieldName: string,
): boolean {
  return localFields?.get(typeName)?.has(fieldName) === true;
}
