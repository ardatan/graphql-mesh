import { isAbsolute, join, resolve } from 'path';
import { MeshResolvedSource } from '@graphql-mesh/runtime';
import {
  getJsonSchema,
  MergerFn,
  MeshHandlerLibrary,
  MeshPubSub,
  MeshTransform,
  MeshTransformLibrary,
  YamlConfig,
} from '@graphql-mesh/types';
import { IResolvers, Source } from '@graphql-tools/utils';
import Ajv from 'ajv';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import { KeyValueCache } from 'fetchache';
import { DocumentNode } from 'graphql';
import {
  getHandler,
  getPackage,
  resolveAdditionalResolvers,
  resolveAdditionalTypeDefs,
  resolveCache,
  resolveMerger,
  resolvePubSub,
  resolveDocuments,
} from './utils';
import { stringInterpolator } from '@graphql-mesh/utils';
import { MergedTypeConfig, MergedFieldConfig } from '@graphql-tools/delegate';
import { get, set } from 'lodash';
import { FsStoreStorageAdapter, MeshStore, InMemoryStoreStorageAdapter } from '@graphql-mesh/store';
import { cwd, env } from 'process';

export type ConfigProcessOptions = {
  dir?: string;
  ignoreAdditionalResolvers?: boolean;
  importFn?: (moduleId: string) => Promise<any>;
  store?: MeshStore;
};

// TODO: deprecate this in next major release as dscussed in #1687
export async function parseConfig(
  rawConfig: YamlConfig.Config | string,
  options?: { configFormat?: 'yaml' | 'json' | 'object' } & ConfigProcessOptions
) {
  let config: YamlConfig.Config;
  const { configFormat = 'object', dir: configDir = '' } = options || {};
  const dir = isAbsolute(configDir) ? configDir : join(process.cwd(), configDir);

  switch (configFormat) {
    case 'yaml':
      config = defaultLoaders['.yaml']('.meshrc.yml', rawConfig as string);
      break;
    case 'json':
      config = defaultLoaders['.json']('.meshrc.json', rawConfig as string);
      break;
    case 'object':
      config = rawConfig as YamlConfig.Config;
      break;
  }

  return processConfig(config, { ...options, dir });
}

export type ProcessedConfig = {
  sources: MeshResolvedSource<any>[];
  transforms: MeshTransform[];
  additionalTypeDefs: DocumentNode[];
  additionalResolvers: IResolvers;
  cache: KeyValueCache<string>;
  merger: MergerFn;
  mergerType: string;
  pubsub: MeshPubSub;
  liveQueryInvalidations: YamlConfig.LiveQueryInvalidation[];
  config: YamlConfig.Config;
  documents: Source[];
};

function getDefaultMeshStore(dir = cwd()) {
  const isProd = env.NODE_ENV?.toLowerCase() === 'production';
  const storeStorageAdapter = isProd ? new FsStoreStorageAdapter() : new InMemoryStoreStorageAdapter();
  return new MeshStore(resolve(dir, '.mesh'), storeStorageAdapter, {
    /**
     * TODO:
     * `mesh start` => { readonly: true, validate: false }
     * `mesh dev` => { readonly: false, validate: true } => validation error should show a prompt for confirmation
     * `mesh validate` => { readonly: true, validate: true } => should fetch from remote and try to update
     * readonly
     */
    readonly: isProd,
    validate: false,
  });
}

export async function processConfig(
  config: YamlConfig.Config,
  options?: ConfigProcessOptions
): Promise<ProcessedConfig> {
  const {
    dir,
    ignoreAdditionalResolvers = false,
    importFn = (moduleId: string) => import(moduleId),
    store: providedStore,
  } = options || {};

  await Promise.all(config.require?.map(mod => importFn(mod)) || []);

  const rootStore = providedStore || getDefaultMeshStore(dir);

  const cache = await resolveCache(config.cache, importFn, rootStore);
  const pubsub = await resolvePubSub(config.pubsub, importFn);

  const sourcesStore = rootStore.child('sources');

  const [sources, transforms, additionalTypeDefs, additionalResolvers, merger, documents] = await Promise.all([
    Promise.all(
      config.sources.map<Promise<MeshResolvedSource>>(async source => {
        const handlerName = Object.keys(source.handler)[0];
        const handlerConfig = source.handler[handlerName];
        const [handlerLibrary, transforms] = await Promise.all([
          getHandler(handlerName, importFn),
          Promise.all(
            (source.transforms || []).map(async t => {
              const transformName = Object.keys(t)[0];
              const transformConfig = t[transformName];
              const TransformCtor = await getPackage<MeshTransformLibrary>(
                transformName.toString(),
                'transform',
                importFn
              );

              return new TransformCtor({
                apiName: source.name,
                config: transformConfig,
                baseDir: dir,
                cache,
                pubsub,
              });
            })
          ),
        ]);

        const HandlerCtor: MeshHandlerLibrary = handlerLibrary;

        const mergedTypeConfigMap: Record<string, MergedTypeConfig> = {};
        for (const mergedTypeConfigRaw of source.typeMerging || []) {
          mergedTypeConfigMap[mergedTypeConfigRaw.typeName] = {
            fieldName: mergedTypeConfigRaw.fieldName,
            args:
              mergedTypeConfigRaw.args &&
              ((root: any) => {
                if (typeof mergedTypeConfigRaw.args === 'string') {
                  return stringInterpolator.parse(mergedTypeConfigRaw.args, { root });
                }
                const returnObj: any = {};
                for (const argName in mergedTypeConfigRaw.args) {
                  set(returnObj, argName, stringInterpolator.parse(mergedTypeConfigRaw.args[argName], { root }));
                }
                return returnObj;
              }),
            argsFromKeys:
              mergedTypeConfigRaw.argsFromKeys &&
              ((keys: any) => {
                if (typeof mergedTypeConfigRaw.argsFromKeys === 'string') {
                  return stringInterpolator.parse(mergedTypeConfigRaw.argsFromKeys, { keys });
                }
                const returnObj: any = {};
                for (const argName in mergedTypeConfigRaw.argsFromKeys) {
                  set(
                    returnObj,
                    argName,
                    stringInterpolator.parse(mergedTypeConfigRaw.argsFromKeys[argName], { keys })
                  );
                }
                return returnObj;
              }),
            selectionSet: mergedTypeConfigRaw.selectionSet,
            fields: mergedTypeConfigRaw.fields?.reduce(
              (prev, curr) => ({
                ...prev,
                [curr.fieldName]: curr,
              }),
              {} as Record<string, MergedFieldConfig>
            ),
            key:
              mergedTypeConfigRaw.key &&
              ((root: any) => {
                if (typeof mergedTypeConfigRaw.key === 'string') {
                  return stringInterpolator.parse(mergedTypeConfigRaw.key, { root });
                }
                const returnObj: any = {};
                for (const argName in mergedTypeConfigRaw.args) {
                  set(returnObj, argName, stringInterpolator.parse(mergedTypeConfigRaw.key[argName], { root }));
                }
                return returnObj;
              }),
            canonical: mergedTypeConfigRaw.canonical,
            resolve:
              mergedTypeConfigRaw.resolve &&
              (async (root: any, args: any, context: any, info: any) => {
                if (typeof mergedTypeConfigRaw.resolve === 'string') {
                  const filePath = mergedTypeConfigRaw.resolve;

                  const exported = await importFn(resolve(options.dir, filePath));
                  return exported.default || exported;
                } else if (typeof mergedTypeConfigRaw.resolve === 'object' && 'args' in mergedTypeConfigRaw.resolve) {
                  const resolverData = { root, args, context, info };
                  const methodArgs: any = {};
                  for (const argPath in mergedTypeConfigRaw.resolve.args) {
                    set(
                      methodArgs,
                      argPath,
                      stringInterpolator.parse(mergedTypeConfigRaw.resolve.args[argPath], resolverData)
                    );
                  }
                  const result = await context[mergedTypeConfigRaw.resolve.targetSource].api[
                    mergedTypeConfigRaw.resolve.targetMethod
                  ](methodArgs, {
                    selectedFields: mergedTypeConfigRaw.resolve.resultSelectedFields,
                    selectionSet: mergedTypeConfigRaw.resolve.resultSelectionSet,
                    depth: mergedTypeConfigRaw.resolve.resultDepth,
                  });
                  return mergedTypeConfigRaw.resolve.returnData
                    ? get(result, mergedTypeConfigRaw.resolve.returnData)
                    : result;
                }
              }),
          };
        }

        return {
          name: source.name,
          handler: new HandlerCtor({
            name: source.name,
            config: handlerConfig,
            baseDir: dir,
            cache,
            pubsub,
            store: sourcesStore.child(source.name),
          }),
          transforms,
        };
      })
    ),
    Promise.all(
      config.transforms?.map(async t => {
        const transformName = Object.keys(t)[0] as keyof YamlConfig.Transform;
        const transformConfig = t[transformName];
        const TransformLibrary = await getPackage<MeshTransformLibrary>(
          transformName.toString(),
          'transform',
          importFn
        );
        return new TransformLibrary({
          apiName: '',
          config: transformConfig,
          baseDir: dir,
          cache,
          pubsub,
        });
      }) || []
    ),
    resolveAdditionalTypeDefs(dir, config.additionalTypeDefs),
    resolveAdditionalResolvers(
      dir,
      ignoreAdditionalResolvers ? [] : config.additionalResolvers || [],
      importFn,
      pubsub
    ),
    resolveMerger(config.merger, importFn),
    resolveDocuments(config.documents, dir),
  ]);

  return {
    sources,
    transforms,
    additionalTypeDefs,
    additionalResolvers,
    cache,
    merger,
    mergerType: config.merger,
    pubsub,
    liveQueryInvalidations: config.liveQueryInvalidations,
    config,
    documents,
  };
}

function customLoader(ext: 'json' | 'yaml' | 'js') {
  function loader(filepath: string, content: string) {
    if (typeof process !== 'undefined' && 'env' in process) {
      content = content.replace(/\$\{(.*?)\}/g, (_, variable) => {
        let varName = variable;
        let defaultValue = '';

        if (variable.includes(':')) {
          const spl = variable.split(':');
          varName = spl.shift();
          defaultValue = spl.join(':');
        }

        return process.env[varName] || defaultValue;
      });
    }

    if (ext === 'json') {
      return defaultLoaders['.json'](filepath, content);
    }

    if (ext === 'yaml') {
      return defaultLoaders['.yaml'](filepath, content);
    }

    if (ext === 'js') {
      return defaultLoaders['.js'](filepath, content);
    }
  }

  return loader;
}

export function validateConfig(config: any): asserts config is YamlConfig.Config {
  const ajv = new Ajv({
    strict: false,
  });
  const jsonSchema = getJsonSchema();
  jsonSchema.$schema = undefined;
  const isValid = ajv.validate(jsonSchema, config);
  if (!isValid) {
    console.warn(`GraphQL Mesh Configuration is not valid:\n${ajv.errorsText()}`);
  }
}

export async function findAndParseConfig(options?: { configName?: string } & ConfigProcessOptions) {
  const { configName = 'mesh', dir: configDir = '', ignoreAdditionalResolvers = false, ...restOptions } = options || {};
  const dir = isAbsolute(configDir) ? configDir : join(process.cwd(), configDir);
  const explorer = cosmiconfig(configName, {
    loaders: {
      '.json': customLoader('json'),
      '.yaml': customLoader('yaml'),
      '.yml': customLoader('yaml'),
      '.js': customLoader('js'),
      noExt: customLoader('yaml'),
    },
  });
  const results = await explorer.search(dir);

  if (!results) {
    throw new Error(`No mesh config file was found in "${dir}"!`);
  }

  const config = results.config;
  validateConfig(config);
  return processConfig(config, { dir, ignoreAdditionalResolvers, ...restOptions });
}
