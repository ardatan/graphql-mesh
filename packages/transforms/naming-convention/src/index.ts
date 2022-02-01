import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import {
  RenameTypes,
  RenameObjectFields,
  RenameInputObjectFields,
  TransformEnumValues,
  RenameInterfaceFields,
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
import { resolvers as scalarsResolversMap } from 'graphql-scalars';

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

const IGNORED_TYPE_NAMES = [
  'date',
  'hostname',
  'regex',
  'json-pointer',
  'relative-json-pointer',
  'uri-reference',
  'uri-template',
  ...Object.keys(scalarsResolversMap),
];

export default class NamingConventionTransform implements MeshTransform {
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>) {
    if (options.config.typeNames) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.typeNames];
      this.transforms.push(
        new RenameTypes(typeName =>
          IGNORED_TYPE_NAMES.includes(typeName) ? typeName : namingConventionFn(typeName) || typeName
        )
      );
    }
    if (options.config.fieldNames) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.fieldNames];
      this.transforms.push(
        new RenameObjectFields((_, fieldName) =>
          IGNORED_ROOT_FIELD_NAMES.includes(fieldName) ? fieldName : namingConventionFn(fieldName) || fieldName
        ),
        new RenameInputObjectFields((_, fieldName) => namingConventionFn(fieldName) || fieldName),
        new RenameInterfaceFields((_, fieldName) => namingConventionFn(fieldName) || fieldName)
      );
    }
    if (options.config.enumValues) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.enumValues];

      this.transforms.push(
        new TransformEnumValues((typeName, externalValue, enumValueConfig) => [
          namingConventionFn(externalValue) || externalValue,
          enumValueConfig,
        ])
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
