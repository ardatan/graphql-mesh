import type { ExecutionArgs } from 'graphql';
import { defaultPrintFn } from '@graphql-mesh/transport-common';
import {
  getOperationASTFromDocument,
  type ExecutionRequest,
  type ExecutionResult,
} from '@graphql-tools/utils';
import { SpanKind, SpanStatusCode, type Context, type Span, type Tracer } from '@opentelemetry/api';
import {
  SEMATTRS_GRAPHQL_DOCUMENT,
  SEMATTRS_GRAPHQL_ERROR_COUNT,
  SEMATTRS_GRAPHQL_OPERATION_NAME,
  SEMATTRS_GRAPHQL_OPERATION_TYPE,
  SEMATTRS_HTTP_CLIENT_IP,
  SEMATTRS_HTTP_HOST,
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_ROUTE,
  SEMATTRS_HTTP_SCHEME,
  SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_URL,
  SEMATTRS_HTTP_USER_AGENT,
  SEMATTRS_MESH_UPSTREAM_SUBGRAPH_NAME,
  SEMATTRS_NET_HOST_NAME,
} from './attributes.js';

export function createHttpSpan(input: {
  tracer: Tracer;
  request: Request;
  url: URL;
  otelContext: Context;
}): Span {
  const { url, request, tracer, otelContext } = input;
  const path = url.pathname;
  const userAgent = request.headers.get('user-agent');
  const ips = request.headers.get('x-forwarded-for');
  const method = request.method || 'GET';
  const host = url.host || request.headers.get('host');
  const hostname = url.hostname || host || 'localhost';
  const rootSpanName = `${method} ${path}`;

  return tracer.startSpan(
    rootSpanName,
    {
      attributes: {
        [SEMATTRS_HTTP_METHOD]: method,
        [SEMATTRS_HTTP_URL]: request.url,
        [SEMATTRS_HTTP_ROUTE]: path,
        [SEMATTRS_HTTP_SCHEME]: url.protocol,
        [SEMATTRS_NET_HOST_NAME]: hostname,
        [SEMATTRS_HTTP_HOST]: host,
        [SEMATTRS_HTTP_CLIENT_IP]: ips?.split(',')[0],
        [SEMATTRS_HTTP_USER_AGENT]: userAgent,
      },
      kind: SpanKind.SERVER,
    },
    otelContext,
  );
}

export function completeHttpSpan(span: Span, response: Response) {
  span.setAttribute(SEMATTRS_HTTP_STATUS_CODE, response.status);
  span.setStatus({
    code: response.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR,
    message: response.ok ? undefined : response.statusText,
  });
  span.end();
}

export function createGraphQLParseSpan(input: {
  otelContext: Context;
  tracer: Tracer;
  query?: string;
  operationName?: string;
}) {
  const parseSpan = input.tracer.startSpan(
    'graphql.parse',
    {
      attributes: {
        [SEMATTRS_GRAPHQL_DOCUMENT]: input.query,
        [SEMATTRS_GRAPHQL_OPERATION_NAME]: input.operationName,
      },
      kind: SpanKind.INTERNAL,
    },
    input.otelContext,
  );

  return {
    parseSpan,
    done: (result: any | Error | null) => {
      if (result instanceof Error) {
        parseSpan.setAttribute(SEMATTRS_GRAPHQL_ERROR_COUNT, 1);
        parseSpan.recordException(result);
        parseSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: result.message,
        });
      }

      parseSpan.end();
    },
  };
}

export function createGraphQLValidateSpan(input: {
  otelContext: Context;
  tracer: Tracer;
  query?: string;
  operationName?: string;
}) {
  const validateSpan = input.tracer.startSpan(
    'graphql.validate',
    {
      attributes: {
        [SEMATTRS_GRAPHQL_DOCUMENT]: input.query,
        [SEMATTRS_GRAPHQL_OPERATION_NAME]: input.operationName,
      },
      kind: SpanKind.INTERNAL,
    },
    input.otelContext,
  );

  return {
    validateSpan,
    done: (result: any[] | readonly Error[]) => {
      if (result instanceof Error) {
        validateSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: result.message,
        });
      } else if (Array.isArray(result) && result.length > 0) {
        validateSpan.setAttribute(SEMATTRS_GRAPHQL_ERROR_COUNT, result.length);
        validateSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: result.map(e => e.message).join(', '),
        });

        for (const error in result) {
          validateSpan.recordException(error);
        }
      }

      validateSpan.end();
    },
  };
}

export function createGraphQLExecuteSpan(input: {
  args: ExecutionArgs;
  otelContext: Context;
  tracer: Tracer;
}) {
  const operation = getOperationASTFromDocument(input.args.document, input.args.operationName);
  const executeSpan = input.tracer.startSpan(
    'graphql.execute',
    {
      attributes: {
        [SEMATTRS_GRAPHQL_OPERATION_TYPE]: operation.operation,
        [SEMATTRS_GRAPHQL_OPERATION_NAME]: input.args.operationName,
        [SEMATTRS_GRAPHQL_DOCUMENT]: defaultPrintFn(input.args.document),
      },
      kind: SpanKind.INTERNAL,
    },
    input.otelContext,
  );

  return {
    executeSpan,
    done: (result: ExecutionResult) => {
      if (result.errors && result.errors.length > 0) {
        executeSpan.setAttribute(SEMATTRS_GRAPHQL_ERROR_COUNT, result.errors.length);
        executeSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: result.errors.map(e => e.message).join(', '),
        });

        for (const error in result.errors) {
          executeSpan.recordException(error);
        }
      }

      executeSpan.end();
    },
  };
}

export const subgraphExecReqSpanMap = new WeakMap<ExecutionRequest, Span>();

export function createSubgraphExecuteFetchSpan(input: {
  otelContext: Context;
  tracer: Tracer;
  executionRequest: ExecutionRequest;
  subgraphName: string;
}) {
  const subgraphExecuteSpan = input.tracer.startSpan(
    `subgraph.execute (${input.subgraphName})`,
    {
      attributes: {
        [SEMATTRS_GRAPHQL_OPERATION_NAME]: input.executionRequest.operationName,
        [SEMATTRS_GRAPHQL_DOCUMENT]: defaultPrintFn(input.executionRequest.document),
        [SEMATTRS_GRAPHQL_OPERATION_TYPE]: getOperationASTFromDocument(
          input.executionRequest.document,
          input.executionRequest.operationName,
        )?.operation,
        [SEMATTRS_MESH_UPSTREAM_SUBGRAPH_NAME]: input.subgraphName,
      },
      kind: SpanKind.CLIENT,
    },
    input.otelContext,
  );

  subgraphExecReqSpanMap.set(input.executionRequest, subgraphExecuteSpan);

  return {
    done() {
      subgraphExecuteSpan.end();
    },
  };
}

export function createUpstreamHttpFetchSpan(input: {
  otelContext: Context;
  tracer: Tracer;
  url: string;
  fetchOptions: RequestInit;
  executionRequest?: ExecutionRequest;
}) {
  const urlObj = new URL(input.url);

  const attributes = {
    [SEMATTRS_HTTP_METHOD]: input.fetchOptions.method,
    [SEMATTRS_HTTP_URL]: input.url,
    [SEMATTRS_NET_HOST_NAME]: urlObj.hostname,
    [SEMATTRS_HTTP_HOST]: urlObj.host,
    [SEMATTRS_HTTP_ROUTE]: urlObj.pathname,
    [SEMATTRS_HTTP_SCHEME]: urlObj.protocol,
  };

  let fetchSpan: Span;
  let isOrigSpan: boolean;

  if (input.executionRequest) {
    fetchSpan = subgraphExecReqSpanMap.get(input.executionRequest);
    if (fetchSpan) {
      isOrigSpan = false;
      fetchSpan.setAttributes(attributes);
    }
  }

  if (!fetchSpan) {
    fetchSpan = input.tracer.startSpan(
      'http.fetch',
      {
        attributes,
        kind: SpanKind.CLIENT,
      },
      input.otelContext,
    );
    isOrigSpan = true;
  }

  return {
    done: (response: Response) => {
      fetchSpan.setAttribute(SEMATTRS_HTTP_STATUS_CODE, response.status);
      fetchSpan.setStatus({
        code: response.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        message: response.ok ? undefined : response.statusText,
      });
      if (isOrigSpan) {
        fetchSpan.end();
      }
    },
  };
}
