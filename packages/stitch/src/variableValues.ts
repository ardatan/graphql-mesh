import { versionInfo, type GraphQLError } from 'graphql';

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

/**
 * Normalize `getVariableValues` success/error shapes across GraphQL 16 (`{ coerced }`) and
 * GraphQL 17 (`{ variableValues: { coerced, sources } }`).
 *
 * Canonical GraphQL Tools helper (`@graphql-tools/utils.coerceGetVariableValuesResult`);
 * local copy so overlaid stitch works when utils is older (Gateway memtest).
 */
export function coerceGetVariableValuesResult(result: {
  errors?: ReadonlyArray<GraphQLError>;
  variableValues?: { coerced: Record<string, unknown>; sources?: Record<string, unknown> };
  coerced?: Record<string, unknown>;
}):
  | { readonly errors: ReadonlyArray<GraphQLError> }
  | {
      readonly variableValues: {
        coerced: Record<string, unknown>;
        sources: Record<string, unknown>;
      };
    } {
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
