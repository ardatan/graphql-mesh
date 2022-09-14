import { applyRequestTransforms, applyResultTransforms } from '@graphql-mesh/utils';
import { createDefaultExecutor, DelegationContext, applySchemaTransforms, Subschema } from '@graphql-tools/delegate';
import { ExecutionRequest, getOperationASTFromRequest, isAsyncIterable } from '@graphql-tools/utils';
import { isIntrospectionOperation, mapAsyncIterator, Plugin, TypedExecutionArgs } from '@envelop/core';
import { introspectionFromSchema } from 'graphql';
import { createBatchingExecutor } from '@graphql-tools/batch-execute';

function getExecuteFn(subschema: Subschema) {
  return async function subschemaExecute(args: TypedExecutionArgs<any>): Promise<any> {
    const originalRequest: ExecutionRequest = {
      document: args.document,
      variables: args.variableValues as any,
      operationName: args.operationName ?? undefined,
      rootValue: args.rootValue,
      context: args.contextValue,
    };
    const operationAST = getOperationASTFromRequest(originalRequest);
    // TODO: We need more elegant solution
    if (isIntrospectionOperation(operationAST)) {
      return {
        data: introspectionFromSchema(args.schema),
      };
    }
    const delegationContext: DelegationContext = {
      subschema,
      subschemaConfig: subschema,
      targetSchema: args.schema,
      operation: operationAST.operation,
      fieldName: '', // Might not work
      context: args.contextValue,
      rootValue: args.rootValue,
      transforms: subschema.transforms,
      transformedSchema: subschema.transformedSchema,
      skipTypeMerging: true,
      returnType: args.schema.getRootType(operationAST.operation),
    };
    let executor = subschema.executor;
    if (executor == null) {
      executor = createDefaultExecutor(subschema.schema);
    }
    if (subschema.batch) {
      executor = createBatchingExecutor(executor);
    }
    const transformationContext: Record<string, any> = {};
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
export function useSubschema(subschema: Subschema): Plugin {
  const executeFn = getExecuteFn(subschema);

  const plugin: Plugin = {
    onPluginInit({ setSchema }) {
      // To prevent unwanted warnings from stitching
      if (!('_transformedSchema' in subschema)) {
        subschema.transformedSchema = applySchemaTransforms(subschema.schema, subschema);
      }

      subschema.transformedSchema.extensions =
        subschema.transformedSchema.extensions || subschema.schema.extensions || {};
      Object.assign(subschema.transformedSchema.extensions, subschema.schema.extensions);
      setSchema(subschema.transformedSchema);
    },
    onExecute({ setExecuteFn }) {
      setExecuteFn(executeFn);
    },
    onSubscribe({ setSubscribeFn }) {
      setSubscribeFn(executeFn);
    },
  };

  return plugin;
}
