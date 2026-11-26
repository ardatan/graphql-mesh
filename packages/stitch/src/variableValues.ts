import { versionInfo } from 'graphql';

function emptySources(): Record<string, unknown> {
  return Object.create(null);
}

/**
 * GraphQL 17 `getArgumentValues` expects `{ coerced, sources }`; GraphQL 16 accepts a flat map.
 * Local copy so overlaid stitch works against older `@graphql-tools/utils` (Gateway memtest).
 */
export function asGetArgumentValuesVariables(
  variableValues:
    Record<string, any> | { coerced: Record<string, any>; sources?: any } | null | undefined,
):
  | Record<string, any>
  | { coerced: Record<string, any>; sources: Record<string, unknown> }
  | undefined {
  if (variableValues == null) {
    return undefined;
  }
  if (versionInfo.major >= 17 && !('coerced' in variableValues)) {
    return {
      coerced: variableValues,
      sources: emptySources(),
    };
  }
  return variableValues;
}
