import { getNamedType, isEnumType, isInputObjectType, type GraphQLSchema } from 'graphql';
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

/**
 * Rename input-object fields and rewrite arg defaults that reference them in a
 * single `mapSchema` pass. Separate RenameInputObjectFields → rebuild strips
 * GraphQL 16 defaults whose keys no longer match (→ `Filter = {}`).
 */
class RenameInputFieldsAndDefaultsTransform implements Transform {
  constructor(
    private fieldNamingConventionFn: (s: string) => string,
    private enumNamingConventionFn: (s: string) => string,
  ) {}

  transformSchema(schema: GraphQLSchema) {
    return mapSchema(schema, {
      [MapperKind.INPUT_OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
        if (IGNORED_TYPE_NAMES.includes(typeName)) {
          return undefined;
        }
        const newName = this.fieldNamingConventionFn(fieldName) || fieldName;
        return newName === fieldName ? undefined : [newName, fieldConfig];
      },
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName) => {
        let nextConfig = fieldConfig;
        if (fieldConfig.args) {
          let changed = false;
          const newArgs = { ...fieldConfig.args };
          for (const [argName, argConfig] of Object.entries(newArgs)) {
            const named = getNamedType(argConfig.type);
            if (!isInputObjectType(named) && !isEnumType(named)) {
              continue;
            }
            if (!hasRewritableEnumDefaultForType(argConfig, argConfig.type)) {
              continue;
            }
            changed = true;
            newArgs[argName] = withRenamedEnumDefaultsForType(
              argConfig,
              argConfig.type,
              this.enumNamingConventionFn,
              this.fieldNamingConventionFn,
            );
          }
          if (changed) {
            nextConfig = { ...fieldConfig, args: newArgs };
          }
        }
        const newFieldName = IGNORED_ROOT_FIELD_NAMES.includes(fieldName)
          ? fieldName
          : this.fieldNamingConventionFn(fieldName) || fieldName;
        return [newFieldName, nextConfig];
      },
      [MapperKind.INTERFACE_FIELD]: (fieldConfig, fieldName) => {
        const newFieldName = this.fieldNamingConventionFn(fieldName) || fieldName;
        return newFieldName === fieldName ? undefined : [newFieldName, fieldConfig];
      },
    });
  }
}

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
      const enumNamingConventionFn = options.config.enumValues
        ? NAMING_CONVENTIONS[options.config.enumValues]
        : (s: string) => s;
      this.transforms.push(
        new RenameInputFieldsAndDefaultsTransform(
          fieldNamingConventionFn,
          enumNamingConventionFn,
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
      );

      // When fieldNames already rewrote defaults atomically above, only pure-enum
      // args still need a pass (GraphQL 17 `default.literal` / leftover AST).
      if (!options.config.fieldNames) {
        this.transforms.push(
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
