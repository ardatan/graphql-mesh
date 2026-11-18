import { type Logger } from '@graphql-hive/logger';
import type { MeshFetch } from '@graphql-mesh/types';
import { defaultImportFn, readFileOrUrl } from '@graphql-mesh/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { SOAPLoader, type SOAPHeaders } from './SOAPLoader.js';

export * from './SOAPLoader.js';
export type * from './types.js';
export * from './connectEmit.js';
// SOAP WSDL subgraphs emit `@connect` / `@source` - Hive executes via transport-connect.
export { processDirectives } from '@graphql-mesh/transport-connect';
export { default as getSubgraphExecutor } from '@graphql-mesh/transport-connect';

/**
 * Options for {@link loadSOAPSubgraph}.
 * Loads a WSDL and emits `@connect` / `@source` mappings (executed by transport-connect).
 *
 * @example
 * ```ts
 * import { loadSOAPSubgraph } from '@omnigraph/soap';
 *
 * loadSOAPSubgraph('weather', {
 *   source: './weather.wsdl',
 *   endpoint: 'https://example.com/soap',
 *   operationHeaders: { Authorization: 'Bearer {context.token}' },
 * })
 * ```
 * @example
 * ```ts
 * loadSOAPSubgraph('billing', {
 *   source: 'https://example.com/billing?wsdl',
 *   bodyAlias: 'body',
 *   soapHeaders: {
 *     namespace: 'http://example.com/security',
 *     alias: 'sec',
 *     headers: { Token: '{context.headers.x-token}' },
 *   },
 * })
 * ```
 */
export interface SOAPSubgraphLoaderOptions {
  /**
   * URL or path to the WSDL (or pre-generated SDL with annotations).
   *
   * @example './services/weather.wsdl'
   * @example 'https://example.com/service?wsdl'
   */
  source?: string;
  /**
   * SOAP HTTP endpoint override (when WSDL port address should not be used as-is).
   *
   * @example 'https://example.com/soap'
   */
  endpoint?: string;
  /**
   * Headers for WSDL / XSD fetch only (object, or `.js` / `.ts` path exporting the object).
   *
   * @example { Authorization: 'Bearer ...' }
   */
  schemaHeaders?: Record<string, string>;
  /**
   * Headers for runtime SOAP calls (`@source` / `@connect`).
   *
   * @example { Authorization: 'Bearer {context.headers.authorization}' }
   */
  operationHeaders?: Record<string, string>;
  /**
   * Extra SOAP header block(s) injected into the envelope.
   *
   * @example { namespace: 'http://example.com/ns', headers: { Token: 'abc' } }
   */
  soapHeaders?: SOAPHeaders;
  /**
   * Alias for the SOAP body wrapper element (default `body`).
   *
   * @example 'body'
   */
  bodyAlias?: string;
  /**
   * SOAP envelope namespace. When omitted, inferred from SOAP 1.1 vs 1.2.
   *
   * @example 'http://schemas.xmlsoap.org/soap/envelope/'
   * @example 'http://www.w3.org/2003/05/soap-envelope'
   */
  soapNamespace?: string;
}

/**
 * Mesh compose helper: load a WSDL and emit a SOAP `@connect` subgraph.
 *
 * @example
 * ```ts
 * import { loadSOAPSubgraph } from '@omnigraph/soap';
 *
 * const weather = loadSOAPSubgraph('weather', {
 *   source: './weather.wsdl',
 *   endpoint: 'https://example.com/soap',
 * });
 * ```
 *
 * @param subgraphName Subgraph name (also `@source(name:)`).
 * @param options See {@link SOAPSubgraphLoaderOptions}.
 */
export function loadSOAPSubgraph(subgraphName: string, options: SOAPSubgraphLoaderOptions) {
  return ({ cwd, fetch, log }: { cwd: string; fetch: MeshFetch; log: Logger }) => {
    const soapLoader = new SOAPLoader({
      subgraphName,
      fetch,
      log,
      cwd,
      // Configuration from the user
      schemaHeaders: options.schemaHeaders,
      operationHeaders: options.operationHeaders,
      endpoint: options.endpoint,
      bodyAlias: options.bodyAlias,
      soapHeaders: options.soapHeaders,
    });
    return {
      name: subgraphName,
      schema$: handleMaybePromise(
        () =>
          readFileOrUrl<string>(options.source, {
            allowUnknownExtensions: true,
            cwd,
            fetch,
            importFn: defaultImportFn,
            log,
          }),
        // Pass source as the base URL so nested <wsdl:import> / <xsd:import>
        // locations resolve relative to the importing document.
        wsdl =>
          handleMaybePromise(
            () => soapLoader.loadWSDL(wsdl, options.source),
            () => soapLoader.buildSchema(),
          ),
      ),
    };
  };
}
