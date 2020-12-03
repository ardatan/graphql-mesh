import { GraphQLSchema } from 'graphql';
import { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import { ExecutionResult, Request } from '@graphql-tools/utils';

export function applySchemaTransforms(
  originalWrappingSchema: GraphQLSchema,
  subschemaConfig: SubschemaConfig,
  transformedSchema: GraphQLSchema,
  transforms: Transform[]
) {
  return transforms.reduce(
    (schema, transform) =>
      'transformSchema' in transform ? transform.transformSchema(schema, subschemaConfig, transformedSchema) : schema,
    originalWrappingSchema
  );
}
export function applyRequestTransforms(
  originalRequest: Request,
  delegationContext: DelegationContext,
  transformationContext: Record<string, any>,
  transforms: Transform[]
) {
  return transforms.reduce(
    (request, transform) =>
      'transformRequest' in transform
        ? transform.transformRequest(request, delegationContext, transformationContext)
        : request,
    originalRequest
  );
}
export function applyResultTransforms(
  originalResult: ExecutionResult,
  delegationContext: DelegationContext,
  transformationContext: any,
  transforms: Transform[]
) {
  return transforms.reduce(
    (result, transform) =>
      'transformResult' in transform
        ? transform.transformResult(result, delegationContext, transformationContext)
        : result,
    originalResult
  );
}
