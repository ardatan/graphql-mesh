import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import {
  RenameTypes,
  TransformEnumValues,
  RenameInterfaceFields,
  TransformObjectFields,
  RenameInputObjectFields,
  RenameObjectFieldArguments,
} from '@graphql-tools/wrap';
import { ExecutionResult, ExecutionRequest } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';

import { NAMING_CONVENTIONS, IGNORED_ROOT_FIELD_NAMES, IGNORED_TYPE_NAMES } from './shared.js';

export default class NamingConventionTransform implements MeshTransform {
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>) {
    if (options.config.typeNames) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.typeNames];
      this.transforms.push(
        new RenameTypes(typeName =>
          IGNORED_TYPE_NAMES.includes(typeName) ? typeName : namingConventionFn(typeName) || typeName
        ) as any
      );
    }
    if (options.config.fieldNames) {
      const fieldNamingConventionFn = options.config.fieldNames
        ? NAMING_CONVENTIONS[options.config.fieldNames]
        : (s: string) => s;
      this.transforms.push(
        new RenameInputObjectFields((_, fieldName) => fieldNamingConventionFn(fieldName) || fieldName) as any,
        new TransformObjectFields((_, fieldName, fieldConfig) => [
          IGNORED_ROOT_FIELD_NAMES.includes(fieldName) ? fieldName : fieldNamingConventionFn(fieldName) || fieldName,
          fieldConfig,
        ]) as any,
        new RenameInterfaceFields((_, fieldName) => fieldNamingConventionFn(fieldName) || fieldName) as any
      );
    }

    if (options.config.fieldArgumentNames) {
      const fieldArgNamingConventionFn = options.config.fieldArgumentNames
        ? NAMING_CONVENTIONS[options.config.fieldArgumentNames]
        : (s: string) => s;

      this.transforms.push(
        new RenameObjectFieldArguments((_typeName, _fieldName, argName) => fieldArgNamingConventionFn(argName)) as any
      );
    }

    if (options.config.enumValues) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.enumValues];

      this.transforms.push(
        new TransformEnumValues((typeName, externalValue, enumValueConfig) => {
          const newEnumValue = namingConventionFn(externalValue) || externalValue;
          return [newEnumValue, enumValueConfig];
        }) as any
      );
    }
  }

  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema
  ) {
    return applySchemaTransforms(originalWrappingSchema, subschemaConfig, transformedSchema, this.transforms);
  }

  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ) {
    return applyRequestTransforms(originalRequest, delegationContext, transformationContext, this.transforms);
  }

  transformResult(originalResult: ExecutionResult, delegationContext: DelegationContext, transformationContext: any) {
    return applyResultTransforms(originalResult, delegationContext, transformationContext, this.transforms);
  }
}
