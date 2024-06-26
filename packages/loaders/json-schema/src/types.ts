import { GraphQLScalarType, OperationTypeNode } from 'graphql';
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue.js';
import { JSONSchema, JSONSchemaObject } from 'json-machete';
import { IStringifyOptions } from 'qs';
import { ResolverData } from '@graphql-mesh/string-interpolation';
import { Logger, MeshFetch, MeshPubSub } from '@graphql-mesh/types';
import { BaseLoaderOptions } from '@graphql-tools/utils';

export interface JSONSchemaLoaderOptions extends BaseLoaderOptions {
  endpoint?: string;
  operationHeaders?: OperationHeadersConfiguration;
  timeout?: number;
  schemaHeaders?: Record<string, string>;
  operations: JSONSchemaOperationConfig[];
  errorMessage?: string;
  logger?: Logger;
  pubsub?: MeshPubSub;
  fetch?: MeshFetch;
  ignoreErrorResponses?: boolean;
  queryParams?: Record<string, string | number | boolean>;
  queryStringOptions?: IStringifyOptions & { jsonStringify?: boolean };
  handlerName?: string;
  bundle?: boolean;
  getScalarForFormat?: (format: string) => GraphQLScalarType | void;
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

  deprecated?: boolean;
} & JSONSchemaOperationResponseConfig;

export type JSONSchemaBaseOperationConfigWithJSONRequest = JSONSchemaBaseOperationConfig & {
  requestSchema?: string | JSONSchema;
  requestSample?: any;
  requestTypeName?: string;
  requestBaseBody?: any;
};

export type HTTPMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'PATCH';

export type JSONSchemaHTTPBaseOperationConfig = JSONSchemaBaseOperationConfig & {
  path: string;
  method?: HTTPMethod;

  headers?: Record<string, string>;
  queryParamArgMap?: Record<string, string>;
  queryStringOptionsByParam?: Record<
    string,
    IStringifyOptions & { destructObject?: boolean; jsonStringify?: boolean }
  >;
  queryParamsSample?: any;

  jsonApiFields?: boolean;
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

export type OperationHeadersConfiguration = Record<string, string> | OperationHeadersFactory;

export type OperationHeadersFactory = (
  data: ResolverData,
  operationConfig: {
    endpoint: string;
    field: string;
    path: string;
    method: HTTPMethod;
  },
) => PromiseOrValue<Record<string, string>>;
