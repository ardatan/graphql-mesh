import { Path } from '@envelop/core';
import { MeshPlugin, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { useNewRelic } from '@envelop/newrelic';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';
import recordExternal from 'newrelic/lib/metrics/recorders/http_external';
import NAMES from 'newrelic/lib/metrics/names';
import cat from 'newrelic/lib/util/cat';
import { getHeadersObj } from '@graphql-mesh/utils';

enum AttributeName {
  COMPONENT_NAME = 'Envelop_NewRelic_Plugin',
}

export default function useMeshNewrelic(options: MeshPluginOptions<YamlConfig.NewrelicConfig>): MeshPlugin<any> {
  const instrumentationApi$ = import('newrelic')
    .then(m => m.default || m)
    .then(({ shim }) => {
      if (!shim?.agent) {
        throw new Error(
          'Agent unavailable. Please check your New Relic Agent configuration and ensure New Relic is enabled.'
        );
      }
      shim.agent.metrics
        .getOrCreateMetric(`Supportability/ExternalModules/${AttributeName.COMPONENT_NAME}`)
        .incrementCallCount();
      return shim;
    });
  const logger$ = instrumentationApi$.then(({ logger }) => {
    const childLogger = logger.child({ component: AttributeName.COMPONENT_NAME });
    childLogger.info(`${AttributeName.COMPONENT_NAME} registered`);
    return childLogger;
  });

  const segmentByContext = new WeakMap<any, any>();

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
    async onExecute({ args: { contextValue } }) {
      const instrumentationApi = await instrumentationApi$;
      const operationSegment = instrumentationApi.getActiveSegment() || instrumentationApi.getSegment();
      segmentByContext.set(contextValue, operationSegment);
    },
    async onFetch({ url, options, context, info }) {
      const instrumentationApi = await instrumentationApi$;
      const logger = await logger$;
      const agent = instrumentationApi?.agent;
      const operationSegment = segmentByContext.get(context);
      const transaction = operationSegment?.transaction;
      if (transaction != null) {
        const transactionNameState = transaction.nameState;
        const delimiter = transactionNameState?.delimiter || '/';
        const formattedPath = flattenPath(info.path, delimiter);
        const sourceSegment = instrumentationApi.createSegment(
          `source${delimiter}${(info as any).sourceName || 'unknown'}${delimiter}${formattedPath}`,
          null,
          operationSegment
        );
        if (!sourceSegment) {
          logger.trace('Source segment was not created (%s).', formattedPath);
          return undefined;
        }
        const parsedUrl = new URL(url);
        const name = NAMES.EXTERNAL.PREFIX + parsedUrl.host + parsedUrl.pathname;
        const httpDetailSegment = instrumentationApi.createSegment(
          name,
          recordExternal(parsedUrl.host, 'graphql-mesh'),
          sourceSegment
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
        }
        return ({ response }) => {
          httpDetailSegment.addAttribute('http.statusCode', response.status);
          httpDetailSegment.addAttribute('http.statusText', response.statusText);
          if (agent.config.cross_application_tracer.enabled && !agent.config.distributed_tracing.enabled) {
            try {
              const { appData } = cat.extractCatHeaders(getHeadersObj(response.headers));
              const decodedAppData = cat.parseAppData(agent.config, appData);
              const attrs = httpDetailSegment.getAttributes();
              const url = new URL(attrs.url);
              cat.assignCatToSegment(decodedAppData, httpDetailSegment, url.host);
            } catch (err) {
              logger.warn(err, 'Cannot add CAT data to segment');
            }
          }
          sourceSegment.end();
          httpDetailSegment.end();
        };
      }
      return undefined;
    },
  };
}

function flattenPath(fieldPath: Path, delimiter = '/') {
  const pathArray = [];
  let thisPath: Path | undefined = fieldPath;

  while (thisPath) {
    if (typeof thisPath.key !== 'number') {
      pathArray.push(thisPath.key);
    }
    thisPath = thisPath.prev;
  }

  return pathArray.reverse().join(delimiter);
}
