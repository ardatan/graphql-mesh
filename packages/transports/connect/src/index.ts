import { createDefaultExecutor, type Transport } from '@graphql-mesh/transport-common';
import { processDirectives, type ProcessDirectiveArgs } from './directives/process.js';

/**
 * Options stored on `@transport(kind: "connect", options:)` (OpenAPI / JSON Schema /
 * RAML / OData / SOAP `@connect` subgraphs).
 *
 * @example
 * ```ts
 * // timeout + queryStringOptions reach `@connect` resolvers via processDirectives.
 * // Prefer baking query params into `@source` / field mappings; see `queryParams`.
 * {
 *   timeout: 30_000,
 *   queryStringOptions: { arrayFormat: 'repeat' },
 * }
 * ```
 */
export interface ConnectTransportOptions {
  /**
   * HTTP request timeout in milliseconds. Applied as `AbortSignal.timeout` on
   * `@connect` fetches when set; omitted means no transport-level timeout.
   *
   * @example 30_000
   */
  timeout?: number;
  /**
   * Present on `@transport(options:)`, but not forwarded into `@connect`
   * resolvers by processDirectives today. Put static / interpolated query
   * params on `@source` or per-field `@connect` mappings instead.
   */
  queryParams?: Record<string, string>;
  /**
   * `qs` stringify options for form-urlencoded bodies and query strings
   * (`arrayFormat`, `allowDots`, ...). Field-level options can still override.
   *
   * @example { arrayFormat: 'brackets', allowDots: true }
   */
  queryStringOptions?: any;
}

const transport: Transport<ConnectTransportOptions> = {
  getSubgraphExecutor({ transportEntry, subgraph, fetch, pubsub, log }) {
    const processDirectiveOpts: ProcessDirectiveArgs = {
      globalFetch: fetch,
      pubsub,
      log,
      ...transportEntry.options,
    };
    const processedSchema = processDirectives(subgraph, processDirectiveOpts);
    const executor = createDefaultExecutor(processedSchema);
    return executor;
  },
};

export default transport;
export { processDirectives } from './directives/process.js';
export type { ProcessDirectiveArgs } from './directives/process.js';
export { processScalarType } from './directives/scalars.js';
export {
  CONNECT_LINK_URL,
  ConnectDirective,
  ConnectorErrorsInput,
  ConnectHTTPInput,
  FEDERATION_LINK_URL,
  HTTPHeaderMappingInput,
  JSONSelectionScalar,
  LinkDirective,
  SourceDirective,
  SourceHTTPInput,
  URLPathTemplateScalar,
} from './directives/federationConnectDirectives.js';
