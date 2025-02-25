import type { Logger, MeshFetch } from '@graphql-mesh/types';
import { defaultImportFn, mapMaybePromise, readFileOrUrl } from '@graphql-mesh/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { SOAPLoader, type SOAPHeaders } from './SOAPLoader.js';

export * from './SOAPLoader.js';
export type * from './types.js';
export * from '@graphql-mesh/transport-soap';

export interface SOAPSubgraphLoaderOptions {
  /**
   * A url to your WSDL or generated SDL with annotations
   */
  source?: string;
  /**
   * SOAP endpoint to use for the API calls
   */
  endpoint?: string;
  /**
   * JSON object representing the Headers to add to the runtime of the API calls only for schema introspection
   * You can also provide `.js` or `.ts` file path that exports schemaHeaders as an object
   */
  schemaHeaders?: Record<string, string>;
  /**
   * JSON object representing the Headers to add to the runtime of the API calls only for operation calls
   */
  operationHeaders?: Record<string, string>;
  /**
   * SOAP Headers configuration
   */
  soapHeaders?: SOAPHeaders;
  /**
   * The name of the alias to be used in the envelope for body components

   * @default body
   */
  bodyAlias?: string;
  /**
   * The namespace of the SOAP envelope
   * By default, SOAP handler detects the SOAP version and if SOAP version is 1.1,
   * it uses `http://schemas.xmlsoap.org/soap/envelope/` namespace
   * If SOAP version is 1.2, it uses `http://www.w3.org/2003/05/soap-envelope` namespace
   */
  soapNamespace?: string;
}

export function loadSOAPSubgraph(subgraphName: string, options: SOAPSubgraphLoaderOptions) {
  return ({ cwd, fetch, logger }: { cwd: string; fetch: MeshFetch; logger: Logger }) => {
    const soapLoader = new SOAPLoader({
      subgraphName,
      fetch,
      logger,
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
            logger,
          }),
        wsdl =>
          handleMaybePromise(
            () => soapLoader.loadWSDL(wsdl),
            object => {
              soapLoader.loadedLocations.set(options.source, object);
              return soapLoader.buildSchema();
            },
          ),
      ),
    };
  };
}
