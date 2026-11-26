import { getNamedType, isEnumType, isInputObjectType, type GraphQLSchema } from 'graphql';
import type { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import {
  applyRequestTransforms,
  applyResultTransforms,
  applySchemaTransforms,
} from '@graphql-mesh/utils';
import type { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import type { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
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

export default class NamingConventionTransform implements MeshTransform {
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>) {
    if (options.config.typeNames) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.typeNames];
      this.transforms.push(
        new RenameTypes(typeName =>
          IGNORED_TYPE_NAMES.includes(typeName)
            ? typeName
            : namingConventionFn(typeName) || typeName,
        ) as any,
      );
    }
    if (options.config.fieldNames) {
      const fieldNamingConventionFn = options.config.fieldNames
        ? NAMING_CONVENTIONS[options.config.fieldNames]
        : (s: string) => s;
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
        new RenameInterfaceFields(
          (_, fieldName) => fieldNamingConventionFn(fieldName) || fieldName,
        ) as any,
      );
    }

    if (options.config.fieldArgumentNames) {
      const fieldArgNamingConventionFn = options.config.fieldArgumentNames
        ? NAMING_CONVENTIONS[options.config.fieldArgumentNames]
        : (s: string) => s;

      this.transforms.push(
        new RenameObjectFieldArguments((_typeName, _fieldName, argName) =>
          fieldArgNamingConventionFn(argName),
        ) as any,
      );
    }

    if (options.config.enumValues) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.enumValues];
      const fieldNamingConventionFn = options.config.fieldNames
        ? NAMING_CONVENTIONS[options.config.fieldNames]
        : undefined;

      this.transforms.push(
        new TransformEnumValues((_typeName, externalValue, enumValueConfig) => {
          const newEnumValue = namingConventionFn(externalValue) || externalValue;
          // Keep internal value in sync with the renamed external name (same as bare mode)
          // so rewritten argument defaults match what resolvers receive.
          return [
            newEnumValue,
            {
              ...enumValueConfig,
              value: newEnumValue,
            },
          ];
        }) as any,
        // GraphQL 17 keeps enum defaults on `default.literal`; rewrite them to the
        // renamed external values (same as bare mode's MapperKind.ARGUMENT path).
        // shared.ts also rewrites input-object default keys when fieldNames is set.
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
            if (!hasRewritableEnumDefaultForType(argConfig, argConfig.type)) {
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
    return applySchemaTransforms(
      originalWrappingSchema,
      subschemaConfig,
      transformedSchema,
      this.transforms,
    );
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
