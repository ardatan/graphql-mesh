import type { GraphQLSchema } from 'graphql';
import { type Logger } from '@graphql-hive/logger';
import type { StoreProxy } from '@graphql-mesh/store';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import { getInterpolatedHeadersFactory } from '@graphql-mesh/string-interpolation';
import type {
  GetMeshSourcePayload,
  ImportFn,
  MeshHandler,
  MeshHandlerOptions,
  MeshSource,
  YamlConfig,
} from '@graphql-mesh/types';
import { readFileOrUrl } from '@graphql-mesh/utils';
import type { Executor } from '@graphql-tools/utils';
import { createExecutorFromSchemaAST, SOAPLoader } from '@omnigraph/soap';
import { process } from '@graphql-mesh/cross-helpers';

export default class SoapHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.SoapHandler;
  private soapSDLProxy: StoreProxy<GraphQLSchema>;
  private baseDir: string;
  private importFn: ImportFn;
  private log: Logger;

  constructor({
    name,
    config,
    store,
    baseDir,
    importFn,
    log,
  }: MeshHandlerOptions<YamlConfig.SoapHandler>) {
    this.name = name;
    this.config = config;
    this.soapSDLProxy = store.proxy(
      'schemaWithAnnotations',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
    this.baseDir = baseDir;
    this.importFn = importFn;
    this.log = log;
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
        log: this.log,
        headers: schemaHeadersFactory({ env: process.env }),
      });
    } else {
      schema = await this.soapSDLProxy.getWithSet(async () => {
        const soapLoader = new SOAPLoader({
          subgraphName: this.name,
          fetch: fetchFn,
          log: this.log,
          cwd: this.baseDir,
          schemaHeaders: this.config.schemaHeaders,
          operationHeaders: this.config.operationHeaders,
          soapHeaders: this.config.soapHeaders,
          bodyAlias: this.config.bodyAlias,
        });
        const wsdlLocation = this.config.source;
        const wsdl = await readFileOrUrl<string>(wsdlLocation, {
          allowUnknownExtensions: true,
          cwd: this.baseDir,
          fetch: fetchFn,
          importFn: this.importFn,
          log: this.log,
          headers: schemaHeadersFactory({ env: process.env }),
        });
        // Pass wsdlLocation as the base URL so nested <wsdl:import> /
        // <xsd:import> locations resolve relative to the importing document.
        await soapLoader.loadWSDL(wsdl, wsdlLocation);
        return soapLoader.buildSchema();
      });
    }
    // Create executor lazily for faster startup
    let executor: Executor;
    const operationHeaders = this.config.operationHeaders;
    return {
      schema,
      executor(...args) {
        if (!executor) {
          executor = createExecutorFromSchemaAST(schema, fetchFn, operationHeaders);
        }
        return executor(...args);
      },
    };
  }
}
