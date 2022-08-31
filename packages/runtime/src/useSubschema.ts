import { applyRequestTransforms, applyResultTransforms } from '@graphql-mesh/utils';
import {
  createDefaultExecutor,
  DelegationContext,
  SubschemaConfig,
  applySchemaTransforms,
} from '@graphql-tools/delegate';
import { ExecutionRequest, getOperationASTFromRequest, isAsyncIterable } from '@graphql-tools/utils';
import { mapAsyncIterator, Plugin, TypedExecutionArgs } from '@envelop/core';
import { GraphQLSchema, introspectionFromSchema } from 'graphql';
import { createBatchingExecutor } from '@graphql-tools/batch-execute';

function getExecuteFn(subschema: SubschemaConfig) {
  return async function subschemaExecute(args: TypedExecutionArgs<any>): Promise<any> {
    const transformationContext: Record<string, any> = {};
    const originalRequest: ExecutionRequest = {
      document: args.document,
      variables: args.variableValues as any,
      operationName: args.operationName ?? undefined,
      rootValue: args.rootValue,
      context: args.contextValue,
    };
    const operationAST = getOperationASTFromRequest(originalRequest);
    // TODO: We need more elegant solution
    if (operationAST.name?.value === 'IntrospectionQuery') {
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
      transformedSchema: args.schema,
      skipTypeMerging: true,
      returnType: {} as any, // Might not work
    };
    let executor = subschema.executor;
    if (executor == null) {
      executor = createDefaultExecutor(subschema.schema);
    }
    if (subschema.batch) {
      executor = createBatchingExecutor(executor);
    }
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
  const transformedSchema = applySchemaTransforms(subschema.schema, subschema);

  const plugin: Plugin = {
    onPluginInit({ setSchema }) {
      setSchema(transformedSchema);
    },
    onExecute({ setExecuteFn }) {
      setExecuteFn(getExecuteFn(subschema));
    },
    onSubscribe({ setSubscribeFn }) {
      setSubscribeFn(getExecuteFn(subschema));
    },
  };

  return {
    transformedSchema,
    plugin,
  };
}
