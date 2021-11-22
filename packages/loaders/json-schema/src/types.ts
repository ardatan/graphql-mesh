import { MeshPubSub, Logger } from '@graphql-mesh/types';
import { BaseLoaderOptions } from '@graphql-tools/utils';
import { OperationTypeNode } from 'graphql';
import { JSONSchema } from 'json-machete';

export interface JSONSchemaLoaderOptions extends BaseLoaderOptions {
  baseUrl?: string;
  operationHeaders?: Record<string, string>;
  schemaHeaders?: Record<string, string>;
  operations: JSONSchemaOperationConfig[];
  errorMessage?: string;
  logger?: Logger;
  pubsub?: MeshPubSub;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
  generateInterfaceFromSharedFields?: boolean;
}

export interface JSONSchemaBaseOperationConfig {
  type: OperationTypeNode;
  field: string;
  description?: string;

  responseSchema?: string | JSONSchema;
  responseSample?: any;
  responseTypeName?: string;

  argTypeMap?: Record<string, string>;
}

export interface JSONSchemaBaseOperationConfigWithJSONRequest extends JSONSchemaBaseOperationConfig {
  requestSchema?: string | JSONSchema;
  requestSample?: any;
  requestTypeName?: string;
}

export type HTTPMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';

export interface JSONSchemaHTTPBaseOperationConfig extends JSONSchemaBaseOperationConfig {
  path: string;
  method?: HTTPMethod;

  headers?: Record<string, string>;
}

export interface JSONSchemaHTTPJSONOperationConfig
  extends JSONSchemaHTTPBaseOperationConfig,
    JSONSchemaBaseOperationConfigWithJSONRequest {}

export interface JSONSchemaPubSubOperationConfig extends JSONSchemaBaseOperationConfigWithJSONRequest {
  pubsubTopic: string;
}

export interface JSONSchemaHTTPBinaryConfig extends JSONSchemaHTTPBaseOperationConfig {
  path: string;
  method?: HTTPMethod;
  requestTypeName?: string;
  binary: true;
}

export type JSONSchemaOperationConfig =
  | JSONSchemaHTTPJSONOperationConfig
  | JSONSchemaHTTPBinaryConfig
  | JSONSchemaPubSubOperationConfig;
