import { BREAK, execute, FieldNode, OperationDefinitionNode, visit } from 'graphql';
import { mapAsyncIterator, Plugin, TypedExecutionArgs } from '@envelop/core';
import { applyRequestTransforms, applyResultTransforms } from '@graphql-mesh/utils';
import { createBatchingExecutor } from '@graphql-tools/batch-execute';
import {
  applySchemaTransforms,
  createDefaultExecutor,
  DelegationContext,
  Subschema,
} from '@graphql-tools/delegate';
import {
  ExecutionRequest,
  ExecutionResult,
  getDefinedRootType,
  getOperationASTFromRequest,
  isAsyncIterable,
  printSchemaWithDirectives,
} from '@graphql-tools/utils';

enum IntrospectionQueryType {
  FEDERATION = 'FEDERATION',
  REGULAR = 'REGULAR',
}

function getIntrospectionOperationType(
  operationAST: OperationDefinitionNode,
): IntrospectionQueryType | null {
  let introspectionQueryType = null;
  visit(operationAST, {
    Field: (node: FieldNode): any => {
      if (node.name.value === '__schema' || node.name.value === '__type') {
        introspectionQueryType = IntrospectionQueryType.REGULAR;
        return BREAK;
      }
      if (node.name.value === '_service') {
        introspectionQueryType = IntrospectionQueryType.FEDERATION;
        return BREAK;
      }
    },
  });
  return introspectionQueryType;
}

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
    const introspectionQueryType = getIntrospectionOperationType(operationAST);
    if (introspectionQueryType === IntrospectionQueryType.FEDERATION) {
      const executionResult: ExecutionResult = {
        data: {
          _service: {
            sdl: printSchemaWithDirectives(args.schema),
          },
        },
      };
      return executionResult;
    } else if (introspectionQueryType === IntrospectionQueryType.REGULAR) {
      return execute(args);
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
      returnType: getDefinedRootType(args.schema, operationAST.operation),
    };
    let executor = subschema.executor;
    if (executor == null) {
      executor = createDefaultExecutor(subschema.schema);
    }
    /*
    if (subschema.batch) {
      executor = createBatchingExecutor(executor);
    }
    */
    const transformationContext: Record<string, any> = {};
    const transformedRequest = applyRequestTransforms(
      originalRequest,
      delegationContext,
      transformationContext,
      subschema.transforms,
    );
    const originalResult = await executor(transformedRequest);
    if (isAsyncIterable(originalResult)) {
      return mapAsyncIterator(originalResult, singleResult =>
        applyResultTransforms(
          singleResult,
          delegationContext,
          transformationContext,
          subschema.transforms,
        ),
      );
    }
    const transformedResult = applyResultTransforms(
      originalResult,
      delegationContext,
      transformationContext,
      subschema.transforms,
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
      if (!('_transformedSchema' in (subschema as any))) {
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
