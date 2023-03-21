import { GraphQLSchema } from 'graphql';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
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
  private config: YamlConfig.SoapHandler;
  private soapSDLProxy: StoreProxy<GraphQLSchema>;
  private baseDir: string;
  private importFn: ImportFn;
  private logger: Logger;

  constructor({
    config,
    store,
    baseDir,
    importFn,
    logger,
  }: MeshHandlerOptions<YamlConfig.SoapHandler>) {
    this.config = config;
    this.soapSDLProxy = store.proxy(
      'schemaWithAnnotations.graphql',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
    this.baseDir = baseDir;
    this.importFn = importFn;
    this.logger = logger;
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    let schema: GraphQLSchema;

    if (this.config.source.endsWith('.graphql')) {
      schema = await readFileOrUrl(this.config.source, {
        allowUnknownExtensions: true,
        cwd: this.baseDir,
        fetch: fetchFn,
        importFn: this.importFn,
        logger: this.logger,
      });
    } else {
      schema = await this.soapSDLProxy.getWithSet(async () => {
        const soapLoader = new SOAPLoader({
          fetch: fetchFn,
        });
        const wsdlLocation = this.config.source;
        const wsdl = await readFileOrUrl<string>(wsdlLocation, {
          allowUnknownExtensions: true,
          cwd: this.baseDir,
          fetch: fetchFn,
          importFn: this.importFn,
          logger: this.logger,
        });
        const object = await soapLoader.loadWSDL(wsdl);
        soapLoader.loadedLocations.set(wsdlLocation, object);
        return soapLoader.buildSchema();
      });
    }
    // Create executor lazily for faster startup
    let executor: Executor;
    return {
      schema,
      executor(...args) {
        if (!executor) {
          executor = createExecutorFromSchemaAST(schema, fetchFn);
        }
        return executor(...args);
      },
    };
  }
}
