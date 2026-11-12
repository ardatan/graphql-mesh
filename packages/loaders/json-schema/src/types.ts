import type { GraphQLScalarType, OperationTypeNode } from 'graphql';
import type { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue.js';
import type { JSONSchema, JSONSchemaObject } from 'json-machete';
import type { IStringifyOptions } from 'qs';
import { type Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import type { ResolverData } from '@graphql-mesh/string-interpolation';
import type { MeshFetch } from '@graphql-mesh/types';
import type { BaseLoaderOptions } from '@graphql-tools/utils';

/**
 * Programmatic limit/rule for `@connect(selection:)` size and depth.
 * Default `overLimit` is `passthrough` (Hive-correct `$` when a selection cannot
 * be fully expanded). Use `leavesOnly` for Apollo Router–friendly scalar leaves.
 * Where OpenAPI links / entity keys exist, the loader prefers entity stubs
 * (`supplier: { id: supplierId }`) before falling back to either policy.
 */
export type ConnectSelectionOverLimit = 'leavesOnly' | 'passthrough';

export interface ConnectSelectionOptions {
  /**
   * Max characters for one `@connect(selection:)` string.
   * Default: `12000`. Use `0` for no limit.
   */
  maxLength?: number;
  /**
   * Nesting depth after which — only when `overLimit: 'leavesOnly'` — object
   * fields emit scalar/enum leaves only. Ignored for `passthrough` (default).
   * Default: `2`. Use `-1` to disable.
   */
  softDepth?: number;
  /**
   * When a selection exceeds `maxLength` (or cannot be safely expanded):
   * - `passthrough` (default): empty selection → `$` at attach (Hive-correct;
   *   not Router-safe for object types — a warning is logged)
   * - `leavesOnly`: scalar/enum leaves (Router-friendlier; may omit nested objects)
   */
  overLimit?: ConnectSelectionOverLimit;
}

export interface JSONSchemaLoaderOptions extends BaseLoaderOptions {
  endpoint?: string;
  operationHeaders?: OperationHeadersConfiguration;
  timeout?: number;
  schemaHeaders?: Record<string, string>;
  operations: JSONSchemaOperationConfig[];
  errorMessage?: string;
  log?: Logger;
  pubsub?: PubSub;
  fetch?: MeshFetch;
  ignoreErrorResponses?: boolean;
  queryParams?: Record<string, string | number | boolean>;
  queryStringOptions?: IStringifyOptions & { jsonStringify?: boolean };
  handlerName?: string;
  bundle?: boolean;
  getScalarForFormat?: (format: string) => GraphQLScalarType | void;
  /** Limit/rule for Federation Connectors `@connect(selection:)` size and depth. */
  connectSelection?: ConnectSelectionOptions;
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
  type: OperationTypeNode | 'Query' | 'Mutation' | 'Subscription';
  field: string;
  description?: string;

  argTypeMap?: Record<string, string | JSONSchemaObject>;
  requiredArgs?: string[];
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
  'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';

export type JSONSchemaHTTPBaseOperationConfig = JSONSchemaBaseOperationConfig & {
  path: string;
  method?: HTTPMethod;

  headers?: Record<string, string>;
  queryParamArgMap?: Record<string, string>;
  queryStringOptions?: IStringifyOptions & { jsonStringify?: boolean };
  queryStringOptionsByParam?: Record<
    string,
    IStringifyOptions & {
      destructObject?: boolean;
      deepObject?: boolean;
      jsonStringify?: boolean;
    }
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
  JSONSchemaHTTPJSONOperationConfig | JSONSchemaHTTPBinaryConfig | JSONSchemaPubSubOperationConfig;

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
