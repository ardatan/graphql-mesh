import type { DocumentNode, EnumTypeDefinitionNode } from 'graphql';
import { parse } from 'graphql';
import { process } from '@graphql-mesh/cross-helpers';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import {
  getInterpolatedHeadersFactory,
  getInterpolatedStringFactory,
  stringInterpolator,
} from '@graphql-mesh/string-interpolation';
import type {
  GetMeshSourcePayload,
  ImportFn,
  Logger,
  MeshFetch,
  MeshHandler,
  MeshHandlerOptions,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { isUrl, readFile, readUrl } from '@graphql-mesh/utils';
import { getStitchedSchemaFromSupergraphSdl } from '@graphql-tools/federation';
import type { SubscriptionProtocol } from '@graphql-tools/url-loader';
import { UrlLoader } from '@graphql-tools/url-loader';
import type { ExecutionRequest } from '@graphql-tools/utils';
import { memoize1 } from '@graphql-tools/utils';

export default class SupergraphHandler implements MeshHandler {
  private config: YamlConfig.Handler['supergraph'];
  private baseDir: string;
  private supergraphSdl: StoreProxy<DocumentNode>;
  private importFn: ImportFn;
  private fetchFn: MeshFetch;
  private logger: Logger;

  constructor({
    config,
    baseDir,
    store,
    importFn,
    logger,
  }: MeshHandlerOptions<YamlConfig.Handler['supergraph']>) {
    this.config = config;
    this.baseDir = baseDir;
    this.supergraphSdl = store.proxy(
      'nonExecutableSchema',
      PredefinedProxyOptions.JsonWithoutValidation,
    );
    this.importFn = importFn;
    this.logger = logger;
  }

  private async getSupergraphSdl(): Promise<DocumentNode> {
    const schemaHeadersFactory = getInterpolatedHeadersFactory(this.config.schemaHeaders);
    const interpolatedSource = stringInterpolator.parse(this.config.source, {
      env: process.env,
    });
    if (isUrl(interpolatedSource)) {
      const res = await readUrl<DocumentNode | string>(interpolatedSource, {
        headers: schemaHeadersFactory({
          env: process.env,
        }),
        cwd: this.baseDir,
        allowUnknownExtensions: true,
        importFn: this.importFn,
        fetch: this.fetchFn,
        logger: this.logger,
      }).catch(e => {
        throw new Error(`Failed to load supergraph SDL from ${interpolatedSource}:\n ${e.message}`);
      });
      return handleSupergraphResponse(res, interpolatedSource);
    }
    return this.supergraphSdl.getWithSet(async () => {
      const sdlOrIntrospection = await readFile<string | DocumentNode>(interpolatedSource, {
        headers: schemaHeadersFactory({
          env: process.env,
        }),
        cwd: this.baseDir,
        allowUnknownExtensions: true,
        importFn: this.importFn,
        fetch: this.fetchFn,
        logger: this.logger,
      }).catch(e => {
        throw new Error(`Failed to load supergraph SDL from ${interpolatedSource}:\n ${e.message}`);
      });
      return handleSupergraphResponse(sdlOrIntrospection, interpolatedSource);
    });
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    const subgraphConfigs = this.config.subgraphs || [];
    this.fetchFn = fetchFn;
    const supergraphSdl = await this.getSupergraphSdl();
    const operationHeadersFactory =
      this.config.operationHeaders != null
        ? getInterpolatedHeadersFactory(this.config.operationHeaders)
        : undefined;
    const joingraphEnum = supergraphSdl.definitions.find(
      def => def.kind === 'EnumTypeDefinition' && def.name.value === 'join__Graph',
    ) as EnumTypeDefinitionNode;
    const subgraphNameIdMap = new Map<string, string>();
    if (joingraphEnum) {
      joingraphEnum.values?.forEach(value => {
        value.directives?.forEach(directive => {
          if (directive.name.value === 'join__graph') {
            const nameArg = directive.arguments?.find(arg => arg.name.value === 'name');
            if (nameArg?.value?.kind === 'StringValue') {
              subgraphNameIdMap.set(value.name.value, nameArg.value.value);
            }
          }
        });
      });
    }
    const urlLoader = new UrlLoader();
    const schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onSubschemaConfig(subschemaConfig) {
        const subgraphName = subschemaConfig.name;
        let nonInterpolatedEndpoint = subschemaConfig.endpoint;
        const subgraphRealName = subgraphNameIdMap.get(subgraphName);
        const subgraphConfiguration: YamlConfig.SubgraphConfiguration = subgraphConfigs.find(
          subgraphConfig => subgraphConfig.name === subgraphRealName,
        ) || {
          name: subgraphName,
        };
        nonInterpolatedEndpoint = subgraphConfiguration.endpoint || nonInterpolatedEndpoint;
        const endpointFactory = getInterpolatedStringFactory(nonInterpolatedEndpoint);
        const connectionParamsFactory = getInterpolatedHeadersFactory(
          subgraphConfiguration.connectionParams,
        );

        const subscriptionsEndpoint = subgraphConfiguration.subscriptionsEndpoint
          ? stringInterpolator.parse(subgraphConfiguration.subscriptionsEndpoint, {
              env: process.env,
            })
          : undefined;

        const subgraphExecutor = urlLoader.getExecutorAsync(nonInterpolatedEndpoint, {
          ...subgraphConfiguration,
          subscriptionsEndpoint,
          subscriptionsProtocol:
            subgraphConfiguration.subscriptionsProtocol as SubscriptionProtocol,
          customFetch: fetchFn,
        });
        const subgraphOperationHeadersFactory =
          subgraphConfiguration.operationHeaders != null
            ? getInterpolatedHeadersFactory(subgraphConfiguration.operationHeaders)
            : undefined;
        subschemaConfig.executor = function subgraphExecutorWithInterpolations(params) {
          const resolverData = getResolverData(params);
          let headers: Record<string, string>;
          if (operationHeadersFactory) {
            headers = operationHeadersFactory(resolverData);
          }
          if (subgraphOperationHeadersFactory) {
            const subgraphHeaders = subgraphOperationHeadersFactory(resolverData);
            if (headers) {
              Object.assign(headers, subgraphHeaders);
            } else {
              headers = subgraphHeaders;
            }
          }
          return subgraphExecutor({
            ...params,
            extensions: {
              ...(params.extensions || {}),
              headers,
              connectionParams: connectionParamsFactory(resolverData),
              endpoint: endpointFactory(resolverData),
            },
          });
        };
      },
      batch: this.config.batch == null ? true : this.config.batch,
    });
    return {
      schema,
    };
  }
}

function handleSupergraphResponse(
  sdlOrDocumentNode: string | DocumentNode,
  interpolatedSource: string,
) {
  if (typeof sdlOrDocumentNode === 'string') {
    try {
      return parse(sdlOrDocumentNode, { noLocation: true });
    } catch (e) {
      throw new Error(
        `Supergraph source must be a valid GraphQL SDL string or a parsed DocumentNode, but got an invalid result from ${interpolatedSource} instead.\n Got result: ${sdlOrDocumentNode}\n Got error: ${e.message}`,
      );
    }
  }
  if (sdlOrDocumentNode?.kind !== 'Document') {
    throw new Error(
      `Supergraph source must be a valid GraphQL SDL string or a parsed DocumentNode, but got an invalid result from ${interpolatedSource} instead.\n Got result: ${JSON.stringify(sdlOrDocumentNode, null, 2)}`,
    );
  }
  return sdlOrDocumentNode;
}

const getResolverData = memoize1(function getResolverData(params: ExecutionRequest) {
  return {
    root: params.rootValue,
    args: params.variables,
    context: params.context,
    env: process.env,
  };
});
