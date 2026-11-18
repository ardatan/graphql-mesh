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
 * Programmatic limit/rule for `@connect(selection:)` size and depth when a
 * selection cannot be fully expanded. Default `overLimit` is `passthrough`
 * (Mesh-correct `$`). Use `leavesOnly` for scalar/enum leaves only.
 * Where OpenAPI links / entity keys exist, the loader prefers entity stubs
 * (`supplier: { id: supplierId }`) before falling back to either policy.
 *
 * @example 'passthrough'
 * @example 'leavesOnly'
 */
export type ConnectSelectionOverLimit = 'leavesOnly' | 'passthrough';

/**
 * Limit/rule for `@connect(selection:)` size and depth.
 *
 * @example
 * ```ts
 * connectSelection: { maxLength: 8000, softDepth: 2, overLimit: 'leavesOnly' }
 * ```
 */
export interface ConnectSelectionOptions {
  /**
   * Max characters for one `@connect(selection:)` string.
   * Default: `12000`. Use `0` for no limit.
   *
   * @example 8000
   */
  maxLength?: number;
  /**
   * Nesting depth after which - only when `overLimit: 'leavesOnly'` - object
   * fields emit scalar/enum leaves only. Ignored for `passthrough` (default).
   * Default: `2`. Use `-1` to disable.
   *
   * @example 3
   */
  softDepth?: number;
  /**
   * When a selection exceeds `maxLength` (or cannot be safely expanded):
   * - `passthrough` (default): empty selection -> `$` at attach (Mesh-correct;
   *   a warning is logged when object types would need a fuller projection)
   * - `leavesOnly`: scalar/enum leaves (may omit nested objects)
   *
   * @example 'leavesOnly'
   */
  overLimit?: ConnectSelectionOverLimit;
}

/**
 * Options for {@link loadJSONSchemaSubgraph} / JSON Schema operation emit.
 * OpenAPI and RAML loaders extend this shape.
 *
 * @example
 * ```ts
 * import { loadJSONSchemaSubgraph } from '@omnigraph/json-schema';
 *
 * loadJSONSchemaSubgraph('api', {
 *   endpoint: 'https://api.example.com',
 *   operations: [
 *     {
 *       type: 'Query',
 *       field: 'user',
 *       path: '/users/{id}',
 *       method: 'GET',
 *       responseSchema: './schemas/user.json',
 *     },
 *   ],
 *   operationHeaders: { Authorization: 'Bearer {context.token}' },
 * })
 * ```
 */
export interface JSONSchemaLoaderOptions extends BaseLoaderOptions {
  /**
   * HTTP base URL for operations (becomes `@source(http.baseURL)` / `@transport(location)`).
   *
   * @example 'https://api.example.com'
   */
  endpoint?: string;
  /**
   * Default headers for runtime calls (record or factory).
   *
   * @example { Authorization: 'Bearer {context.token}' }
   */
  operationHeaders?: OperationHeadersConfiguration;
  /**
   * HTTP timeout in milliseconds.
   *
   * @example 30_000
   */
  timeout?: number;
  /**
   * Headers for fetching remote schemas / samples during compose.
   *
   * @example { Authorization: 'Bearer ...' }
   */
  schemaHeaders?: Record<string, string>;
  /**
   * Operation definitions (HTTP JSON, binary, or pubsub).
   *
   * @example [{ type: 'Query', field: 'me', path: '/me', method: 'GET', responseSample: { id: '1' } }]
   */
  operations: JSONSchemaOperationConfig[];
  /**
   * Custom error message template for failed responses.
   *
   * @example 'Upstream {status}: {message}'
   */
  errorMessage?: string;
  /** Logger instance. */
  log?: Logger;
  /** PubSub for Subscription operations. */
  pubsub?: PubSub;
  /** Fetch implementation. */
  fetch?: MeshFetch;
  /**
   * When true, non-2xx response schemas are still modeled (not collapsed to errors-only).
   *
   * @example true
   */
  ignoreErrorResponses?: boolean;
  /**
   * Static query params merged into every request.
   *
   * @example { api_key: '{env.API_KEY}' }
   */
  queryParams?: Record<string, string | number | boolean>;
  /**
   * Global `qs` stringify options (`arrayFormat`, `allowDots`, `jsonStringify`, ...).
   *
   * @example { arrayFormat: 'brackets', allowDots: true }
   */
  queryStringOptions?: IStringifyOptions & { jsonStringify?: boolean };
  /**
   * Internal handler label for diagnostics.
   *
   * @example 'openapi'
   */
  handlerName?: string;
  /**
   * Bundle remote `$ref`s into the composed schema artifacts.
   *
   * @example true
   */
  bundle?: boolean;
  /**
   * Map JSON Schema `format` strings to GraphQL scalars.
   *
   * @example format => format === 'uuid' ? GraphQLUUID : undefined
   */
  getScalarForFormat?: (format: string) => GraphQLScalarType | void;
  /**
   * Limit/rule for `@connect(selection:)` size and depth.
   *
   * @example { maxLength: 12000, overLimit: 'passthrough' }
   */
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
