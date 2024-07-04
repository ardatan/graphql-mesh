import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import { getDocumentString } from '@envelop/core';
import type { TransportExecutorFactoryFn } from '@graphql-mesh/transport-common';
import type { HTTPExecutorOptions } from '@graphql-tools/executor-http';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';

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
    let headers: Record<string, string> | undefined;
    if (typeof transportEntry.headers === 'string') {
      headers = JSON.parse(transportEntry.headers);
    }
    if (Array.isArray(transportEntry.headers)) {
      headers = Object.fromEntries(transportEntry.headers);
    }
    return buildHTTPExecutor({
      endpoint: transportEntry.location,
      headers,
      fetch,
      print: printFnForHTTPExecutor,
      ...transportEntry.options,
    });
  };
