import { GraphQLSchema } from 'graphql';
import { process } from '@graphql-mesh/cross-helpers';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import {
  GetMeshSourcePayload,
  ImportFn,
  Logger,
  MeshHandler,
  MeshHandlerOptions,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { Executor } from '@graphql-tools/utils';
import { createExecutorFromSchemaAST, SOAPLoader } from '@omnigraph/soap';

export default class SoapHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.SoapHandler;
  private soapSDLProxy: StoreProxy<GraphQLSchema>;
  private baseDir: string;
  private importFn: ImportFn;
  private logger: Logger;

  constructor({
    name,
    config,
    store,
    baseDir,
    importFn,
    logger,
  }: MeshHandlerOptions<YamlConfig.SoapHandler>) {
    this.name = name;
    this.config = config;
    this.soapSDLProxy = store.proxy(
      'schemaWithAnnotations',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
    this.baseDir = baseDir;
    this.importFn = importFn;
    this.logger = logger;
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    let schema: GraphQLSchema;

    const schemaHeadersFactory = getInterpolatedHeadersFactory(this.config.schemaHeaders);
    if (this.config.source.endsWith('.graphql')) {
      schema = await readFileOrUrl(this.config.source, {
        allowUnknownExtensions: true,
        cwd: this.baseDir,
        fetch: fetchFn,
        importFn: this.importFn,
        logger: this.logger,
        headers: schemaHeadersFactory({ env: process.env }),
      });
    } else {
      schema = await this.soapSDLProxy.getWithSet(async () => {
        const soapLoader = new SOAPLoader({
          subgraphName: this.name,
          fetch: fetchFn,
          schemaHeaders: this.config.schemaHeaders,
          operationHeaders: this.config.operationHeaders,
        });
        const wsdlLocation = this.config.source;
        const wsdl = await readFileOrUrl<string>(wsdlLocation, {
          allowUnknownExtensions: true,
          cwd: this.baseDir,
          fetch: fetchFn,
          importFn: this.importFn,
          logger: this.logger,
          headers: schemaHeadersFactory({ env: process.env }),
        });
        const object = await soapLoader.loadWSDL(wsdl);
        soapLoader.loadedLocations.set(wsdlLocation, object);
        return soapLoader.buildSchema();
      });
    }
    // Create executor lazily for faster startup
    let executor: Executor;
    const operationHeaders = this.config.operationHeaders;
    const subgraphName = this.name;
    return {
      schema,
      executor(...args) {
        if (!executor) {
          executor = createExecutorFromSchemaAST(schema, fetchFn, operationHeaders, subgraphName);
        }
        return executor(...args);
      },
    };
  }
}
