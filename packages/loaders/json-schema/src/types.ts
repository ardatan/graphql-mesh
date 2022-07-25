import { MeshPubSub, Logger } from '@graphql-mesh/types';
import { BaseLoaderOptions } from '@graphql-tools/utils';
import { GraphQLInputType, OperationTypeNode } from 'graphql';
import { JSONSchema, JSONSchemaObject } from 'json-machete';

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
  ignoreErrorResponses?: boolean;
  queryParams?: Record<string, string>;
  noDeduplication?: boolean;
  indices?: boolean;
}

export interface JSONSchemaOperationResponseConfig {
  responseSchema?: string | JSONSchemaObject;
  responseSample?: any;
  responseTypeName?: string;

  exposeResponseMetadata?: boolean;

  links?: Record<string, JSONSchemaLinkConfig>;
}

export interface JSONSchemaLinkConfig {
  fieldName: string;
  args?: Record<string, string>;
  description?: string;
}

export type JSONSchemaBaseOperationConfig = {
  type: OperationTypeNode;
  field: string;
  description?: string;

  argTypeMap?: Record<string, string | GraphQLInputType>;
} & (
  | {
      responseByStatusCode?: Record<string, JSONSchemaOperationResponseConfig>;
    }
  | JSONSchemaOperationResponseConfig
);

export type JSONSchemaBaseOperationConfigWithJSONRequest = JSONSchemaBaseOperationConfig & {
  requestSchema?: string | JSONSchema;
  requestSample?: any;
  requestTypeName?: string;
  requestBaseBody?: any;
};

export type HTTPMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';

export type JSONSchemaHTTPBaseOperationConfig = JSONSchemaBaseOperationConfig & {
  path: string;
  method?: HTTPMethod;

  headers?: Record<string, string>;
};

export type JSONSchemaHTTPJSONOperationConfig = JSONSchemaHTTPBaseOperationConfig &
  JSONSchemaBaseOperationConfigWithJSONRequest;

export type JSONSchemaPubSubOperationConfig = JSONSchemaBaseOperationConfigWithJSONRequest & {
  pubsubTopic: string;
};

export type JSONSchemaHTTPBinaryConfig = JSONSchemaHTTPBaseOperationConfig & {
  path: string;
  method?: HTTPMethod;
  requestTypeName?: string;
  binary: true;
};

export type JSONSchemaOperationConfig =
  | JSONSchemaHTTPJSONOperationConfig
  | JSONSchemaHTTPBinaryConfig
  | JSONSchemaPubSubOperationConfig;
