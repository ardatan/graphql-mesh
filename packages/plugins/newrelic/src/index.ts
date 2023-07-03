import { Plugin } from 'graphql-yoga';
import newRelic from 'newrelic';
import NAMES from 'newrelic/lib/metrics/names.js';
import recordExternal from 'newrelic/lib/metrics/recorders/http_external.js';
import cat from 'newrelic/lib/util/cat.js';
import { useNewRelic } from '@envelop/newrelic';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { MeshPlugin, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';

const EnvelopAttributeName = 'Envelop_NewRelic_Plugin';

export default function useMeshNewrelic(
  options: MeshPluginOptions<YamlConfig.NewrelicConfig>,
): MeshPlugin<any> & Plugin<any> {
  const instrumentationApi = newRelic?.shim;
  if (!instrumentationApi?.agent) {
    options.logger.debug(
      'Agent unavailable. Please check your New Relic Agent configuration and ensure New Relic is enabled.',
    );
    return {};
  }

  instrumentationApi.agent.metrics
    .getOrCreateMetric(`Supportability/ExternalModules/${EnvelopAttributeName}`)
    .incrementCallCount();

  const logger = instrumentationApi.logger.child({ component: EnvelopAttributeName });

  const segmentByRequestContext = new WeakMap<any, any>();
  const transactionCallback = new WeakMap<Request, () => void>();

  return {
    onPluginInit({ addPlugin }) {
      addPlugin(
        useNewRelic({
          ...options,
          extractOperationName: options.extractOperationName
            ? context =>
                stringInterpolator.parse(options.extractOperationName, {
                  context,
                  env: process.env,
                })
            : undefined,
        }),
      );
    },
    onRequest({ request, url }) {
      const currentTransaction = instrumentationApi.getTransaction();
      if (!currentTransaction) {
        instrumentationApi.startWebTransaction(
          url.pathname,
          () => new Promise<void>(resolve => transactionCallback.set(request, resolve)),
        );
      }
    },
    onExecute({ args: { contextValue } }) {
      const operationSegment =
        instrumentationApi.getActiveSegment() || instrumentationApi.getSegment();
      segmentByRequestContext.set(contextValue.request || contextValue, operationSegment);
    },
    onDelegate({ sourceName, fieldName, args, context, key }) {
      const parentSegment =
        instrumentationApi.getActiveSegment() ||
        instrumentationApi.getSegment() ||
        segmentByRequestContext.get(context.request || context);
      const delimiter = parentSegment?.transaction?.nameState?.delimiter || '/';
      const sourceSegment = instrumentationApi.createSegment(
        `source${delimiter}${sourceName || 'unknown'}${delimiter}${fieldName}`,
        null,
        parentSegment,
      );
      if (!sourceSegment) {
        return undefined;
      }
      if (options.includeResolverArgs) {
        if (args) {
          sourceSegment.addAttribute('args', JSON.stringify(args));
        }
        if (key) {
          sourceSegment.addAttribute('key', JSON.stringify(key));
        }
      }
      sourceSegment.start();
      return ({ result }) => {
        if (options.includeRawResult) {
          sourceSegment.addAttribute('result', JSON.stringify(result));
        }
        sourceSegment.end();
      };
    },
    onFetch({ url, options, context }) {
      const agent = instrumentationApi?.agent;
      const parentSegment =
        instrumentationApi.getActiveSegment() ||
        instrumentationApi.getSegment() ||
        (context ? segmentByRequestContext.get(context.request || context) : undefined);
      const parsedUrl = new URL(url);
      const name = NAMES.EXTERNAL.PREFIX + parsedUrl.host + parsedUrl.pathname;
      const httpDetailSegment = instrumentationApi.createSegment(
        name,
        recordExternal(parsedUrl.host, 'graphql-mesh'),
        parentSegment,
      );
      if (!httpDetailSegment) {
        logger.error(`Unable to create segment for external request: ${name}`);
        return undefined;
      }
      httpDetailSegment.start();
      httpDetailSegment.addAttribute('url', url);
      parsedUrl.searchParams.forEach((value, key) => {
        httpDetailSegment.addAttribute(`request.parameters.${key}`, value);
      });
      httpDetailSegment.addAttribute('procedure', options.method || 'GET');
      const transaction = parentSegment?.transaction;
      if (transaction) {
        const outboundHeaders = Object.create(null);
        if (agent.config.encoding_key && transaction.syntheticsHeader) {
          outboundHeaders['x-newrelic-synthetics'] = transaction.syntheticsHeader;
        }
        if (agent.config.distributed_tracing.enabled) {
          transaction.insertDistributedTraceHeaders(outboundHeaders);
        } else if (agent.config.cross_application_tracer.enabled) {
          cat.addCatHeaders(agent.config, transaction, outboundHeaders);
        } else {
          logger.trace('Both DT and CAT are disabled, not adding headers!');
        }
        for (const key in outboundHeaders) {
          (options.headers as any)[key] = outboundHeaders[key];
        }
      }
      for (const key in options.headers) {
        httpDetailSegment.addAttribute(`request.headers.${key}`, (options.headers as any)[key]);
      }
      return ({ response }) => {
        httpDetailSegment.addAttribute('http.statusCode', response.status);
        httpDetailSegment.addAttribute('http.statusText', response.statusText);
        const responseHeadersObj = getHeadersObj(response.headers);
        for (const key in responseHeadersObj) {
          httpDetailSegment.addAttribute(`response.headers.${key}`, responseHeadersObj[key]);
        }
        if (
          agent.config.cross_application_tracer.enabled &&
          !agent.config.distributed_tracing.enabled
        ) {
          try {
            const { appData } = cat.extractCatHeaders(responseHeadersObj);
            const decodedAppData = cat.parseAppData(agent.config, appData);
            const attrs = httpDetailSegment.getAttributes();
            const url = new URL(attrs.url);
            cat.assignCatToSegment(decodedAppData, httpDetailSegment, url.host);
          } catch (err) {
            logger.warn(err, 'Cannot add CAT data to segment');
          }
        }
        httpDetailSegment.end();
      };
    },
    onResponse({ request }) {
      const callback = transactionCallback.get(request);
      if (callback) {
        callback();
      }
    },
  };
}
