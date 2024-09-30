import type { Logger, MeshFetch } from '@graphql-mesh/types';
import { defaultImportFn, DefaultLogger, readFileOrUrl } from '@graphql-mesh/utils';
import { SOAPLoader } from './SOAPLoader.js';

export * from './SOAPLoader.js';
export type * from './types.js';
export * from '@graphql-mesh/transport-soap';

export interface SOAPSubgraphLoaderOptions {
  source?: string;
  endpoint?: string;
  fetch?: MeshFetch;
  logger?: Logger;
  schemaHeaders?: Record<string, string>;
  operationHeaders?: Record<string, string>;
}

export function loadSOAPSubgraph(subgraphName: string, options: SOAPSubgraphLoaderOptions) {
  return ({ cwd, fetch, logger }: { cwd: string; fetch: MeshFetch; logger: Logger }) => {
    const soapLoader = new SOAPLoader({
      subgraphName,
      fetch: options.fetch || fetch,
      logger: options.logger || logger,
      schemaHeaders: options.schemaHeaders,
      operationHeaders: options.operationHeaders,
      endpoint: options.endpoint,
      cwd,
    });
    return {
      name: subgraphName,
      schema$: readFileOrUrl<string>(options.source, {
        allowUnknownExtensions: true,
        cwd,
        fetch: options.fetch || fetch,
        importFn: defaultImportFn,
        logger: new DefaultLogger(`SOAP Subgraph ${subgraphName}`),
      })
        .then(wsdl => soapLoader.loadWSDL(wsdl))
        .then(object => {
          soapLoader.loadedLocations.set(options.source, object);
          return soapLoader.buildSchema();
        }),
    };
  };
}
