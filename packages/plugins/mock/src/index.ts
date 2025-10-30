/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import faker from 'faker';
import type { GraphQLFieldResolver, GraphQLResolveInfo, GraphQLSchema } from 'graphql';
import { mocks as graphqlScalarsMocks } from 'graphql-scalars';
import { getInterpolatedStringFactory } from '@graphql-mesh/string-interpolation';
import type { ImportFn, MeshPlugin, YamlConfig } from '@graphql-mesh/types';
import { loadFromModuleExportExpression, mapMaybePromise } from '@graphql-mesh/utils';
import { normalizedExecutor } from '@graphql-tools/executor';
import {
  addMocksToSchema,
  createMockStore,
  MockStore,
  type IMocks,
  type IMockStore,
} from '@graphql-tools/mock';
import { memoize1 } from '@graphql-tools/utils';

interface MockingFieldConfig extends YamlConfig.MockingFieldConfig {
  custom?:
    | string
    | GraphQLFieldResolver<
        any,
        {
          mockStore: IMockStore;
          [argName: string]: any;
        }
      >;
}

export default function useMock(
  config: Omit<YamlConfig.MockingConfig, 'mocks' | 'initializeStore' | 'if'> & {
    if?: string | boolean | (() => boolean);
    baseDir?: string;
    importFn?: ImportFn;
    store?: IMockStore;
    initializeStore?: string | ((store: IMockStore) => void | Promise<void>);
    mocks?: MockingFieldConfig[];
  },
): MeshPlugin<{
  mockStore: IMockStore;
}> {
  // eslint-disable-next-line no-new-func
  let configIf = true;
  if (config?.if != null) {
    if (typeof config.if === 'function') {
      configIf = config.if();
    } else if (typeof config.if === 'string') {
      // eslint-disable-next-line no-new-func
      configIf = new Function(`return ${config.if}`)();
    } else {
      configIf = Boolean(config.if);
    }
  }

  if (configIf) {
    let mockStore: IMockStore;
    let init$: Promise<void> | void | undefined;
    const mockSchema = memoize1(function mockSchema(schema: GraphQLSchema) {
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
              } else if (
                typeof fieldConfig.custom === 'string' &&
                fieldConfig.custom.includes('#')
              ) {
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
                  return exportedVal$.then(exportedVal =>
                    typeof exportedVal === 'function'
                      ? exportedVal(root, args, context, info)
                      : exportedVal,
                  );
                };
              } else if (typeof fieldConfig.custom === 'function') {
                resolvers[typeName] = resolvers[typeName] || {};
                resolvers[typeName][fieldName] = fieldConfig.custom;
              } else if (fieldConfig.custom != null) {
                resolvers[typeName] = resolvers[typeName] || {};
                resolvers[typeName][fieldName] = () => fieldConfig.custom;
              } else if ('length' in fieldConfig) {
                resolvers[typeName] = resolvers[typeName] || {};
                resolvers[typeName][fieldName] = () => new Array(fieldConfig.length).fill({});
              } else if ('updateStore' in fieldConfig) {
                const getFromStoreKeyFactory = getInterpolatedStringFactory(fieldConfig.store.key);
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
                      mockStore.set(
                        updateStoreConfig.type,
                        key,
                        updateStoreConfig.fieldName,
                        value,
                      );
                    },
                  );
                  const key = getFromStoreKeyFactory(resolverData);
                  return mockStore.get(fieldConfig.store.type, key, fieldConfig.store.fieldName);
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
                  return mockStore.get(fieldConfig.store.type, key, fieldConfig.store.fieldName);
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
                    typeof exportedVal === 'function' ? exportedVal(mockStore) : exportedVal,
                  );
                };
              }
            }
          }
        }
      }
      mockStore = config.store || createMockStore({ schema, mocks });
      if (typeof config?.initializeStore === 'string') {
        const initializeStoreFn$ = loadFromModuleExportExpression<(store: IMockStore) => void>(
          config.initializeStore,
          {
            cwd: config.baseDir,
            defaultExportName: 'default',
            importFn: config.importFn,
          },
        );
        init$ = initializeStoreFn$.then(fn => fn(mockStore));
      } else if (typeof config?.initializeStore === 'function') {
        init$ = config?.initializeStore?.(mockStore);
      }
      return addMocksToSchema({
        schema,
        store: mockStore,
        mocks,
        resolvers,
        preserveResolvers: config?.preserveResolvers,
      });
    });
    return {
      onContextBuilding({ extendContext }) {
        return mapMaybePromise(init$, () =>
          extendContext({
            mockStore,
          }),
        );
      },
      onSchemaChange({ schema, replaceSchema }) {
        const mockedSchema = mockSchema(schema);
        if (mockedSchema !== schema) {
          replaceSchema(mockedSchema);
        }
      },
      onExecute({ setExecuteFn }) {
        setExecuteFn(normalizedExecutor);
      },
    };
  }

  return {};
}

export { MockStore, type IMockStore, useMock };
