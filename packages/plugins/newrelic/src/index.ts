import { Path, Plugin } from '@envelop/core';
import { MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { useNewRelic } from '@envelop/newrelic';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';
import { httpDetailsByContext } from '@graphql-mesh/utils';

enum AttributeName {
  COMPONENT_NAME = 'Envelop_NewRelic_Plugin',
}

export default function useMeshNewrelic(options: MeshPluginOptions<YamlConfig.NewrelicConfig>): Plugin {
  let instrumentationApi$: Promise<any>;
  let logger$: Promise<any>;

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
      instrumentationApi$ = import('newrelic')
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
      logger$ = instrumentationApi$.then(({ logger }) => {
        const childLogger = logger.child({ component: AttributeName.COMPONENT_NAME });
        childLogger.info(`${AttributeName.COMPONENT_NAME} registered`);
        return childLogger;
      });
    },
    async onExecute({ args: { contextValue } }) {
      const instrumentationApi = await instrumentationApi$;
      const logger = await logger$;
      const transactionNameState = instrumentationApi.agent.tracer.getTransaction().nameState;
      const delimiter = transactionNameState.delimiter;
      const operationSegment = instrumentationApi.getActiveSegment();
      return {
        onExecuteDone(): void {
          const httpDetails = httpDetailsByContext.get(contextValue);
          if (httpDetails) {
            for (const httpDetail of httpDetails) {
              const formattedPath = flattenPath(httpDetail.path, delimiter);
              const sourceSegment = instrumentationApi.createSegment(
                `source${delimiter}${httpDetail.sourceName || 'unknown'}${delimiter}${formattedPath}`,
                null,
                operationSegment
              );
              if (!sourceSegment) {
                logger.trace('Source segment was not created (%s).', formattedPath);
                return;
              }
              const httpDetailSegment = instrumentationApi.createSegment(httpDetail.request.url, null, sourceSegment);
              httpDetailSegment.addAttribute('timestamp', httpDetail.request.timestamp);
              httpDetailSegment.addAttribute('method', httpDetail.request.method);
              httpDetailSegment.addAttribute('headers', JSON.stringify(httpDetail.request.headers));

              httpDetailSegment.addAttribute('response.timestamp', httpDetail.response.timestamp);
              httpDetailSegment.addAttribute('response.status', httpDetail.response.status);
              httpDetailSegment.addAttribute('response.statusText', httpDetail.response.statusText);
              httpDetailSegment.addAttribute('response.headers', JSON.stringify(httpDetail.response.headers));

              if (!options.trackResolvers) {
                sourceSegment.end();
                httpDetailSegment.end();
                httpDetailSegment.setDurationInMillis(httpDetail.responseTime);
              }
            }
          }
        },
      };
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
