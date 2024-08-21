import type { GraphQLSchema } from 'graphql';
import type { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import {
  applyRequestTransforms,
  applyResultTransforms,
  applySchemaTransforms,
} from '@graphql-mesh/utils';
import type { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import type { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
import { RenameRootFields, RenameTypes } from '@graphql-tools/wrap';
import { ignoreList as defaultIgnoreList } from './shared.js';

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

    const ignoreList = [...(config.ignore || []), ...defaultIgnoreList];

    const includeTypes = config.includeTypes !== false;

    if (includeTypes) {
      this.transforms.push(
        new RenameTypes(typeName =>
          ignoreList.includes(typeName) ? typeName : `${prefix}${typeName}`,
        ) as any,
      );
    }

    const includeRootOperations = config.includeRootOperations === true;

    if (includeRootOperations) {
      this.transforms.push(
        new RenameRootFields((typeName, fieldName) =>
          ignoreList.includes(typeName) || ignoreList.includes(`${typeName}.${fieldName}`)
            ? fieldName
            : `${prefix}${fieldName}`,
        ) as any,
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
