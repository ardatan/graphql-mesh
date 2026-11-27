import { print, stripIgnoredCharacters, type DocumentNode } from 'graphql';
import { getDocumentString } from '@envelop/core';
import type { ExecutionRequest } from '@graphql-tools/utils';

function stripAndPrint(document: DocumentNode): string {
  return stripIgnoredCharacters(print(document));
}

export const defaultPrintFn = function defaultPrintFn(document: DocumentNode): string {
  return getDocumentString(document, stripAndPrint);
};

interface ExecutionRequestToGraphQLParams {
  executionRequest: ExecutionRequest;
  excludeQuery?: boolean;
  printFn?: typeof defaultPrintFn;
}

export interface SerializedExecutionRequest {
  query?: string | undefined;
  variables?: Record<string, any>;
  operationName?: string;
  extensions?: Record<string, any>;
}

export function serializeExecutionRequest(
  opts: Omit<ExecutionRequestToGraphQLParams, 'excludeQuery'> & {
    excludeQuery: true;
  },
): Omit<SerializedExecutionRequest, 'query'>;
export function serializeExecutionRequest(
  opts: Omit<ExecutionRequestToGraphQLParams, 'excludeQuery'> & {
    excludeQuery?: false;
  },
): Omit<SerializedExecutionRequest, 'query'> & { query: string };
export function serializeExecutionRequest(
  opts: ExecutionRequestToGraphQLParams,
): SerializedExecutionRequest;
export function serializeExecutionRequest({
  executionRequest,
  excludeQuery,
  printFn = defaultPrintFn,
}: ExecutionRequestToGraphQLParams): SerializedExecutionRequest {
  return {
    query: excludeQuery ? undefined : printFn(executionRequest.document),
    variables:
      (executionRequest.variables && Object.keys(executionRequest.variables).length) > 0
        ? executionRequest.variables
        : undefined,
    operationName: executionRequest.operationName ? executionRequest.operationName : undefined,
    extensions:
      executionRequest.extensions && Object.keys(executionRequest.extensions).length > 0
        ? executionRequest.extensions
        : undefined,
  };
}

export interface UpstreamErrorExtensions {
  // GraphQLErrorOptions.extensions requires a string index signature.
  [attributeName: string]: unknown;
  code?: string;
  serviceName?: string;
  request: {
    url?: string;
    method?: string;
    body?: unknown;
  };
  response?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
}

export { copyJson } from './copyJson.js';
