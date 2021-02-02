import { readFileSync } from 'fs';
import {
  GetMeshSourceOptions,
  MeshHandler,
  MeshSource,
  MeshSourceArgs,
  RawSource,
  ResolverData,
  YamlConfig,
  MeshPubSub,
} from '@graphql-mesh/types';
import { fetchache, KeyValueCache, Request } from 'fetchache';
import { UrlLoader } from '@graphql-tools/url-loader';
import { GraphQLSchema, buildClientSchema, introspectionFromSchema, buildSchema } from 'graphql';
import { introspectSchema } from '@graphql-tools/wrap';
import {
  isUrl,
  getInterpolatedHeadersFactory,
  ResolverDataBasedFactory,
  getHeadersObject,
  loadFromModuleExportExpression,
  getInterpolatedStringFactory,
} from '@graphql-mesh/utils';
import { ExecutionParams, AsyncExecutor } from '@graphql-tools/delegate';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

interface GraphQLHandlerMeshSourceArgs extends MeshSourceArgs {
  rawSDLOnly: boolean;
}
export default class GraphQLHandler implements MeshHandler {
  config: YamlConfig.GraphQLHandler;
  cache: KeyValueCache<any>;
  pubsub: MeshPubSub;
  private name: string;
  private rawSourceFormat: string;

  constructor({ name, config, cache }: GetMeshSourceOptions<YamlConfig.GraphQLHandler>) {
    this.name = name;
    this.config = config;
    this.cache = cache;
    this.rawSourceFormat = 'graphql';
  }

  async getRawSource(): Promise<RawSource> {
    const path = this.config.endpoint;

    if (!isUrl(path)) return null; // only process remote sources

    const { schema } = await this.getMeshSource({ rawSDLOnly: true });

    return {
      source: printSchemaWithDirectives(schema),
      format: this.rawSourceFormat,
    };
  }

  async getMeshSource({ rawSourcesDir, rawSDLOnly }: GraphQLHandlerMeshSourceArgs): Promise<MeshSource> {
    const path = this.config.endpoint;

    if (path.endsWith('.js') || path.endsWith('.ts')) {
      const schema = await loadFromModuleExportExpression<GraphQLSchema>(path);
      return {
        schema,
      };
    } else if (path.endsWith('.graphql')) {
      const rawSDL = await loadFromModuleExportExpression<string>(path);
      const schema = buildSchema(rawSDL);
      return {
        schema,
      };
    }
    const urlLoader = new UrlLoader();
    const customFetch: WindowOrWorkerGlobalScope['fetch'] = (...args) =>
      fetchache(args[0] instanceof Request ? args[0] : new Request(...args), this.cache);
    const getExecutorAndSubscriberForParams = (
      params: ExecutionParams,
      headersFactory: ResolverDataBasedFactory<Headers>,
      endpointFactory: ResolverDataBasedFactory<string>
    ) => {
      const resolverData: ResolverData = {
        root: {},
        args: params.variables,
        context: params.context,
      };
      const headers = getHeadersObject(headersFactory(resolverData));
      const endpoint = endpointFactory(resolverData);
      return urlLoader.getExecutorAndSubscriberAsync(endpoint, {
        customFetch: customFetch as any,
        ...this.config,
        headers,
      });
    };
    let schema: GraphQLSchema;
    let schemaHeaders =
      typeof this.config.schemaHeaders === 'string'
        ? await loadFromModuleExportExpression(this.config.schemaHeaders)
        : this.config.schemaHeaders;
    if (typeof schemaHeaders === 'function') {
      schemaHeaders = schemaHeaders();
    }
    if (schemaHeaders && 'then' in schemaHeaders) {
      schemaHeaders = await schemaHeaders;
    }
    const schemaHeadersFactory = getInterpolatedHeadersFactory(schemaHeaders || {});
    const introspectionExecutor: AsyncExecutor = async (params): Promise<any> => {
      const { executor } = await getExecutorAndSubscriberForParams(params, schemaHeadersFactory, () => path);
      return executor(params);
    };
    if (rawSourcesDir && isUrl(path)) {
      const rawSourceFile = `${rawSourcesDir}/${this.name}.${this.rawSourceFormat}`;
      const rawSourceSchema = rawSourceFile && readFileSync(rawSourceFile, 'utf8');
      schema = buildSchema(rawSourceSchema);
    } else if (this.config.introspection) {
      const result = await urlLoader.handleSDLAsync(this.config.introspection, {
        customFetch: customFetch as any,
        ...this.config,
        headers: schemaHeaders,
      });
      schema = result.schema;
    } else if (this.config.cacheIntrospection) {
      const cacheKey = this.name + '_introspection';
      const introspectionData: any = await this.cache.get(cacheKey);
      if (introspectionData) {
        schema = buildClientSchema(introspectionData);
      } else {
        schema = await introspectSchema(introspectionExecutor);
        const ttl = typeof this.config.cacheIntrospection === 'object' && this.config.cacheIntrospection.ttl;
        const introspection = introspectionFromSchema(schema);
        this.cache.set(cacheKey, introspection, { ttl });
      }
    } else {
      schema = await introspectSchema(introspectionExecutor);
    }

    if (rawSDLOnly) {
      return { schema };
    }

    const operationHeadersFactory = getInterpolatedHeadersFactory(this.config.operationHeaders);
    const endpointFactory = getInterpolatedStringFactory(path);
    return {
      schema,
      executor: async params => {
        const { executor } = await getExecutorAndSubscriberForParams(params, operationHeadersFactory, endpointFactory);
        return executor(params) as any;
      },
      subscriber: async params => {
        const { subscriber } = await getExecutorAndSubscriberForParams(
          params,
          operationHeadersFactory,
          endpointFactory
        );
        return subscriber(params);
      },
      batch: 'batch' in this.config ? this.config.batch : true,
    };
  }
}
