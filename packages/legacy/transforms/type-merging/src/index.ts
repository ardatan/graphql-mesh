import { getNamedType, isObjectType, type GraphQLSchema } from 'graphql';
import type {
  ImportFn,
  MeshTransform,
  MeshTransformOptions,
  YamlConfig,
} from '@graphql-mesh/types';
import type { SubschemaConfig } from '@graphql-tools/delegate';

/**
 * Stamps federation-ready type-merging directives on a legacy Mesh source schema.
 *
 * - `types[].key.selectionSet` → Fed `@key(fields: "…")` (selectionSet `{ id }` → `id`)
 * - `queryFields` → Mesh `@merge(keyField, keyArg, subgraph, …)` on the root field, plus
 *   Fed `@key(fields: keyField)` on the return object type when `keyField` is set
 *
 * Classic stitch `subschemaConfig.merge` / `stitchingDirectivesTransformer` are no
 * longer used — the federation merger composes from these directives.
 */
export default class TypeMerging implements MeshTransform {
  private config: YamlConfig.Transform['typeMerging'];
  private apiName: string;
  importFn: ImportFn;
  constructor({
    config,
    importFn,
    apiName,
  }: MeshTransformOptions<YamlConfig.Transform['typeMerging']>) {
    this.config = config;
    this.importFn = importFn;
    this.apiName = apiName;
  }

  public transformSchema(schema: GraphQLSchema, _subschemaConfig: SubschemaConfig) {
    if (this.config.types) {
      for (const mergedTypeConfig of this.config.types) {
        const type = schema.getType(mergedTypeConfig.typeName);
        if (!type) {
          continue;
        }
        type.extensions = type.extensions || {};
        const typeDirectiveExtensions: any = ((type.extensions.directives as any) =
          type.extensions.directives || {});
        if (mergedTypeConfig.key) {
          const fields = selectionSetToKeyFields(mergedTypeConfig.key.selectionSet);
          if (fields) {
            typeDirectiveExtensions.key = [{ fields }];
          }
        }
        if (mergedTypeConfig.canonical) {
          throw new Error(
            `typeMerging.types[].canonical is not supported with the federation merger ` +
              `(type "${mergedTypeConfig.typeName}"). Remove \`canonical\` or express the ` +
              `preferred definition in subgraph SDL / composition rules.`,
          );
        }
        if (mergedTypeConfig.fields) {
          if (!('getFields' in type)) {
            throw new Error(
              'You cannot add field annotations to this type ' + mergedTypeConfig.typeName,
            );
          }
          const fieldMap = type.getFields();
          for (const fieldConfig of mergedTypeConfig.fields) {
            const field = fieldMap[fieldConfig.fieldName];
            if (!field) {
              continue;
            }
            field.extensions = field.extensions || {};
            const fieldDirectiveExtensions: any = ((field.extensions.directives as any) =
              field.extensions.directives || {});
            if (fieldConfig.computed) {
              const requiresFields = selectionSetToKeyFields(fieldConfig.computed.selectionSet);
              if (requiresFields) {
                fieldDirectiveExtensions.requires = [{ fields: requiresFields }];
              }
            }
          }
        }
      }
    }
    if (this.config.queryFields) {
      const queryType = schema.getQueryType();
      if (!queryType) {
        return schema;
      }
      const queryFieldMap = queryType.getFields();
      for (const { queryFieldName, ...rootFieldConfig } of this.config.queryFields) {
        const field = queryFieldMap[queryFieldName];
        if (!field) {
          continue;
        }
        field.extensions = field.extensions || {};
        const fieldDirectiveExtensions: any = ((field.extensions.directives as any) =
          field.extensions.directives || {});
        // Stamp owning source so join rewrite can attribute `@merge` when the same
        // query field appears in multiple graphs.
        fieldDirectiveExtensions.merge = {
          ...rootFieldConfig,
          ...(this.apiName ? { subgraph: this.apiName } : {}),
        };

        // Ensure the return entity type has Fed `@key(fields)` for composition
        // (e.g. BookService Author after rename must be keyed to contribute `books`).
        if (rootFieldConfig.keyField) {
          const returnType = getNamedType(field.type);
          if (isObjectType(returnType)) {
            returnType.extensions = returnType.extensions || {};
            const returnDirs: any = ((returnType.extensions.directives as any) =
              returnType.extensions.directives || {});
            const keys: Array<{ fields: string }> = Array.isArray(returnDirs.key)
              ? [...returnDirs.key]
              : returnDirs.key
                ? [returnDirs.key]
                : [];
            if (!keys.some(k => k?.fields === rootFieldConfig.keyField)) {
              keys.push({ fields: rootFieldConfig.keyField });
            }
            returnDirs.key = keys;
          }
        }
      }
    }
    return schema;
  }
}

/**
 * Normalize a Mesh selectionSet string to Fed `@key(fields:)` / `@requires(fields:)` syntax.
 * Strips only outer braces; keeps the full selection (`sku locale`, `organization { id }`).
 * `id`, `{id}`, and `{ id }` all become `id`.
 */
function selectionSetToKeyFields(selectionSet: string | undefined): string | undefined {
  if (!selectionSet) {
    return undefined;
  }
  const trimmed = selectionSet.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const inner = trimmed.slice(1, -1).trim();
    return inner || undefined;
  }
  return trimmed || undefined;
}
