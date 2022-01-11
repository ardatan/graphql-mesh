import { GraphQLFieldConfig, GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import {
  RenameTypes,
  TransformEnumValues,
  RenameInterfaceFields,
  TransformObjectFields,
  RenameInputObjectFields,
} from '@graphql-tools/wrap';
import { ExecutionResult, ExecutionRequest } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';

import {
  camelCase,
  capitalCase,
  constantCase,
  dotCase,
  headerCase,
  noCase,
  paramCase,
  pascalCase,
  pathCase,
  sentenceCase,
  snakeCase,
} from 'change-case';

import { upperCase } from 'upper-case';
import { lowerCase } from 'lower-case';

type NamingConventionFn = (input: string) => string;
type NamingConventionType = YamlConfig.NamingConventionTransformConfig['typeNames'];

const NAMING_CONVENTIONS: Record<NamingConventionType, NamingConventionFn> = {
  camelCase,
  capitalCase,
  constantCase,
  dotCase,
  headerCase,
  noCase,
  paramCase,
  pascalCase,
  pathCase,
  sentenceCase,
  snakeCase,
  upperCase,
  lowerCase,
};

// Ignore fields needed by Federation spec
const IGNORED_ROOT_FIELD_NAMES = ['_service', '_entities'];

export default class NamingConventionTransform implements MeshTransform {
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>) {
    if (options.config.typeNames) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.typeNames];
      this.transforms.push(new RenameTypes(typeName => namingConventionFn(typeName) || typeName));
    }
    if (options.config.fieldNames) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.fieldNames];
      this.transforms.push(
        new RenameInputObjectFields((_, fieldName) => namingConventionFn(fieldName) || fieldName),
        new TransformObjectFields((_, fieldName, fieldConfig) => [
          IGNORED_ROOT_FIELD_NAMES.includes(fieldName) ? fieldName : namingConventionFn(fieldName) || fieldName,
          this.transformFieldArguments(options, fieldConfig),
        ]),
        new RenameInterfaceFields((_, fieldName) => namingConventionFn(fieldName) || fieldName)
      );
    }
    if (options.config.enumValues) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.enumValues];

      this.transforms.push(
        new TransformEnumValues((_, externalValue, enumValueConfig) => [
          namingConventionFn(externalValue) || externalValue,
          enumValueConfig,
        ])
      );
    }
  }

  private transformFieldArguments(
    options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>,
    fieldConfig: GraphQLFieldConfig<any, Record<string, any>, any>
  ): GraphQLFieldConfig<any, Record<string, any>, any> {
    if (!options.config.fieldArgumentNames) {
      return fieldConfig;
    } else {
      const namingConventionFn = options.config.fieldArgumentNames
        ? NAMING_CONVENTIONS[options.config.fieldArgumentNames]
        : null;
      return {
        ...fieldConfig,
        args: Object.fromEntries(Object.entries(fieldConfig.args).map(([k, v]) => [namingConventionFn(k), v])),
      };
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
