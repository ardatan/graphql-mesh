import { ResolverData } from '@graphql-mesh/string-interpolation';
import { MeshPubSub, Logger } from '@graphql-mesh/types';
import { BaseLoaderOptions } from '@graphql-tools/utils';
import { OperationTypeNode } from 'graphql';
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';
import { JSONSchema, JSONSchemaObject } from 'json-machete';
import { IStringifyOptions } from 'qs';

export interface JSONSchemaLoaderOptions extends BaseLoaderOptions {
  baseUrl?: string;
  operationHeaders?: OperationHeadersConfiguration;
  schemaHeaders?: Record<string, string>;
  operations: JSONSchemaOperationConfig[];
  errorMessage?: string;
  logger?: Logger;
  pubsub?: MeshPubSub;
  fetch?: WindowOrWorkerGlobalScope['fetch'];
  ignoreErrorResponses?: boolean;
  queryParams?: Record<string, string | number | boolean>;
  queryStringOptions?: IStringifyOptions;
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

  argTypeMap?: Record<string, string | JSONSchemaObject>;
  responseByStatusCode?: Record<string, JSONSchemaOperationResponseConfig>;
} & JSONSchemaOperationResponseConfig;

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
  queryParamArgMap?: Record<string, string>;
  queryStringOptionsByParam?: Record<string, IStringifyOptions & { destructObject?: boolean }>;
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

export type OperationHeadersConfiguration =
  | Record<string, string>
  | ((data: ResolverData, operationConfig: JSONSchemaOperationConfig) => PromiseOrValue<Record<string, string>>);
