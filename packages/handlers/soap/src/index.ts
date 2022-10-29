import {
  MeshHandlerOptions,
  MeshHandler,
  YamlConfig,
  GetMeshSourcePayload,
  ImportFn,
  Logger,
  MeshSource,
} from '@graphql-mesh/types';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { createExecutorFromSchemaAST, SOAPLoader } from '@omnigraph/soap';
import { readFileOrUrl } from '@graphql-mesh/utils';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { buildASTSchema, parse } from 'graphql';

export default class SoapHandler implements MeshHandler {
  private config: YamlConfig.SoapHandler;
  private soapSDLProxy: StoreProxy<string>;
  private baseDir: string;
  private importFn: ImportFn;
  private logger: Logger;

  constructor({ config, store, baseDir, importFn, logger }: MeshHandlerOptions<YamlConfig.SoapHandler>) {
    this.config = config;
    this.soapSDLProxy = store.proxy('schemaWithAnnotations.graphql', PredefinedProxyOptions.StringWithoutValidation);
    this.baseDir = baseDir;
    this.importFn = importFn;
    this.logger = logger;
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload): Promise<MeshSource> {
    const soapSDL = await this.soapSDLProxy.getWithSet(async () => {
      const soapLoader = new SOAPLoader({
        fetch: fetchFn,
      });
      const location = this.config.wsdl;
      const wsdl = await readFileOrUrl<string>(location, {
        allowUnknownExtensions: true,
        cwd: this.baseDir,
        fetch: fetchFn,
        importFn: this.importFn,
        logger: this.logger,
      });
      const object = await soapLoader.loadWSDL(wsdl);
      soapLoader.loadedLocations.set(location, object);
      const schema = soapLoader.buildSchema();
      return printSchemaWithDirectives(schema);
    });
    const schemaAST = parse(soapSDL);
    const executor = createExecutorFromSchemaAST(schemaAST, fetchFn);
    const schema = buildASTSchema(schemaAST);
    return {
      schema,
      executor,
    };
  }
}
