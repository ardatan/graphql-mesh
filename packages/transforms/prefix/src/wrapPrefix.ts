import { GraphQLSchema } from 'graphql';
import { MeshTransform, YamlConfig, MeshTransformOptions } from '@graphql-mesh/types';
import { RenameTypes, RenameRootFields } from '@graphql-tools/wrap';
import { ExecutionResult, ExecutionRequest } from '@graphql-tools/utils';
import { Transform, SubschemaConfig, DelegationContext } from '@graphql-tools/delegate';
import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';
import { resolvers as scalarsResolversMap } from 'graphql-scalars';

export default class WrapPrefix implements MeshTransform {
  private transforms: Transform[] = [];

  constructor(options: MeshTransformOptions<YamlConfig.PrefixTransformConfig>) {
    const { apiName, config } = options;
    let prefix: string | null = null;

    if (config.value) {
      prefix = config.value;
    } else if (apiName) {
      prefix = `${apiName}_`;
    }

    if (!prefix) {
      throw new Error(`Transform 'prefix' has missing config: prefix`);
    }

    const ignoreList = [
      ...(config.ignore || []),
      'date',
      'hostname',
      'regex',
      'json-pointer',
      'relative-json-pointer',
      'uri-reference',
      'uri-template',
      ...Object.keys(scalarsResolversMap),
    ];

    const includeTypes = config.includeTypes !== false;

    if (includeTypes) {
      this.transforms.push(
        new RenameTypes(typeName => (ignoreList.includes(typeName) ? typeName : `${prefix}${typeName}`)) as any
      );
    }

    const includeRootOperations = config.includeRootOperations === true;

    if (includeRootOperations) {
      this.transforms.push(
        new RenameRootFields((typeName, fieldName) =>
          ignoreList.includes(typeName) || ignoreList.includes(`${typeName}.${fieldName}`)
            ? fieldName
            : `${prefix}${fieldName}`
        ) as any
      );
    }
  }

  transformSchema(originalWrappingSchema: GraphQLSchema, subschemaConfig: SubschemaConfig) {
    return applySchemaTransforms(originalWrappingSchema, subschemaConfig, this.transforms);
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
