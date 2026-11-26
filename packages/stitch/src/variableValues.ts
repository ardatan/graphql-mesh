import { versionInfo } from 'graphql';

function emptySources(): Record<string, unknown> {
  return Object.create(null);
}

/**
 * GraphQL 17 `getArgumentValues` expects `{ coerced, sources }`; GraphQL 16 accepts a flat map.
 * Local copy so overlaid stitch works against older `@graphql-tools/utils` (Gateway memtest).
 * Returns `any` to stay assignable to GraphQL 16/17 `VariableValues` across dual CI.
 */
export function asGetArgumentValuesVariables(variableValues: any): any {
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
