import { Kind, visit, visitWithTypeInfo, type ExecutionResult, type GraphQLSchema } from 'graphql';
import { createHive, type HiveClient, type HivePluginOptions } from '@graphql-hive/core';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { getTypeInfo, type DelegationContext } from '@graphql-tools/delegate';
import { type ExecutionRequest } from '@graphql-tools/utils';

interface TransformationContext {
  collectUsageCallback?: ReturnType<HiveClient['collectUsage']>;
  request: ExecutionRequest;
}

export default class HiveTransform implements MeshTransform {
  private hiveClient: HiveClient;
  private logger: MeshTransformOptions<YamlConfig.HivePlugin>['logger'];
  private schema: GraphQLSchema;
  constructor({ config, logger }: MeshTransformOptions<YamlConfig.HivePlugin>) {
    this.logger = logger;
    const enabled =
      // eslint-disable-next-line no-new-func
      config != null && 'enabled' in config ? new Function(`return ${config.enabled}`)() : true;

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
      enabled,
      debug: !!process.env.DEBUG,
      token,
      agent,
      usage,
      reporting,
      selfHosting: config.selfHosting,
    });
  }

  transformSchema(schema: GraphQLSchema) {
    this.hiveClient.reportSchema({ schema });
    this.schema = schema;
    return schema;
  }

  transformRequest(
    request: ExecutionRequest,
    _delegationContext: DelegationContext,
    transformationContext: TransformationContext,
  ) {
    try {
      transformationContext.collectUsageCallback = this.hiveClient.collectUsage();
      transformationContext.request = request;
    } catch (e) {
      this.logger.error(`Failed to collect usage`, e);
    }
    return request;
  }

  transformResult(
    result: ExecutionResult,
    _delegationContext: DelegationContext,
    transformationContext: TransformationContext,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- we dont really care about usage reporting result
    try {
      const typeInfo = getTypeInfo(this.schema);
      transformationContext
        .collectUsageCallback?.(
          {
            schema: this.schema,
            document: visit(
              transformationContext.request.document,
              visitWithTypeInfo(typeInfo, {
                Argument: () => {
                  if (!typeInfo.getArgument()) {
                    return null;
                  }
                },
              }),
            ),
            rootValue: transformationContext.request.rootValue,
            contextValue: transformationContext.request.context,
            variableValues: transformationContext.request.variables,
            operationName: transformationContext.request.operationName,
          },
          result,
        )
        ?.catch(e => {
          this.logger.error(`Failed to report usage`, e);
        });
    } catch (e) {
      this.logger.error(`Failed to report usage`, e);
    }
    return result;
  }
}
