import {
  MeshHandlerOptions,
  MeshHandler,
  YamlConfig,
  GetMeshSourcePayload,
  ImportFn,
  Logger,
} from '@graphql-mesh/types';
import { PredefinedProxyOptions, StoreProxy } from '@graphql-mesh/store';
import { WSDLObject, XSDObject, SOAPLoader } from '@omnigraph/soap';
import { readFileOrUrl } from '@graphql-mesh/utils';

export default class SoapHandler implements MeshHandler {
  private config: YamlConfig.SoapHandler;
  private soapLocationCache: StoreProxy<[string, WSDLObject | XSDObject][]>;
  private baseDir: string;
  private importFn: ImportFn;
  private logger: Logger;

  constructor({ config, store, baseDir, importFn, logger }: MeshHandlerOptions<YamlConfig.SoapHandler>) {
    this.config = config;
    this.soapLocationCache = store.proxy('soapLocationCache.json', PredefinedProxyOptions.JsonWithoutValidation);
    this.baseDir = baseDir;
    this.importFn = importFn;
    this.logger = logger;
  }

  async getMeshSource({ fetchFn }: GetMeshSourcePayload) {
    const soapLocationCacheEntries = await this.soapLocationCache.get();
    const soapLoader = new SOAPLoader({
      fetch: fetchFn,
    });
    if (soapLocationCacheEntries) {
      for (const [location, object] of soapLocationCacheEntries) {
        soapLoader.loadedLocations.set(location, object);
        if ('schema' in object) {
          for (const schemaObj of object.schema) {
            await soapLoader.loadSchema(schemaObj);
          }
        }
        if ('definitions' in object) {
          for (const definitionObj of object.definitions) {
            await soapLoader.loadDefinition(definitionObj);
          }
        }
      }
    } else {
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
    }
    return {
      schema: soapLoader.buildSchema(),
    };
  }
}
