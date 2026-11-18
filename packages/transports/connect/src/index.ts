import { createDefaultExecutor, type Transport } from '@graphql-mesh/transport-common';
import { processDirectives, type ProcessDirectiveArgs } from './directives/process.js';

/**
 * Options stored on `@transport(kind: "connect", options:)` (OpenAPI / JSON Schema /
 * RAML / OData / SOAP `@connect` subgraphs).
 *
 * @example
 * ```ts
 * // Forwarded from loadOpenAPISubgraph / loadJSONSchemaSubgraph onto `@transport(options:)`
 * {
 *   timeout: 30_000,
 *   queryParams: { api_key: '{env.API_KEY}' },
 *   queryStringOptions: { arrayFormat: 'repeat' },
 * }
 * ```
 */
export interface ConnectTransportOptions {
  /**
   * HTTP request timeout in milliseconds.
   *
   * @example 30_000
   */
  timeout?: number;
  /**
   * Static / interpolated query params merged into every request.
   *
   * @example { api_key: '{env.API_KEY}' }
   */
  queryParams?: Record<string, string>;
  /**
   * `qs` stringify options for form / query encoding (`arrayFormat`, `allowDots`, ...).
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
