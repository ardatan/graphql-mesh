import { versionInfo } from 'graphql';

function emptySources(): Record<string, unknown> {
  return Object.create(null);
}

/**
 * GraphQL 17 `getArgumentValues` expects `{ coerced, sources }`; GraphQL 16 accepts a flat map.
 * Local copy so overlaid `@graphql-mesh/utils` works against older `@graphql-tools/utils`.
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

/**
 * Normalize `getVariableValues` success/error shapes across GraphQL 16 (`{ coerced }`) and
 * GraphQL 17 (`{ variableValues: { coerced, sources } }`).
 */
export function coerceGetVariableValuesResult(result: {
  errors?: readonly any[];
  coerced?: Record<string, any>;
  variableValues?: { coerced: Record<string, any>; sources?: any };
}):
  | { errors: readonly any[] }
  | { variableValues: { coerced: Record<string, any>; sources: Record<string, unknown> } } {
  if (result.errors != null && result.errors.length > 0) {
    return { errors: result.errors };
  }
  if (result.variableValues != null) {
    return {
      variableValues: {
        coerced: result.variableValues.coerced,
        sources: result.variableValues.sources ?? emptySources(),
      },
    };
  }
  if (result.coerced != null) {
    return {
      variableValues: {
        coerced: result.coerced,
        sources: emptySources(),
      },
    };
  }
  return {
    variableValues: {
      coerced: Object.create(null),
      sources: emptySources(),
    },
  };
}
