import type { VariableValues } from '@graphql-tools/utils';

/**
 * Brand marking values produced (or normalized) as GraphQL 17-style
 * `{ coerced, sources }` wrappers. Flat GraphQL 16 maps that happen to declare
 * variables named `coerced` / `sources` must not be mistaken for wrappers.
 */
const VARIABLE_VALUES_BRAND = Symbol.for('@graphql-tools/delegate.VariableValues');

type VersionedVariableValues =
  Record<string, unknown> | VariableValues<Record<string, unknown>> | undefined;

type BrandedVariableValues = VariableValues<Record<string, unknown>> & {
  [VARIABLE_VALUES_BRAND]?: true;
};

function isBrandedVariableValues(variableValues: object): variableValues is BrandedVariableValues {
  return (variableValues as BrandedVariableValues)[VARIABLE_VALUES_BRAND] === true;
}

/**
 * Structural check for genuine GraphQL.js / tools VariableValues wrappers:
 * both `coerced` and `sources` must be objects, and every source entry (if any)
 * must carry a `signature` (VariableValueSource shape).
 */
function isStructuralVariableValues(
  variableValues: object,
): variableValues is VariableValues<Record<string, unknown>> {
  // Fast reject for flat GraphQL 16 maps (no own `coerced` / `sources`).
  if (!Object.hasOwn(variableValues, 'coerced') || !Object.hasOwn(variableValues, 'sources')) {
    return false;
  }
  const coerced = (variableValues as VariableValues).coerced;
  const sources = (variableValues as VariableValues).sources;
  if (
    coerced == null ||
    typeof coerced !== 'object' ||
    Array.isArray(coerced) ||
    sources == null ||
    typeof sources !== 'object' ||
    Array.isArray(sources)
  ) {
    return false;
  }
  // Empty sources is a valid wrapper shape (e.g. from getVariableValues).
  for (const key in sources) {
    if (!Object.prototype.hasOwnProperty.call(sources, key)) {
      continue;
    }
    const entry = (sources as Record<string, unknown>)[key];
    if (
      entry == null ||
      typeof entry !== 'object' ||
      !Object.hasOwn(entry as object, 'signature')
    ) {
      return false;
    }
  }
  return true;
}

function isWrappedVariableValues(
  variableValues: object,
): variableValues is VariableValues<Record<string, unknown>> {
  return isBrandedVariableValues(variableValues) || isStructuralVariableValues(variableValues);
}

/**
 * Returns the runtime variable values, regardless of the graphql-js version.
 *
 * - graphql 16: `info.variableValues` is a flat `{ [name]: value }` map.
 * - graphql >=17: `info.variableValues` is `{ sources, coerced }`; the runtime
 *   values live under `.coerced`.
 *
 * Format is distinguished by a producer brand (from {@link getVariableValues})
 * or by VariableValueSource shape — never by the presence of keys named
 * `coerced` / `sources` alone.
 */
export function getCoercedVariableValues(
  variableValues: VersionedVariableValues,
): Record<string, unknown> | undefined {
  if (variableValues == null) {
    return undefined;
  }
  if (isWrappedVariableValues(variableValues)) {
    return variableValues.coerced;
  }
  return variableValues as Record<string, unknown>;
}

export function getVariableValues(
  variableValues: VersionedVariableValues,
): VariableValues<Record<string, unknown>> {
  if (variableValues != null && isWrappedVariableValues(variableValues)) {
    return variableValues;
  }
  const wrapped: BrandedVariableValues = {
    coerced: (variableValues ?? {}) as Record<string, unknown>,
    sources: Object.create(null),
  };
  Object.defineProperty(wrapped, VARIABLE_VALUES_BRAND, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return wrapped;
}
