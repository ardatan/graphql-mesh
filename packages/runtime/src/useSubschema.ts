import { applyRequestTransforms, applyResultTransforms, applySchemaTransforms } from '@graphql-mesh/utils';
import { createDefaultExecutor, DelegationContext, SubschemaConfig } from '@graphql-tools/delegate';
import { ExecutionRequest, getOperationASTFromRequest, isAsyncIterable } from '@graphql-tools/utils';
import { mapAsyncIterator, Plugin, TypedExecutionArgs } from '@envelop/core';
import { GraphQLSchema, introspectionFromSchema } from 'graphql';

function getExecuteFnByArgs(args: TypedExecutionArgs<any>, subschema: SubschemaConfig) {
  const transformationContext: Record<string, any> = {};
  const originalRequest: ExecutionRequest = {
    document: args.document,
    variables: args.variableValues as any,
    operationName: args.operationName ?? undefined,
    rootValue: args.rootValue,
    context: args.contextValue,
  };
  const operationAST = getOperationASTFromRequest(originalRequest);
  const delegationContext: DelegationContext = {
    subschema,
    subschemaConfig: subschema,
    targetSchema: args.schema,
    operation: operationAST.operation,
    fieldName: '', // Might not work
    context: args.contextValue,
    rootValue: args.rootValue,
    transforms: subschema.transforms,
    transformedSchema: args.schema,
    skipTypeMerging: true,
    returnType: {} as any, // Might not work
  };
  const executor = subschema.executor ?? createDefaultExecutor(subschema.schema);
  return async function subschemaExecute(): Promise<any> {
    const transformedRequest = applyRequestTransforms(
      originalRequest,
      delegationContext,
      transformationContext,
      subschema.transforms
    );
    const originalResult = await executor(transformedRequest);
    if (isAsyncIterable(originalResult)) {
      return mapAsyncIterator(originalResult, singleResult =>
        applyResultTransforms(singleResult, delegationContext, transformationContext, subschema.transforms)
      );
    }
    const transformedResult = applyResultTransforms(
      originalResult,
      delegationContext,
      transformationContext,
      subschema.transforms
    );
    return transformedResult;
  };
}

// Creates an envelop plugin to execute a subschema inside Envelop
export function useSubschema(subschema: SubschemaConfig): {
  transformedSchema: GraphQLSchema;
  plugin: Plugin;
} {
  const transformedSchema = applySchemaTransforms(subschema.schema, subschema, subschema.schema, subschema.transforms);

  const plugin: Plugin = {
    onPluginInit({ setSchema }) {
      setSchema(transformedSchema);
    },
    onExecute({ args, setExecuteFn, setResultAndStopExecution }) {
      // TODO: This is a hack to make introspection work properly
      if (args.operationName === 'IntrospectionQuery') {
        setResultAndStopExecution({
          data: introspectionFromSchema(args.schema) as any,
        });
      }
      setExecuteFn(getExecuteFnByArgs(args, subschema));
    },
    onSubscribe({ args, setSubscribeFn }) {
      setSubscribeFn(getExecuteFnByArgs(args, subschema));
    },
  };

  return {
    transformedSchema,
    plugin,
  };
}
