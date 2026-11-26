import { type MergedTypeConfig, type SubschemaConfig } from '@graphql-tools/delegate';

/**
 * Normalize merged-type `entryPoints` without cloning the subschema.
 *
 * - 0 entryPoints → unchanged
 * - 1 entryPoint → flatten onto the merge config (single-key shape)
 * - 2+ entryPoints → leave `entryPoints` on the single SubschemaConfig so
 *   stitchingInfo / the delegation plan builder pick the matching key at hop time
 */
export function splitMergedTypeEntryPointsTransformer(
  subschemaConfig: SubschemaConfig,
): Array<SubschemaConfig> {
  if (!subschemaConfig.merge) return [subschemaConfig];

  let changed = false;
  const merge: Record<string, MergedTypeConfig<any, any, any>> = {
    ...subschemaConfig.merge,
  };

  for (const typeName of Object.keys(merge)) {
    const mergedTypeConfig = merge[typeName];
    if (mergedTypeConfig == null) {
      continue;
    }
    const entryPoints = mergedTypeConfig.entryPoints;
    if (entryPoints == null || entryPoints.length === 0) {
      continue;
    }

    if (
      mergedTypeConfig.selectionSet != null ||
      mergedTypeConfig.fieldName != null ||
      mergedTypeConfig.resolve != null
    ) {
      throw new Error(
        `Merged type ${typeName} may not define entryPoints in addition to selectionSet, fieldName, or resolve`,
      );
    }

    if (entryPoints.length === 1) {
      const [entryPoint] = entryPoints;
      merge[typeName] = {
        ...mergedTypeConfig,
        ...entryPoint,
      };
      delete merge[typeName]!.entryPoints;
      changed = true;
      continue;
    }

    // Multi-entry: keep entryPoints on this single subschema.
    changed = true;
  }

  if (!changed) {
    return [subschemaConfig];
  }

  return [
    {
      ...subschemaConfig,
      merge,
    },
  ];
}
