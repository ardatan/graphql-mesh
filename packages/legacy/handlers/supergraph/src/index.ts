import { DocumentNode, parse } from 'graphql';
import { process } from '@graphql-mesh/cross-helpers';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import {
  getInterpolatedHeadersFactory,
  ResolverData,
  stringInterpolator,
} from '@graphql-mesh/string-interpolation';
import {
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
import { buildHTTPExecutor, HTTPExecutorOptions } from '@graphql-tools/executor-http';
import { getStitchedSchemaFromSupergraphSdl } from '@graphql-tools/federation';

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
      });
      if (typeof res === 'string') {
        return parse(res, { noLocation: true });
      }
      return res;
    }
    return this.supergraphSdl.getWithSet(async () => {
      const sdlOrIntrospection = await readFile<string | DocumentNode>(interpolatedSource, {
        cwd: this.baseDir,
        allowUnknownExtensions: true,
        importFn: this.importFn,
        fetch: this.fetchFn,
        logger: this.logger,
      });
      if (typeof sdlOrIntrospection === 'string') {
        return parse(sdlOrIntrospection, { noLocation: true });
      }
      return sdlOrIntrospection;
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
    const schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onExecutor: ({ subgraphName, endpoint }) => {
        const subgraphConfiguration: YamlConfig.SubgraphConfiguration = subgraphConfigs.find(
          subgraphConfig => subgraphConfig.name === subgraphName,
        ) || {
          name: subgraphName,
        };
        return buildHTTPExecutor({
          endpoint,
          ...(subgraphConfiguration as any),
          fetch: fetchFn,
          headers(executorRequest) {
            const subgraphConfiguration = subgraphConfigs.find(
              subgraphConfig => subgraphConfig.name === subgraphName,
            );
            const headers = {};
            const resolverData: ResolverData = {
              root: executorRequest.rootValue,
              env: process.env,
              context: executorRequest.context,
              info: executorRequest.info,
              args: executorRequest.variables,
            };
            if (subgraphConfiguration?.operationHeaders) {
              const headersFactory = getInterpolatedHeadersFactory(
                subgraphConfiguration.operationHeaders,
              );
              Object.assign(headers, headersFactory(resolverData));
            }
            if (operationHeadersFactory) {
              Object.assign(headers, operationHeadersFactory(resolverData));
            }
          },
        } as HTTPExecutorOptions);
      },
      batch: this.config.batch == null ? true : this.config.batch,
    });
    return {
      schema,
    };
  }
}
