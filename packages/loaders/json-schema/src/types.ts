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
 * (Mesh-correct `$` when a selection cannot be fully expanded). Use
 * `leavesOnly` for scalar/enum leaves only. Where OpenAPI links / entity keys
 * exist, the loader prefers entity stubs (`supplier: { id: supplierId }`)
 * before falling back to either policy.
 *
 * @example 'leavesOnly'
 */
export type ConnectSelectionOverLimit = 'leavesOnly' | 'passthrough';

/**
 * Limit/rule for `@connect(selection:)` size and depth.
 *
 * @example
 * ```ts
 * connectSelection: { maxLength: 4000, softDepth: 6, overLimit: 'leavesOnly' }
 * ```
 */
export interface ConnectSelectionOptions {
  /**
   * Max characters for one `@connect(selection:)` string.
   * When the expanded selection would exceed this limit, `overLimit` decides
   * whether to fall back to `$` or emit leaves only. Use `0` for no limit.
   *
   * @default 12000
   */
  maxLength?: number;
  /**
   * Nesting depth after which - only when `overLimit: 'leavesOnly'` - object
   * fields emit scalar/enum leaves only (deeper nests are not expanded).
   * Ignored when `overLimit` is `passthrough`. Use `-1` to disable the soft
   * depth switch.
   *
   * @default 2
   */
  softDepth?: number;
  /**
   * When a selection exceeds `maxLength` (or cannot be safely expanded):
   * - `passthrough`: empty selection -> `$` at attach (Mesh-correct;
   *   a warning is logged when object types would need a fuller projection)
   * - `leavesOnly`: scalar/enum leaves (may omit nested objects)
   *
   * @default 'passthrough'
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
 *       path: '/users/{args.id}',
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
   * Default headers for runtime HTTP calls (record or factory). Merged with
   * per-operation headers and baked into `@source` / `@connect`. Not used for
   * compose-time schema / sample fetches - see `schemaHeaders`.
   *
   * @example { Authorization: 'Bearer {context.token}' }
   */
  operationHeaders?: OperationHeadersConfiguration;
  /**
   * HTTP timeout in milliseconds for runtime calls (forwarded onto
   * `@transport(options.timeout)` when set).
   *
   * @example 30_000
   */
  timeout?: number;
  /**
   * Headers for fetching remote JSON Schema / samples during compose only
   * (not sent on runtime operation calls).
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
   * Controls whether non-2xx response schemas from the operation / OpenAPI /
   * RAML document are modeled on the GraphQL field return type.
   *
   * - `true`: skip non-2xx schemas so they are not part of the GraphQL result
   *   shape. Runtime `@connect` then treats non-2xx as a failed throw-gate
   *   (GraphQL `errors[]`), unless the field overrides `isSuccess`.
   * - `false` / omitted: keep non-2xx schemas in the field return (often a
   *   status union) and emit `isSuccess: true` for mapped codes so those
   *   bodies stay in GraphQL `data` for the client to select.
   *
   * This option only affects generated emit. Handwritten SDL sets
   * `@connect` / `@source` `isSuccess` and `errors` directly; selecting a
   * payload `error` field never flips throw vs data by itself.
   *
   * @default false
   * @example true
   */
  ignoreErrorResponses?: boolean;
  /**
   * Static / interpolated query params merged into every runtime request
   * (forwarded onto `@transport(options.queryParams)` when set).
   *
   * @example { api_key: '{env.API_KEY}' }
   */
  queryParams?: Record<string, string | number | boolean>;
  /**
   * Global `qs` stringify options for query strings and form bodies
   * (`arrayFormat`, `allowDots`, `jsonStringify`, ...). Per-operation /
   * per-param options can still override these.
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
   * When true, remote `$ref`s are bundled into the composed schema artifacts so
   * later loads do not need to re-fetch those documents.
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
   * @example { maxLength: 4000, overLimit: 'leavesOnly' }
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
