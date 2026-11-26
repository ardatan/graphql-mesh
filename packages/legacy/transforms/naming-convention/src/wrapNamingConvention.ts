import {
  getNamedType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLInputType,
  type GraphQLSchema,
} from 'graphql';
import type { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import {
  applyRequestTransforms,
  applyResultTransforms,
  applySchemaTransforms,
} from '@graphql-mesh/utils';
import type { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import {
  MapperKind,
  mapSchema,
  type ExecutionRequest,
  type ExecutionResult,
} from '@graphql-tools/utils';
import {
  RenameInputObjectFields,
  RenameInterfaceFields,
  RenameObjectFieldArguments,
  RenameTypes,
  TransformEnumValues,
  TransformObjectFields,
} from '@graphql-tools/wrap';
import {
  hasRewritableEnumDefaultForType,
  IGNORED_ROOT_FIELD_NAMES,
  IGNORED_TYPE_NAMES,
  NAMING_CONVENTIONS,
  withRenamedEnumDefaultsForType,
} from './shared.js';

type NamingFn = (input: string) => string;

/** Helper input shape (GQL17 `default` is stricter on GraphQLArgumentConfig). */
type ArgDefaultFields = Parameters<typeof hasRewritableEnumDefaultForType>[0];
/** Snapshot + original arg type — needed to map wire enum defaults to member names. */
type ArgDefaultSnapshot = ArgDefaultFields & {
  originalArgType: GraphQLInputType;
};

/**
 * `@graphql-tools/wrap` TransformEnumValues forces `value: undefined`, so GraphQL
 * defaults the internal value to the renamed external name. Restore custom
 * wire/internal values (e.g. `newbie → 1`) from the pre-transform schema.
 */
function restoreCustomEnumInternals(
  originalSchema: GraphQLSchema,
  nextSchema: GraphQLSchema,
  opts: { typeNamesFn?: NamingFn; enumValuesFn?: NamingFn },
): GraphQLSchema {
  const { typeNamesFn, enumValuesFn } = opts;
  if (!enumValuesFn) {
    return nextSchema;
  }
  const renameType = (name: string) =>
    IGNORED_TYPE_NAMES.includes(name) ? name : typeNamesFn?.(name) || name;
  const customInternals = new Map<string, unknown>();
  for (const gqlType of Object.values(originalSchema.getTypeMap())) {
    if (!isEnumType(gqlType) || gqlType.name.startsWith('__')) {
      continue;
    }
    const newTypeName = renameType(gqlType.name);
    for (const v of gqlType.getValues()) {
      if (v.value === v.name) {
        continue;
      }
      customInternals.set(`${newTypeName}.${enumValuesFn(v.name)}`, v.value);
    }
  }
  if (customInternals.size === 0) {
    return nextSchema;
  }
  return mapSchema(nextSchema, {
    [MapperKind.ENUM_VALUE]: (valueConfig, typeName, _schema, externalValue) => {
      const key = `${typeName}.${externalValue}`;
      if (!customInternals.has(key)) {
        return undefined;
      }
      return {
        ...valueConfig,
        value: customInternals.get(key),
      };
    },
  });
}

/**
 * GraphQL 16 wrap: `RenameInputObjectFields` rebuilds the schema before default
 * rewriting runs, so `{ user_status: newbie }` becomes `{}` against `userStatus`.
 * Re-apply defaults from the pre-transform schema against post-rename types.
 */
function reapplyArgDefaultsFromOriginal(
  originalSchema: GraphQLSchema,
  nextSchema: GraphQLSchema,
  opts: {
    typeNamesFn?: NamingFn;
    fieldNamesFn?: NamingFn;
    fieldArgumentNamesFn?: NamingFn;
    enumValuesFn?: NamingFn;
  },
): GraphQLSchema {
  const { typeNamesFn, fieldNamesFn, fieldArgumentNamesFn, enumValuesFn } = opts;
  if (!fieldNamesFn && !enumValuesFn) {
    return nextSchema;
  }

  const renameType = (name: string) =>
    IGNORED_TYPE_NAMES.includes(name) ? name : typeNamesFn?.(name) || name;
  const renameField = (name: string) =>
    IGNORED_ROOT_FIELD_NAMES.includes(name) ? name : fieldNamesFn?.(name) || name;
  const renameArg = (name: string) => fieldArgumentNamesFn?.(name) || name;

  const snapshots = new Map<string, ArgDefaultSnapshot>();
  for (const type of Object.values(originalSchema.getTypeMap())) {
    if (!isObjectType(type) && !isInterfaceType(type)) {
      continue;
    }
    if (type.name.startsWith('__')) {
      continue;
    }
    const newTypeName = renameType(type.name);
    for (const [fieldName, field] of Object.entries(type.getFields())) {
      const newFieldName = renameField(fieldName);
      for (const arg of field.args) {
        // RenameObjectFieldArguments renames object field arguments only.
        const newArgName = isInterfaceType(type) ? arg.name : renameArg(arg.name);
        const key = `${newTypeName}.${newFieldName}.${newArgName}`;
        snapshots.set(key, {
          defaultValue: arg.defaultValue,
          default: (arg as { default?: ArgDefaultSnapshot['default'] }).default,
          astNode: arg.astNode ?? undefined,
          originalArgType: arg.type as GraphQLInputType,
        });
      }
    }
  }

  const fixField = (
    fieldConfig: GraphQLFieldConfig<any, any>,
    fieldName: string,
    typeName: string,
  ): GraphQLFieldConfig<any, any> | undefined => {
    if (!fieldConfig.args) {
      return undefined;
    }
    let changed = false;
    const newArgs: GraphQLFieldConfigArgumentMap = { ...fieldConfig.args };
    for (const [argName, argConfig] of Object.entries(newArgs)) {
      const named = getNamedType(argConfig.type);
      if (!isEnumType(named) && !isInputObjectType(named)) {
        continue;
      }
      const snap = snapshots.get(`${typeName}.${fieldName}.${argName}`);
      if (!snap) {
        continue;
      }
      // Prefer original defaults — post-rename GraphQL 16 coercion may have emptied them.
      const { originalArgType, ...snapDefaults } = snap;
      const source: ArgDefaultFields = {
        defaultValue:
          snapDefaults.defaultValue !== undefined
            ? snapDefaults.defaultValue
            : argConfig.defaultValue,
        default: snapDefaults.default ?? (argConfig as ArgDefaultFields).default,
        astNode: snapDefaults.astNode ?? argConfig.astNode,
      };
      // Key renames must follow the public type's ignore rules (e.g. `obj_map` →
      // `ObjMap` stays ignored). Enum wire mapping still uses the original type.
      const originalNamed = getNamedType(originalArgType);
      const publicTypeName = IGNORED_TYPE_NAMES.includes(originalNamed.name)
        ? originalNamed.name
        : renameType(originalNamed.name);
      const keyRenameFn =
        IGNORED_TYPE_NAMES.includes(publicTypeName) ||
        IGNORED_TYPE_NAMES.includes(originalNamed.name)
          ? undefined
          : fieldNamesFn;
      // Rewrite against the original arg type so wire enum values (newbie→'wire')
      // resolve to member names before rename; apply onto the post-rename arg config.
      if (!hasRewritableEnumDefaultForType(source, originalArgType, keyRenameFn)) {
        continue;
      }
      // Cast: helper `default` is a loose snapshot; GQL17 GraphQLDefaultInput is a
      // discriminated union (`literal` required xor `value`).
      newArgs[argName] = {
        ...argConfig,
        ...withRenamedEnumDefaultsForType(
          source,
          originalArgType,
          enumValuesFn || ((s: string) => s),
          keyRenameFn,
        ),
      } as typeof argConfig;
      changed = true;
    }
    return changed ? { ...fieldConfig, args: newArgs } : undefined;
  };

  return mapSchema(nextSchema, {
    [MapperKind.ROOT_FIELD]: (fieldConfig, fieldName, typeName) =>
      fixField(fieldConfig, fieldName, typeName),
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) =>
      fixField(fieldConfig, fieldName, typeName),
    [MapperKind.INTERFACE_FIELD]: (fieldConfig, fieldName, typeName) =>
      fixField(fieldConfig, fieldName, typeName),
  });
}

export default class NamingConventionTransform implements MeshTransform {
  private transforms: Transform[] = [];
  private typeNamesFn?: NamingFn;
  private fieldNamesFn?: NamingFn;
  private fieldArgumentNamesFn?: NamingFn;
  private enumValuesFn?: NamingFn;

  constructor(options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>) {
    if (options.config.typeNames) {
      this.typeNamesFn = NAMING_CONVENTIONS[options.config.typeNames];
      const namingConventionFn = this.typeNamesFn;
      this.transforms.push(
        new RenameTypes(typeName =>
          IGNORED_TYPE_NAMES.includes(typeName)
            ? typeName
            : namingConventionFn(typeName) || typeName,
        ) as any,
      );
    }
    if (options.config.fieldNames) {
      this.fieldNamesFn = NAMING_CONVENTIONS[options.config.fieldNames];
      const fieldNamingConventionFn = this.fieldNamesFn;
      // Keep wrap transforms so transformRequest/transformResult still reverse-rename
      // fields for delegation. (A schema-only atomic mapSchema drops those paths and
      // breaks execute tests.)
      this.transforms.push(
        new RenameInputObjectFields((typeName, fieldName) =>
          IGNORED_TYPE_NAMES.includes(typeName)
            ? fieldName
            : fieldNamingConventionFn(fieldName) || fieldName,
        ) as any,
        new TransformObjectFields((_, fieldName, fieldConfig) => [
          IGNORED_ROOT_FIELD_NAMES.includes(fieldName)
            ? fieldName
            : fieldNamingConventionFn(fieldName) || fieldName,
          fieldConfig,
        ]) as any,
        new RenameInterfaceFields((_, fieldName) =>
          IGNORED_ROOT_FIELD_NAMES.includes(fieldName)
            ? fieldName
            : fieldNamingConventionFn(fieldName) || fieldName,
        ) as any,
      );
    }

    if (options.config.fieldArgumentNames) {
      this.fieldArgumentNamesFn = NAMING_CONVENTIONS[options.config.fieldArgumentNames];
      const fieldArgNamingConventionFn = this.fieldArgumentNamesFn;

      this.transforms.push(
        new RenameObjectFieldArguments((_typeName, _fieldName, argName) =>
          fieldArgNamingConventionFn(argName),
        ) as any,
      );
    }

    if (options.config.enumValues) {
      this.enumValuesFn = NAMING_CONVENTIONS[options.config.enumValues];
      const namingConventionFn = this.enumValuesFn;
      const fieldNamingConventionFn = this.fieldNamesFn;

      this.transforms.push(
        new TransformEnumValues((_typeName, externalValue, enumValueConfig) => {
          const newEnumValue = namingConventionFn(externalValue) || externalValue;
          // Name-default members sync internal → renamed name; custom wire/internal
          // values stay so rewritten defaults match what resolvers receive.
          const prevInternal =
            enumValueConfig.value !== undefined ? enumValueConfig.value : externalValue;
          const newInternal = prevInternal === externalValue ? newEnumValue : prevInternal;
          return [
            newEnumValue,
            {
              ...enumValueConfig,
              value: newInternal,
            },
          ];
        }) as any,
        // GraphQL 17 keeps enum defaults on `default.literal`; rewrite them to the
        // renamed external values (same as bare mode's MapperKind.ARGUMENT path).
        // shared.ts also rewrites input-object default keys when fieldNames is set.
        // GraphQL 16 may still empty defaults during RenameInputObjectFields — restored
        // in transformSchema via reapplyArgDefaultsFromOriginal.
        new TransformObjectFields((_typeName, fieldName, fieldConfig) => {
          if (!fieldConfig.args) {
            return [fieldName, fieldConfig];
          }
          let changed = false;
          const newArgs = { ...fieldConfig.args };
          for (const [argName, argConfig] of Object.entries(newArgs)) {
            const named = getNamedType(argConfig.type);
            if (!isEnumType(named) && !isInputObjectType(named)) {
              continue;
            }
            if (
              !hasRewritableEnumDefaultForType(argConfig, argConfig.type, fieldNamingConventionFn)
            ) {
              continue;
            }
            changed = true;
            newArgs[argName] = withRenamedEnumDefaultsForType(
              argConfig,
              argConfig.type,
              namingConventionFn,
              fieldNamingConventionFn,
            );
          }
          return [fieldName, changed ? { ...fieldConfig, args: newArgs } : fieldConfig];
        }) as any,
      );
    }
  }

  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema,
  ) {
    const next = applySchemaTransforms(
      originalWrappingSchema,
      subschemaConfig,
      transformedSchema,
      this.transforms,
    );
    const withInternals = restoreCustomEnumInternals(originalWrappingSchema, next, {
      typeNamesFn: this.typeNamesFn,
      enumValuesFn: this.enumValuesFn,
    });
    return reapplyArgDefaultsFromOriginal(originalWrappingSchema, withInternals, {
      typeNamesFn: this.typeNamesFn,
      fieldNamesFn: this.fieldNamesFn,
      fieldArgumentNamesFn: this.fieldArgumentNamesFn,
      enumValuesFn: this.enumValuesFn,
    });
  }

  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>,
  ) {
    return applyRequestTransforms(
      originalRequest,
      delegationContext,
      transformationContext,
      this.transforms,
    );
  }

  transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
    transformationContext: any,
  ) {
    return applyResultTransforms(
      originalResult,
      delegationContext,
      transformationContext,
      this.transforms,
    );
  }
}
