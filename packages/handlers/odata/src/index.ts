import {
  YamlConfig,
  ResolverData,
  MeshHandler,
  GetMeshSourceOptions,
  MeshSource,
  KeyValueCache,
  ImportFn,
} from '@graphql-mesh/types';
import {
  parseInterpolationStrings,
  getInterpolatedHeadersFactory,
  readFileOrUrlWithCache,
  getCachedFetch,
  loadFromModuleExportExpression,
  stringInterpolator,
} from '@graphql-mesh/utils';
import urljoin from 'url-join';
import { EventEmitter } from 'events';
import { parse as parseXML } from 'fast-xml-parser';
import { pruneSchema } from '@graphql-tools/utils';
import { PredefinedProxyOptions } from '@graphql-mesh/store';
import { env } from 'process';
import { getDataLoaderFactory } from './request-processing';
import { buildGraphQLSchema } from "./schema-builder";


export default class ODataHandler implements MeshHandler {
  private name: string;
  private config: YamlConfig.ODataHandler;
  private baseDir: string;
  private cache: KeyValueCache;
  private eventEmitterSet = new Set<EventEmitter>();
  private metadataJson: any;
  private importFn: ImportFn;

  constructor({ name, config, baseDir, cache, store, importFn }: GetMeshSourceOptions<YamlConfig.ODataHandler>) {
    this.name = name;
    this.config = config;
    this.baseDir = baseDir;
    this.cache = cache;
    this.metadataJson = store.proxy('metadata.json', PredefinedProxyOptions.JsonWithoutValidation);
    this.importFn = importFn;
  }

  async getCachedMetadataJson(fetch: ReturnType<typeof getCachedFetch>) {
    return this.metadataJson.getWithSet(async () => {
      const baseUrl = stringInterpolator.parse(this.config.baseUrl, {
        env,
      });
      const metadataUrl = urljoin(baseUrl, '$metadata');
      const metadataText = await readFileOrUrlWithCache<string>(this.config.metadata || metadataUrl, this.cache, {
        allowUnknownExtensions: true,
        cwd: this.baseDir,
        headers: this.config.schemaHeaders,
        fetch,
      });

      return parseXML(metadataText, {
        attributeNamePrefix: '',
        attrNodeName: 'attributes',
        textNodeName: 'innerText',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        arrayMode: true,
        allowBooleanAttributes: true,
      });
    });
  }

  async getMeshSource(): Promise<MeshSource> {
    let fetch: ReturnType<typeof getCachedFetch>;
    if (this.config.customFetch) {
      fetch =
        typeof this.config.customFetch === 'string'
          ? await loadFromModuleExportExpression<ReturnType<typeof getCachedFetch>>(this.config.customFetch, {
              cwd: this.baseDir,
              importFn: this.importFn,
              defaultExportName: 'default',
            })
          : this.config.customFetch;
    } else {
      fetch = getCachedFetch(this.cache);
    }

    const { baseUrl: nonInterpolatedBaseUrl, operationHeaders } = this.config;
    const baseUrl = stringInterpolator.parse(nonInterpolatedBaseUrl, {
      env,
    });

    const metadataJson = await this.getCachedMetadataJson(fetch);
    const contextDataloaderName = Symbol(`${this.name}DataLoader`);

    const origHeadersFactory = getInterpolatedHeadersFactory(operationHeaders);
    const headersFactory = (resolverData: ResolverData, method: string) => {
      const headers = origHeadersFactory(resolverData);
      if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
      }
      if (!headers.has('Content-Type') && method !== 'GET') {
        headers.set('Content-Type', 'application/json');
      }
      return headers;
    };
    const { args: commonArgs, contextVariables } = parseInterpolationStrings([
      ...Object.values(operationHeaders || {}),
      baseUrl,
    ]);

    const dataLoaderFactory = getDataLoaderFactory(this.config.batch || 'none', baseUrl, env, headersFactory, fetch);

    const schema = buildGraphQLSchema({
      metadataJson,
      commonArgs,
      contextVariables,
      contextDataloaderName,
      headersFactory,
      config: this.config,
      env,
      baseUrl,
      eventEmitterSet: this.eventEmitterSet
    });

    this.eventEmitterSet.forEach(ee => ee.removeAllListeners());
    this.eventEmitterSet.clear();

    return {
      schema: pruneSchema(schema),
      contextVariables,
      contextBuilder: async context => ({
        [contextDataloaderName]: dataLoaderFactory(context),
      }),
    };
  }
}
