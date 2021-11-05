import { OperationTypeNode } from 'graphql';
import { JSONSchemaOperationConfig, JSONSchemaPubSubOperationConfig, HTTPMethod } from './types';
import { FileUpload } from 'graphql-upload';

export function isPubSubOperationConfig(
  operationConfig: JSONSchemaOperationConfig
): operationConfig is JSONSchemaPubSubOperationConfig {
  return 'pubsubTopic' in operationConfig;
}

export function getOperationMetadata(operationConfig: JSONSchemaOperationConfig) {
  let httpMethod: HTTPMethod;
  let operationType: OperationTypeNode;
  let rootTypeName: 'Query' | 'Mutation' | 'Subscription';
  if (isPubSubOperationConfig(operationConfig)) {
    httpMethod = null;
    operationType = 'subscription' as OperationTypeNode;
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

export function cleanObject(obj: any) {
  if (typeof obj === 'object' && obj != null) {
    const newObj = {};
    for (const key in obj) {
      const newObjForKey = cleanObject(obj[key]);
      if (newObjForKey != null) {
        newObj[key] = newObjForKey;
      }
    }
    return newObj;
  }
  return obj;
}

export function isFileUpload(obj: any): obj is FileUpload {
  return 'createReadStream' in obj;
}
