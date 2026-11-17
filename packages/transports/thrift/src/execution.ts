import type { GraphQLError, GraphQLSchema } from 'graphql';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import type { Executor } from '@graphql-mesh/transport-common';
import {
  getOperationsAndFragments,
  getRootFieldsWithArgs,
  projectResultBySelectionSet,
} from '@graphql-mesh/utils';
import { getDirectiveExtensions, getRootTypeMap, type ExecutionResult } from '@graphql-tools/utils';
import { createGraphQLThriftClient, type ThriftRpcBinding } from './client.js';
import type { GraphQLThriftAnnotations } from './types.js';

export function getThriftExecutor(subgraph: GraphQLSchema): Executor {
  const schemaDefDirectives = getDirectiveExtensions<{
    transport: GraphQLThriftAnnotations;
  }>(subgraph);
  const transportDirectives = schemaDefDirectives?.transport;
  if (!transportDirectives?.length) {
    throw new Error('No @transport directive found on schema definition');
  }
  const graphqlAnnotations = transportDirectives[0];
  const client = createGraphQLThriftClient(graphqlAnnotations);
  let headers: Record<string, string> | undefined;
  if (typeof graphqlAnnotations.headers === 'string') {
    headers = JSON.parse(graphqlAnnotations.headers);
  }
  if (Array.isArray(graphqlAnnotations.headers)) {
    headers = Object.fromEntries(graphqlAnnotations.headers);
  }
  const headersFactory = getInterpolatedHeadersFactory(headers);
  const rootTypeMap = getRootTypeMap(subgraph);
  const thriftRpcByField = new Map<string, ThriftRpcBinding>();

  return async function thriftExecutor(executionRequest): Promise<ExecutionResult<any, any>> {
    const operationsAndFragments = getOperationsAndFragments(executionRequest.document);
    const operationName =
      executionRequest.operationName || Object.keys(operationsAndFragments.operations)[0];
    const operationAst = operationsAndFragments.operations[operationName];
    const rootType = rootTypeMap.get(operationAst.operation);
    if (!rootType) {
      throw new Error(`No root type found for operation type ${operationAst.operation}`);
    }
    const rootFieldMap = rootType.getFields();
    const rootFieldsWithArgs = getRootFieldsWithArgs(subgraph, executionRequest);
    const requestPromises: Promise<void>[] = [];
    const root: any = {};
    const errors: GraphQLError[] = [];
    for (const [fieldName, args] of rootFieldsWithArgs) {
      if (fieldName === '__typename') {
        root[fieldName] = rootType.name;
        continue;
      }
      const field = rootFieldMap[fieldName];
      if (!field) {
        throw new Error(`No root field found for field ${fieldName}`);
      }
      const cacheKey = `${rootType.name}.${fieldName}`;
      let binding = thriftRpcByField.get(cacheKey);
      if (binding == null) {
        const fieldDirectives = getDirectiveExtensions(field) || {};
        const thriftRpcDir = fieldDirectives.thrift__rpc?.[0];
        if (!thriftRpcDir) {
          throw new Error(`Field ${cacheKey} is missing @thrift__rpc binding`);
        }
        binding = {
          functionName: thriftRpcDir.function || fieldName,
          messageType: thriftRpcDir.messageType || 'CALL',
          args: thriftRpcDir.args,
          selection: thriftRpcDir.selection,
        };
        thriftRpcByField.set(cacheKey, binding);
      }
      requestPromises.push(
        client
          .doRequest(binding.functionName, args, binding, {
            headers: headersFactory({
              root,
              args,
              context: executionRequest.context,
              env: globalThis.process?.env,
            }),
          })
          .then(result => {
            root[fieldName] = result;
          })
          .catch(err => {
            errors.push(err);
          }),
      );
    }
    await Promise.all(requestPromises);
    const projectedData = projectResultBySelectionSet({
      result: root,
      selectionSet: operationAst.selectionSet,
      fragments: operationsAndFragments.fragments,
    });
    return {
      data: projectedData,
      errors: errors.length ? errors : undefined,
    };
  };
}
