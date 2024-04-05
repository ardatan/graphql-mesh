import { MeshFetch } from '@graphql-mesh/types';
import { defaultImportFn, DefaultLogger, readFileOrUrl } from '@graphql-mesh/utils';
import { SOAPLoader } from './SOAPLoader.js';

export * from './SOAPLoader.js';
export * from './types.js';
export * from '@graphql-mesh/transport-soap';

export interface SOAPSubgraphLoaderOptions {
  source?: string;
  fetch?: MeshFetch;
  schemaHeaders?: Record<string, string>;
  operationHeaders?: Record<string, string>;
}

export function loadSOAPSubgraph(subgraphName: string, options: SOAPSubgraphLoaderOptions) {
  return ({ cwd, fetch }: { cwd: string; fetch: MeshFetch }) => {
    const soapLoader = new SOAPLoader({
      subgraphName,
      fetch: options.fetch || fetch,
      schemaHeaders: options.schemaHeaders,
      operationHeaders: options.operationHeaders,
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
