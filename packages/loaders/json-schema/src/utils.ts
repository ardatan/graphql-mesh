import { OperationTypeNode } from 'graphql';
import { JSONSchemaOperationConfig, JSONSchemaPubSubOperationConfig, HTTPMethod } from './types';

export function isPubSubOperationConfig(
  operationConfig: JSONSchemaOperationConfig
): operationConfig is JSONSchemaPubSubOperationConfig {
  return 'pubSubTopic' in operationConfig;
}

export function getOperationMetadata(operationConfig: JSONSchemaOperationConfig) {
  let httpMethod: HTTPMethod;
  let operationType: OperationTypeNode;
  let rootTypeName: 'Query' | 'Mutation' | 'Subscription';
  if (isPubSubOperationConfig(operationConfig)) {
    httpMethod = null;
    operationType = 'subscription';
    rootTypeName = 'Subscription';
  } else {
    httpMethod = operationConfig.method;
    // Fix compability with Mesh handler
    operationType = operationConfig.type.toLowerCase() as OperationTypeNode;
    if (!httpMethod) {
      if (operationType === 'mutation') {
        httpMethod = 'POST';
      } else {
        httpMethod = 'GET';
      }
    }
    if (!rootTypeName) {
      if (httpMethod === 'GET') {
        rootTypeName = 'Query';
      }
    }
    rootTypeName = operationType === 'query' ? 'Query' : 'Mutation';
  }
  return {
    httpMethod,
    operationType,
    rootTypeName,
    fieldName: operationConfig.field,
  };
}
