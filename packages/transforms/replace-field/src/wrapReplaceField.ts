import { GraphQLSchema } from 'graphql';
import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { DelegationContext } from '@graphql-tools/delegate';
import { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';

export default class WrapHoistField implements MeshTransform {
  constructor(options: MeshTransformOptions<YamlConfig.ReplaceFieldTransform>) {
    // TODO
  }

  transformSchema(
    originalWrappingSchema: GraphQLSchema
    // subschemaConfig: SubschemaConfig,
    // transformedSchema?: GraphQLSchema
  ) {
    // TODO
    return originalWrappingSchema;
  }

  transformRequest(
    originalRequest: ExecutionRequest
    // delegationContext: DelegationContext,
    // transformationContext: Record<string, any>
  ) {
    // TODO
    return originalRequest;
  }

  transformResult(originalResult: ExecutionResult, delegationContext: DelegationContext, transformationContext: any) {
    // TODO
    return originalResult;
  }
}
