import { DocumentNode, print } from 'graphql';
import { getDocumentString } from '@envelop/core';
import { TransportExecutorFactoryFn } from '@graphql-mesh/transport-common';
import { buildHTTPExecutor, HTTPExecutorOptions } from '@graphql-tools/executor-http';

export type HTTPTransportOptions = Pick<
  HTTPExecutorOptions,
  'useGETForQueries' | 'method' | 'timeout' | 'credentials' | 'retry'
>;

// Use Envelop's print/parse cache to avoid parsing the same document multiple times
// TODO: Maybe a shared print/parse cache in the future?
function printFnForHTTPExecutor(document: DocumentNode) {
  return getDocumentString(document, print);
}

export const getSubgraphExecutor: TransportExecutorFactoryFn<'http', HTTPTransportOptions> =
  function getHTTPSubgraphExecutor({ transportEntry, fetch }) {
    return buildHTTPExecutor({
      endpoint: transportEntry.location,
      headers: transportEntry.headers,
      fetch,
      print: printFnForHTTPExecutor,
      ...transportEntry.options,
    });
  };
