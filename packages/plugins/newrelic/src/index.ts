import { Path } from '@envelop/core';
import { MeshPlugin, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { useNewRelic } from '@envelop/newrelic';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { process } from '@graphql-mesh/cross-helpers';
import { getHeadersObj } from '@graphql-mesh/utils';

enum AttributeName {
  COMPONENT_NAME = 'Envelop_NewRelic_Plugin',
}

export default function useMeshNewrelic(options: MeshPluginOptions<YamlConfig.NewrelicConfig>): MeshPlugin<any> {
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
    async onFetch({ url, options, info }) {
      const instrumentationApi = await instrumentationApi$;
      const logger = await logger$;
      const transactionNameState = instrumentationApi.agent.tracer.getTransaction().nameState;
      const delimiter = transactionNameState.delimiter;
      const operationSegment = instrumentationApi.getActiveSegment();
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
      const httpDetailSegment = instrumentationApi.createSegment(url, null, sourceSegment);
      httpDetailSegment.addAttribute('method', options.method);
      httpDetailSegment.addAttribute('headers', JSON.stringify(getHeadersObj(options.headers as Headers)));

      return ({ response }) => {
        httpDetailSegment.addAttribute('response.status', response.status);
        httpDetailSegment.addAttribute('response.statusText', response.statusText);
        httpDetailSegment.addAttribute('response.headers', JSON.stringify(getHeadersObj(response.headers)));
        sourceSegment.end();
        httpDetailSegment.end();
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
