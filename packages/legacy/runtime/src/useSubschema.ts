import type { DocumentNode, FieldNode, OperationDefinitionNode } from 'graphql';
import { BREAK, execute, visit } from 'graphql';
import type { CompiledQuery } from 'graphql-jit';
import { compileQuery, isCompiledQuery } from 'graphql-jit';
import type { Plugin, TypedExecutionArgs } from '@envelop/core';
import { mapAsyncIterator } from '@envelop/core';
import type { ExecutionResultWithSerializer } from '@envelop/graphql-jit';
import {
  applyRequestTransforms,
  applyResultTransforms,
  mapMaybePromise,
} from '@graphql-mesh/utils';
import type { DelegationContext, Subschema } from '@graphql-tools/delegate';
import { applySchemaTransforms, createDefaultExecutor } from '@graphql-tools/delegate';
import type {
  ExecutionRequest,
  ExecutionResult,
  MaybeAsyncIterable,
  MaybePromise,
} from '@graphql-tools/utils';
import {
  getDefinedRootType,
  getOperationASTFromRequest,
  isAsyncIterable,
  memoize1,
  printSchemaWithDirectives,
} from '@graphql-tools/utils';
import { isGraphQLJitCompatible } from './utils.js';

enum IntrospectionQueryType {
  FEDERATION = 'FEDERATION',
  REGULAR = 'REGULAR',
  STREAM = 'STREAM',
}

const getIntrospectionOperationType = memoize1(function getIntrospectionOperationType(
  operationAST: OperationDefinitionNode,
): IntrospectionQueryType | null {
  let introspectionQueryType = null;
  if (operationAST.operation === 'query' && operationAST.selectionSet.selections.length === 1) {
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
        if (node.directives?.some(d => d.name.value === 'stream')) {
          introspectionQueryType = IntrospectionQueryType.STREAM;
          return BREAK;
        }
      },
    });
  }
  return introspectionQueryType;
});

function getExecuteFn(subschema: Subschema) {
  const compiledQueryCache = new WeakMap<DocumentNode, CompiledQuery>();
  const transformedDocumentNodeCache = new WeakMap<DocumentNode, DocumentNode>();
  return function subschemaExecute(args: TypedExecutionArgs<any>): any {
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
    const isStream = introspectionQueryType === IntrospectionQueryType.STREAM;
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
      if (
        !isGraphQLJitCompatible(subschema.schema) ||
        isStream ||
        operationAST.operation === 'subscription'
      ) {
        executor = createDefaultExecutor(subschema.schema);
      } else {
        executor = function subschemaExecutor(request: ExecutionRequest): any {
          let compiledQuery = compiledQueryCache.get(request.document);
          if (!compiledQuery) {
            const compilationResult = compileQuery(
              subschema.schema,
              request.document,
              request.operationName,
              {
                // TODO: Disable for now
                customJSONSerializer: false,
                disableLeafSerialization: true,
              },
            );
            if (!isCompiledQuery(compilationResult)) {
              return compilationResult as ExecutionResult;
            }
            compiledQuery = compilationResult;
            compiledQueryCache.set(request.document, compiledQuery);
          }
          if (operationAST.operation === 'subscription') {
            return mapMaybePromise(
              compiledQuery.subscribe(
                request.rootValue,
                request.context,
                request.variables,
              ) as MaybePromise<ExecutionResultWithSerializer>,
              result => {
                result.stringify = compiledQuery.stringify;
                return result;
              },
            );
          }
          return mapMaybePromise(
            compiledQuery.query(
              request.rootValue,
              request.context,
              request.variables,
            ) as MaybePromise<ExecutionResultWithSerializer>,
            result => {
              result.stringify = compiledQuery.stringify;
              return result;
            },
          );
        };
      }
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
    const cachedTransfomedDocumentNode: DocumentNode = transformedDocumentNodeCache.get(
      originalRequest.document,
    );
    if (cachedTransfomedDocumentNode) {
      transformedRequest.document = cachedTransfomedDocumentNode;
    } else {
      transformedDocumentNodeCache.set(originalRequest.document, transformedRequest.document);
    }

    return mapMaybePromise(
      executor(transformedRequest),
      function handleResult(originalResult: MaybeAsyncIterable<ExecutionResult>) {
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
      },
    );
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
      setExecuteFn(
        // @ts-expect-error the typed execution args dont match regular execution types
        executeFn,
      );
    },
    onSubscribe({ setSubscribeFn }) {
      setSubscribeFn(
        // @ts-expect-error the typed execution args dont match regular execution types
        executeFn,
      );
    },
  };

  return plugin;
}
