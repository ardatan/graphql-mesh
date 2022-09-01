import { MeshPlugin, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { useNewRelic } from '@envelop/newrelic';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';
import recordExternal from 'newrelic/lib/metrics/recorders/http_external';
import NAMES from 'newrelic/lib/metrics/names';
import cat from 'newrelic/lib/util/cat';
import { getHeadersObj } from '@graphql-mesh/utils';
import { shim as instrumentationApi } from 'newrelic';

const EnvelopAttributeName = 'Envelop_NewRelic_Plugin';

export default function useMeshNewrelic(options: MeshPluginOptions<YamlConfig.NewrelicConfig>): MeshPlugin<any> {
  if (!instrumentationApi?.agent) {
    options.logger.error(
      'Agent unavailable. Please check your New Relic Agent configuration and ensure New Relic is enabled.'
    );
    return {};
  }

  instrumentationApi.agent.metrics
    .getOrCreateMetric(`Supportability/ExternalModules/${EnvelopAttributeName}`)
    .incrementCallCount();

  const logger = instrumentationApi.logger.child({ component: EnvelopAttributeName });

  const segmentByRequestContext = new WeakMap<any, any>();

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
        })
      );
    },
    onExecute({ args: { contextValue } }) {
      const operationSegment = instrumentationApi.getActiveSegment() || instrumentationApi.getSegment();
      segmentByRequestContext.set(contextValue.request || contextValue, operationSegment);
    },
    onDelegate({ sourceName, fieldName, args, context, key }) {
      const parentSegment =
        instrumentationApi.getActiveSegment() ||
        instrumentationApi.getSegment() ||
        segmentByRequestContext.get(context || context.request);
      const transaction = parentSegment?.transaction;
      if (transaction != null) {
        const transactionNameState = transaction.nameState;
        const delimiter = transactionNameState?.delimiter || '/';
        const sourceSegment = instrumentationApi.createSegment(
          `source${delimiter}${sourceName || 'unknown'}${delimiter}${fieldName}`,
          null,
          parentSegment
        );
        if (args) {
          sourceSegment.addAttribute('args', JSON.stringify(args));
        }
        if (key) {
          sourceSegment.addAttribute('key', JSON.stringify(key));
        }
        sourceSegment.start();
        return ({ result }) => {
          sourceSegment.addAttribute('result', JSON.stringify(result));
          sourceSegment.end();
        };
      }
      return undefined;
    },
    onFetch({ url, options, context }) {
      const agent = instrumentationApi?.agent;
      const parentSegment =
        instrumentationApi.getActiveSegment() ||
        instrumentationApi.getSegment() ||
        segmentByRequestContext.get(context || context.request);
      const transaction = parentSegment?.transaction;
      if (transaction != null) {
        const parsedUrl = new URL(url);
        const name = NAMES.EXTERNAL.PREFIX + parsedUrl.host + parsedUrl.pathname;
        const httpDetailSegment = instrumentationApi.createSegment(
          name,
          recordExternal(parsedUrl.host, 'graphql-mesh'),
          parentSegment
        );
        if (httpDetailSegment) {
          httpDetailSegment.start();
          httpDetailSegment.addAttribute('url', url);
          parsedUrl.searchParams.forEach((value, key) => {
            httpDetailSegment.addAttribute(`request.parameters.${key}`, value);
          });
          httpDetailSegment.addAttribute('procedure', options.method || 'GET');
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
            options.headers[key] = outboundHeaders[key];
          }
          for (const key in options.headers) {
            httpDetailSegment.addAttribute(`request.headers.${key}`, options.headers[key]);
          }
        }
        return ({ response }) => {
          httpDetailSegment.addAttribute('http.statusCode', response.status);
          httpDetailSegment.addAttribute('http.statusText', response.statusText);
          const responseHeadersObj = getHeadersObj(response.headers);
          for (const key in responseHeadersObj) {
            httpDetailSegment.addAttribute(`response.headers.${key}`, responseHeadersObj[key]);
          }
          if (agent.config.cross_application_tracer.enabled && !agent.config.distributed_tracing.enabled) {
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
      }
      return undefined;
    },
  };
}
