import { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { HiveClient, HivePluginOptions, createHive } from '@graphql-hive/client';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { ExecutionResult, GraphQLSchema } from 'graphql';
import { DelegationContext } from '@graphql-tools/delegate';
import { ExecutionRequest } from '@graphql-tools/utils';
import { process } from '@graphql-mesh/cross-helpers';

interface TransformationContext {
  collectUsageCallback: ReturnType<HiveClient['collectUsage']>;
}

export default class HiveTransform implements MeshTransform {
  private hiveClient: HiveClient;
  constructor({ config, pubsub, logger }: MeshTransformOptions<YamlConfig.HivePlugin>) {
    const token = stringInterpolator.parse(config.token, {
      env: process.env,
    });

    let usage: HivePluginOptions['usage'];
    if (config.usage) {
      usage = {
        max: config.usage.max,
        ttl: config.usage.ttl,
        exclude: config.usage.exclude,
        sampleRate: config.usage.sampleRate,
        processVariables: config.usage.processVariables,
      };
      if (config.usage?.clientInfo) {
        usage.clientInfo = function (context) {
          return {
            name: stringInterpolator.parse(config.usage.clientInfo.name, {
              context,
              env: process.env,
            }),
            version: stringInterpolator.parse(config.usage.clientInfo.version, {
              context,
              env: process.env,
            }),
          };
        };
      }
    }
    let reporting: HivePluginOptions['reporting'];
    if (config.reporting) {
      reporting = {
        author: stringInterpolator.parse(config.reporting.author, { env: process.env }),
        commit: stringInterpolator.parse(config.reporting.commit, { env: process.env }),
        serviceName: stringInterpolator.parse(config.reporting.serviceName, { env: process.env }),
        serviceUrl: stringInterpolator.parse(config.reporting.serviceUrl, { env: process.env }),
      };
    }
    let agent: HivePluginOptions['agent'];
    if (config.agent) {
      agent = {
        timeout: config.agent.timeout,
        maxRetries: config.agent.maxRetries,
        minTimeout: config.agent.minTimeout,
        sendInterval: config.agent.sendInterval,
        maxSize: config.agent.maxSize,
        logger,
      };
    }
    this.hiveClient = createHive({
      enabled: true,
      debug: !!process.env.DEBUG,
      token,
      agent,
      usage,
      reporting,
    });
    const id = pubsub.subscribe('destroy', () => {
      this.hiveClient
        .dispose()
        .catch(e => logger.error(`Hive client failed to dispose`, e))
        .finally(() => pubsub.unsubscribe(id));
    });
  }

  transformSchema(schema: GraphQLSchema) {
    this.hiveClient.reportSchema({ schema });
    return schema;
  }

  transformRequest(
    request: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: TransformationContext
  ) {
    transformationContext.collectUsageCallback = this.hiveClient.collectUsage({
      schema: delegationContext.transformedSchema,
      document: request.document,
      rootValue: request.rootValue,
      contextValue: request.context,
      variableValues: request.variables,
      operationName: request.operationName,
    });
    return request;
  }

  transformResult(
    result: ExecutionResult,
    _delegationContext: DelegationContext,
    transformationContext: TransformationContext
  ) {
    transformationContext.collectUsageCallback(result);
    return result;
  }
}
