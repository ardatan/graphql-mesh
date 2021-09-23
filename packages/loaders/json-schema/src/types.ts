import { OperationTypeNode } from 'graphql';
import { JSONSchema } from 'json-machete';

export interface JSONSchemaBaseOperationConfig {
  type: OperationTypeNode;
  field: string;
  description?: string;

  requestSchema?: string | JSONSchema;
  requestSample?: any;
  requestTypeName?: string;

  responseSchema?: string | JSONSchema;
  responseSample?: any;
  responseTypeName?: string;

  argTypeMap?: Record<string, string>;
}

export type HTTPMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';

export interface JSONSchemaHTTPOperationConfig extends JSONSchemaBaseOperationConfig {
  path: string;
  method?: HTTPMethod;

  headers?: Record<string, string>;
}

export interface JSONSchemaPubSubOperationConfig extends JSONSchemaBaseOperationConfig {
  pubsubTopic: string;
}

export type JSONSchemaOperationConfig = JSONSchemaHTTPOperationConfig | JSONSchemaPubSubOperationConfig;
