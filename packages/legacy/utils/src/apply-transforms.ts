import type { GraphQLSchema } from 'graphql';
import type { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import type { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';

export function applySchemaTransforms(
  originalWrappingSchema: GraphQLSchema,
  subschemaConfig: SubschemaConfig,
  transformedSchema: GraphQLSchema,
  transforms?: Transform[],
) {
  if (transforms?.length) {
    return transforms.reduce(
      (schema, transform) =>
        'transformSchema' in transform
          ? transform.transformSchema(schema, subschemaConfig)
          : schema,
      originalWrappingSchema,
    );
  }
  return originalWrappingSchema;
}
export function applyRequestTransforms(
  originalRequest: ExecutionRequest,
  delegationContext: DelegationContext,
  transformationContext: Record<string, any>,
  transforms: Transform[],
) {
  transformationContext.contextMap = transformationContext.contextMap || new WeakMap();
  const contextMap: WeakMap<Transform, Record<string, any>> = transformationContext.contextMap;
  transforms?.forEach(transform => {
    if (!contextMap.has(transform)) {
      contextMap.set(transform, {
        nextIndex: 0,
        paths: {},
      });
    }
  });
  return transforms.reduceRight(
    (request, transform) =>
      'transformRequest' in transform
        ? transform.transformRequest(request, delegationContext, contextMap.get(transform))
        : request,
    originalRequest,
  );
}
export function applyResultTransforms(
  originalResult: ExecutionResult,
  delegationContext: DelegationContext,
  transformationContext: Record<string, any>,
  transforms: Transform[],
) {
  const contextMap: WeakMap<Transform, Record<string, any>> = transformationContext.contextMap;
  return transforms.reduce(
    (result, transform) =>
      'transformResult' in transform
        ? transform.transformResult(result, delegationContext, contextMap.get(transform))
        : result,
    originalResult,
  );
}
