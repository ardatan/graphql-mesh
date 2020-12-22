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
    originalRequest
  );
}
export function applyResultTransforms(
  originalResult: ExecutionResult,
  delegationContext: DelegationContext,
  transformationContext: Record<string, any>,
  transforms: Transform[]
) {
  const contextMap: WeakMap<Transform, Record<string, any>> = transformationContext.contextMap;
  return transforms.reduceRight(
    (result, transform) =>
      'transformResult' in transform
        ? transform.transformResult(result, delegationContext, contextMap.get(transform))
        : result,
    originalResult
  );
}
