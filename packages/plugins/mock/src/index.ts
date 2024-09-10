import faker from 'faker';
import type { GraphQLFieldResolver, GraphQLResolveInfo, GraphQLSchema } from 'graphql';
import { execute } from 'graphql';
import { mocks as graphqlScalarsMocks } from 'graphql-scalars';
import { getInterpolatedStringFactory } from '@graphql-mesh/string-interpolation';
import type { ImportFn, MeshPlugin, MeshPluginOptions, YamlConfig } from '@graphql-mesh/types';
import { loadFromModuleExportExpression } from '@graphql-mesh/utils';
import type { IMocks } from '@graphql-tools/mock';
import { addMocksToSchema, createMockStore } from '@graphql-tools/mock';

const mockedSchemas = new WeakSet<GraphQLSchema>();

export default function useMock(
  config: YamlConfig.MockingConfig & {
    baseDir?: string;
    importFn?: ImportFn;
  },
): MeshPlugin<{}> {
  // eslint-disable-next-line no-new-func
  const configIf = config != null && 'if' in config ? new Function(`return ${config.if}`)() : true;

  if (configIf) {
    return {
      onSchemaChange({ schema, replaceSchema }) {
        if (mockedSchemas.has(schema)) {
          return;
        }
        const mocks: IMocks = {
          ...graphqlScalarsMocks,
        };
        const resolvers: any = {};
        const typeMap = schema.getTypeMap();
        for (const typeName in typeMap) {
          const type = typeMap[typeName];
          const examples = type.extensions.examples as any[];
          if (examples?.length) {
            mocks[typeName] = () => examples[Math.floor(Math.random() * examples.length)];
          }
        }
        if (config?.mocks?.length) {
          for (const fieldConfig of config.mocks) {
            const fieldConfigIf = 'if' in fieldConfig ? fieldConfig.if : true;
            if (fieldConfigIf) {
              const [typeName, fieldName] = fieldConfig.apply.split('.');
              if (fieldName) {
                if (fieldConfig.faker) {
                  let fakerFn: Function; // eslint-disable-line
                  const [service, method] = fieldConfig.faker.split('.');
                  if (service in faker) {
                    fakerFn = () => (faker as any)[service][method]();
                  } else {
                    fakerFn = () => faker.fake(fieldConfig.faker || '');
                  }
                  resolvers[typeName] = resolvers[typeName] || {};
                  resolvers[typeName][fieldName] = fakerFn;
                } else if (fieldConfig.custom) {
                  const exportedVal$ = loadFromModuleExportExpression<any>(fieldConfig.custom, {
                    cwd: config.baseDir,
                    defaultExportName: 'default',
                    importFn: config.importFn,
                  });
                  resolvers[typeName] = resolvers[typeName] || {};
                  resolvers[typeName][fieldName] = (
                    root: any,
                    args: any,
                    context: any,
                    info: GraphQLResolveInfo,
                  ) => {
                    context = context || {};
                    context.mockStore = store;
                    return exportedVal$.then(exportedVal =>
                      typeof exportedVal === 'function'
                        ? exportedVal(root, args, context, info)
                        : exportedVal,
                    );
                  };
                } else if ('length' in fieldConfig) {
                  resolvers[typeName] = resolvers[typeName] || {};
                  resolvers[typeName][fieldName] = () => new Array(fieldConfig.length).fill({});
                } else if ('updateStore' in fieldConfig) {
                  const getFromStoreKeyFactory = getInterpolatedStringFactory(
                    fieldConfig.store.key,
                  );
                  const updateStoreFactories = fieldConfig.updateStore.map(updateStoreConfig => ({
                    updateStoreConfig,
                    keyFactory: getInterpolatedStringFactory(updateStoreConfig.key),
                    valueFactory: getInterpolatedStringFactory(updateStoreConfig.value),
                  }));
                  resolvers[typeName] = resolvers[typeName] || {};
                  resolvers[typeName][fieldName] = (
                    root: any,
                    args: any,
                    context: any,
                    info: GraphQLResolveInfo,
                  ) => {
                    const resolverData = {
                      root,
                      args,
                      context,
                      info,
                      random: Date.now().toString(),
                      env: process.env,
                    };
                    updateStoreFactories.forEach(
                      ({ updateStoreConfig, keyFactory, valueFactory }) => {
                        const key = keyFactory(resolverData);
                        const value = valueFactory(resolverData);
                        store.set(updateStoreConfig.type, key, updateStoreConfig.fieldName, value);
                      },
                    );
                    const key = getFromStoreKeyFactory(resolverData);
                    return store.get(fieldConfig.store.type, key, fieldConfig.store.fieldName);
                  };
                } else if ('store' in fieldConfig) {
                  const keyFactory = getInterpolatedStringFactory(fieldConfig.store.key);
                  resolvers[typeName] = resolvers[typeName] || {};
                  resolvers[typeName][fieldName] = (
                    root: any,
                    args: any,
                    context: any,
                    info: GraphQLResolveInfo,
                  ) => {
                    const key = keyFactory({ root, args, context, info, env: process.env });
                    return store.get(fieldConfig.store.type, key, fieldConfig.store.fieldName);
                  };
                }
              } else {
                if (fieldConfig.faker) {
                  let fakerFn: GraphQLFieldResolver<any, any, { [argName: string]: any }>;
                  const [service, method] = fieldConfig.faker.split('.');
                  if (service in faker) {
                    fakerFn = () => (faker as any)[service][method]();
                  } else {
                    fakerFn = () => faker.fake(fieldConfig.faker || '');
                  }
                  mocks[typeName] = fakerFn;
                } else if (fieldConfig.custom) {
                  const exportedVal$ = loadFromModuleExportExpression<any>(fieldConfig.custom, {
                    cwd: config.baseDir,
                    defaultExportName: 'default',
                    importFn: config.importFn,
                  });
                  mocks[typeName] = () => {
                    return exportedVal$.then(exportedVal =>
                      typeof exportedVal === 'function' ? exportedVal(store) : exportedVal,
                    );
                  };
                }
              }
            }
          }
        }
        const store = createMockStore({ schema, mocks });
        if (config?.initializeStore) {
          const initializeStoreFn$ = loadFromModuleExportExpression(config.initializeStore, {
            cwd: config.baseDir,
            defaultExportName: 'default',
            importFn: config.importFn,
          });
          // eslint-disable-next-line no-void
          void initializeStoreFn$.then(fn => fn(store));
        }
        const mockedSchema = addMocksToSchema({
          schema,
          store,
          mocks,
          resolvers,
          preserveResolvers: config?.preserveResolvers,
        });
        mockedSchemas.add(mockedSchema);
        replaceSchema(mockedSchema);
      },
      onExecute({ setExecuteFn }) {
        setExecuteFn(execute);
      },
    };
  }

  return {};
}
