import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import {
  RenameTypes,
  RenameObjectFields,
  RenameRootFields,
  RenameRootTypes,
  RenameInputObjectFields,
  TransformEnumValues,
  RenameInterfaceFields,
} from '@graphql-tools/wrap';
import { ExecutionResult, Request } from '@graphql-tools/utils';
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

export default class NamingConventionTransform implements MeshTransform {
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>) {
    if (options.config.typeNames) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.typeNames];
      this.transforms.push(
        new RenameTypes(typeName => namingConventionFn(typeName)),
        new RenameRootTypes(typeName => namingConventionFn(typeName))
      );
    }
    if (options.config.fieldNames) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.fieldNames];
      this.transforms.push(
        new RenameObjectFields((_, fieldName) => namingConventionFn(fieldName)),
        new RenameRootFields((_, fieldName) => namingConventionFn(fieldName)),
        new RenameInputObjectFields((_, fieldName) => namingConventionFn(fieldName)),
        new RenameInterfaceFields((_, fieldName) => namingConventionFn(fieldName))
      );
    }
    if (options.config.enumValues) {
      const namingConventionFn = NAMING_CONVENTIONS[options.config.enumValues];

      this.transforms.push(
        new TransformEnumValues((typeName, externalValue, enumValueConfig) => [
          namingConventionFn(externalValue),
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
    originalRequest: Request,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>
  ) {
    return applyRequestTransforms(originalRequest, delegationContext, transformationContext, this.transforms);
  }

  transformResult(originalResult: ExecutionResult, delegationContext: DelegationContext, transformationContext: any) {
    return applyResultTransforms(originalResult, delegationContext, transformationContext, this.transforms);
  }
}
