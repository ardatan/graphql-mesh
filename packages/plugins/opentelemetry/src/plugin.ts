import {
  type OnExecuteEventPayload,
  type OnParseEventPayload,
  type OnValidateEventPayload,
} from '@envelop/types';
import type { OnSubgraphExecutePayload } from '@graphql-mesh/fusion-runtime';
import { DisposableSymbols, type GatewayPlugin } from '@graphql-mesh/serve-runtime';
import type { OnFetchHookPayload } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import { isAsyncIterable } from '@graphql-tools/utils';
import {
  context,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  propagation,
  trace,
  type Context,
  type TextMapGetter,
  type Tracer,
} from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { type SpanProcessor } from '@opentelemetry/sdk-trace-node';
import type { OnRequestEventPayload } from '@whatwg-node/server';
import { SEMRESATTRS_SERVICE_NAME } from './attributes.js';
import {
  completeHttpSpan,
  createGraphQLExecuteSpan,
  createGraphQLParseSpan,
  createGraphQLValidateSpan,
  createHttpSpan,
  createSubgraphExecuteFetchSpan,
  createUpstreamHttpFetchSpan,
} from './spans.js';

type PrimitiveOrEvaluated<TExpectedResult, TInput = never> =
  | TExpectedResult
  | ((input: TInput) => TExpectedResult);

export type OpenTelemetryGatewayPluginOptions = {
  /**
   * A list of OpenTelemetry exporters to use for exporting the spans.
   * You can use exporters from `@opentelemetry/exporter-*` packages, or use the built-in utility functions.
   */
  exporters: SpanProcessor[];
  /**
   * Service name to use for the spans (default: 'Gateway').
   */
  serviceName?: string;
  /**
   * Tracer instance to use for creating spans (default: a tracer with name 'gateway').
   */
  tracer?: Tracer;
  /**
   * Whether to inherit the context from the calling service (default: true).
   *
   * This process is done by extracting the context from the incoming request headers. If disabled, a new context and a trace-id will be created.
   *
   * See https://opentelemetry.io/docs/languages/js/propagation/
   */
  inheritContext?: boolean;
  /**
   * Whether to propagate the context to the outgoing requests (default: true).
   *
   * This process is done by injecting the context into the outgoing request headers. If disabled, the context will not be propagated.
   *
   * See https://opentelemetry.io/docs/languages/js/propagation/
   */
  propagateContext?: boolean;
  /**
   * Options to control which spans to create.
   * By default, all spans are enabled.
   *
   * You may specify a boolean value to enable/disable all spans, or a function to dynamically enable/disable spans based on the input.
   */
  spans?: {
    /**
     * Enable/disable HTTP request spans (default: true).
     *
     * Disabling the HTTP span will also disable all other child spans.
     */
    http?: PrimitiveOrEvaluated<boolean, OnRequestEventPayload<any>>;
    /**
     * Enable/disable GraphQL parse spans (default: true).
     */
    graphqlParse?: PrimitiveOrEvaluated<boolean, OnParseEventPayload<any>>;
    /**
     * Enable/disable GraphQL validate spans (default: true).
     */
    graphqlValidate?: PrimitiveOrEvaluated<boolean, OnValidateEventPayload<any>>;
    /**
     * Enable/disable GraphQL execute spans (default: true).
     */
    graphqlExecute?: PrimitiveOrEvaluated<boolean, OnExecuteEventPayload<any>>;
    /**
     * Enable/disable subgraph execute spans (default: true).
     */
    subgraphExecute?: PrimitiveOrEvaluated<boolean, OnSubgraphExecutePayload<any>>;
    /**
     * Enable/disable upstream HTTP fetch calls spans (default: true).
     */
    upstreamFetch?: PrimitiveOrEvaluated<boolean, OnFetchHookPayload<any>>;
  };
};

const HeadersTextMapGetter: TextMapGetter = {
  keys(carrier) {
    return carrier.keys();
  },
  get(carrier, key) {
    return carrier.get(key);
  },
};

export function useOpenTelemetry(options: OpenTelemetryGatewayPluginOptions): GatewayPlugin<{
  opentelemetry: {
    tracer: Tracer;
    activeContext: () => Context;
  };
}> {
  const serviceName = options.serviceName ?? 'Gateway';
  const spanProcessors = options.exporters;
  const contextManager = new AsyncHooksContextManager();
  const inheritContext = options.inheritContext ?? true;
  const propagateContext = options.propagateContext ?? true;

  const sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
    }),
    spanProcessors,
    contextManager,
    instrumentations: [],
  });

  const requestContextMapping = new WeakMap<Request, Context>();
  const tracer = options.tracer || trace.getTracer('gateway');

  return {
    onYogaInit() {
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
      contextManager.enable();
      sdk.start();
    },
    onContextBuilding({ extendContext, context }) {
      extendContext({
        opentelemetry: {
          tracer,
          activeContext: () => requestContextMapping.get(context.request) ?? context.active(),
        },
      });
    },
    onRequest(onRequestPayload) {
      const shouldTraceHttp =
        typeof options.spans?.http === 'function'
          ? options.spans.http(onRequestPayload)
          : (options.spans?.http ?? true);

      if (!shouldTraceHttp) {
        return;
      }

      const { request, url } = onRequestPayload;
      const otelContext = inheritContext
        ? propagation.extract(context.active(), request.headers, HeadersTextMapGetter)
        : context.active();

      const httpSpan = createHttpSpan({
        request,
        url,
        tracer,
        otelContext,
      });

      requestContextMapping.set(request, trace.setSpan(otelContext, httpSpan));
    },
    onValidate(onValidatePayload) {
      const shouldTraceValidate =
        typeof options.spans?.graphqlValidate === 'function'
          ? options.spans.graphqlValidate(onValidatePayload)
          : (options.spans?.graphqlValidate ?? true);

      const { context } = onValidatePayload;
      const otelContext = requestContextMapping.get(context.request);

      if (shouldTraceValidate && otelContext) {
        const { done } = createGraphQLValidateSpan({
          otelContext,
          tracer,
          query: context.params.query,
          operationName: context.params.operationName,
        });

        return ({ result }) => done(result);
      }
    },
    onParse(onParsePayload) {
      const shouldTracePrase =
        typeof options.spans?.graphqlParse === 'function'
          ? options.spans.graphqlParse(onParsePayload)
          : (options.spans?.graphqlParse ?? true);

      const { context } = onParsePayload;
      const otelContext = requestContextMapping.get(context.request);

      if (shouldTracePrase && otelContext) {
        const { done } = createGraphQLParseSpan({
          otelContext,
          tracer,
          query: context.params.query,
          operationName: context.params.operationName,
        });

        return ({ result }) => done(result);
      }
    },
    onExecute(onExecuteArgs) {
      const shouldTraceExecute =
        typeof options.spans?.graphqlExecute === 'function'
          ? options.spans.graphqlExecute(onExecuteArgs)
          : (options.spans?.graphqlExecute ?? true);

      const { args } = onExecuteArgs;
      const otelContext = requestContextMapping.get(args.contextValue.request);

      if (shouldTraceExecute && otelContext) {
        const { done } = createGraphQLExecuteSpan({
          args,
          otelContext,
          tracer,
        });

        return {
          onExecuteDone: ({ result }) => {
            if (!isAsyncIterable(result)) {
              done(result);
            }
          },
        };
      }
    },
    onSubgraphExecute(onSubgraphPayload) {
      const shouldTraceSubgraphExecute =
        typeof options.spans?.subgraphExecute === 'function'
          ? options.spans.subgraphExecute(onSubgraphPayload)
          : (options.spans?.subgraphExecute ?? true);

      const otelContext = requestContextMapping.get(
        onSubgraphPayload.executionRequest.context.request,
      );

      if (shouldTraceSubgraphExecute && otelContext) {
        const { subgraphName, executionRequest } = onSubgraphPayload;
        const { done } = createSubgraphExecuteFetchSpan({
          otelContext,
          tracer,
          executionRequest,
          subgraphName,
        });

        return done;
      }
    },
    onFetch(onFetchPayload) {
      const shouldTraceFetch =
        typeof options.spans?.upstreamFetch === 'function'
          ? options.spans.upstreamFetch(onFetchPayload)
          : (options.spans?.upstreamFetch ?? true);

      const { context, options: fetchOptions, url, setOptions, executionRequest } = onFetchPayload;

      const otelContext = requestContextMapping.get(context.request);
      if (shouldTraceFetch && otelContext) {
        if (propagateContext) {
          const reqHeaders = getHeadersObj(fetchOptions.headers || {});
          propagation.inject(otelContext, reqHeaders);

          setOptions({
            ...fetchOptions,
            headers: reqHeaders,
          });
        }

        const { done } = createUpstreamHttpFetchSpan({
          otelContext,
          tracer,
          url,
          fetchOptions,
          executionRequest,
        });

        return fetchDonePayload => done(fetchDonePayload.response);
      }
    },
    onResponse({ request, response }) {
      const otelContext = requestContextMapping.get(request);
      if (!otelContext) {
        return;
      }

      const rootSpan = trace.getSpan(otelContext);

      if (rootSpan) {
        completeHttpSpan(rootSpan, response);
      }

      requestContextMapping.delete(request);
    },
    [DisposableSymbols.asyncDispose]() {
      return sdk.shutdown();
    },
  };
}
