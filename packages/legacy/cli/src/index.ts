import { config as dotEnvRegister } from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fs, path as pathModule, process } from '@graphql-mesh/cross-helpers';
import { include, registerTsconfigPaths } from '@graphql-mesh/include';
import type { GetMeshOptions, MeshInstance, ServeMeshOptions } from '@graphql-mesh/runtime';
import { getMesh } from '@graphql-mesh/runtime';
import { FsStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import type { Logger, YamlConfig } from '@graphql-mesh/types';
import {
  DefaultLogger,
  pathExists,
  registerTerminateHandler,
  rmdirs,
  writeFile,
} from '@graphql-mesh/utils';
import { fakePromise, printSchemaWithDirectives } from '@graphql-tools/utils';
import { serveMesh } from './commands/serve/serve.js';
import { generateTsArtifacts } from './commands/ts-artifacts.js';
import { findAndParseConfig } from './config.js';
import { handleFatalError } from './handleFatalError.js';

export { findConfig } from './config.js';

export { generateTsArtifacts, serveMesh, findAndParseConfig, handleFatalError };

export interface GraphQLMeshCLIParams {
  commandName: string;
  initialLoggerPrefix: string;
  configName: string;
  artifactsDir: string;
  serveMessage: string;
  playgroundTitle: string;
  builtMeshFactoryName: string;
  builtMeshSDKFactoryName: string;
  devServerCommand: string;
  prodServerCommand: string;
  buildArtifactsCommand: string;
  sourceServerCommand: string;
  validateCommand: string;
  additionalPackagePrefixes: string[];
}

export const DEFAULT_CLI_PARAMS: GraphQLMeshCLIParams = {
  commandName: 'mesh',
  initialLoggerPrefix: '',
  configName: 'mesh',
  artifactsDir: process.env.MESH_ARTIFACTS_DIRNAME || '.mesh',
  serveMessage: 'Serving GraphQL Mesh',
  playgroundTitle: 'GraphiQL Mesh',
  builtMeshFactoryName: 'getBuiltMesh',
  builtMeshSDKFactoryName: 'getMeshSDK',
  devServerCommand: 'dev',
  prodServerCommand: 'start',
  buildArtifactsCommand: 'build',
  sourceServerCommand: 'serve-source',
  validateCommand: 'validate',
  additionalPackagePrefixes: [],
};

export async function graphqlMesh(
  cliParams = DEFAULT_CLI_PARAMS,
  args = hideBin(process.argv),
  cwdPath = process.cwd(),
) {
  let baseDir = cwdPath;
  let logger: Logger = new DefaultLogger(cliParams.initialLoggerPrefix);
  const unregisterTsconfigPaths = registerTsconfigPaths({ cwd: baseDir });
  return yargs(args)
    .help()
    .option('r', {
      alias: 'require',
      describe:
        'Loads specific require.extensions before running the codegen and reading the configuration',
      type: 'array' as const,
      default: [],
      coerce: (externalModules: string[]) =>
        Promise.all(
          externalModules.map(moduleName => {
            const localModulePath = pathModule.resolve(baseDir, moduleName);
            const islocalModule = fs.existsSync(localModulePath);
            return include(islocalModule ? localModulePath : moduleName);
          }),
        ),
    })
    .option('dir', {
      describe:
        'Modified the base directory to use for looking for ' +
        cliParams.configName +
        ' config file',
      type: 'string',
      default: baseDir,
      coerce: dir => {
        if (pathModule.isAbsolute(dir)) {
          baseDir = dir;
        } else {
          baseDir = pathModule.resolve(cwdPath, dir);
        }
        unregisterTsconfigPaths();
        registerTsconfigPaths({ cwd: baseDir });
        if (fs.existsSync(pathModule.join(baseDir, '.env'))) {
          dotEnvRegister({
            path: pathModule.join(baseDir, '.env'),
          });
        }
      },
    })
    .command<{ port: number; prod: boolean; validate: boolean }>(
      cliParams.devServerCommand,
      'Serves a GraphQL server with GraphQL interface by building artifacts on the fly',
      builder => {
        builder.option('port', {
          type: 'number',
        });
      },
      async args => {
        try {
          const outputDir = pathModule.join(baseDir, cliParams.artifactsDir);

          process.env.NODE_ENV = 'development';
          const meshConfig = await findAndParseConfig({
            dir: baseDir,
            artifactsDir: cliParams.artifactsDir,
            configName: cliParams.configName,
            additionalPackagePrefixes: cliParams.additionalPackagePrefixes,
            initialLoggerPrefix: cliParams.initialLoggerPrefix,
            importFn: include,
          });
          logger = meshConfig.logger;

          // eslint-disable-next-line no-inner-declarations
          function buildMeshInstance() {
            return getMesh(meshConfig).then(meshInstance => {
              // We already handle Mesh instance errors inside `serveMesh`
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              writeFile(
                pathModule.join(outputDir, 'schema.graphql'),
                printSchemaWithDirectives(meshInstance.schema),
              ).catch(e => logger.error(`An error occured while writing the schema file: `, e));

              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              generateTsArtifacts(
                {
                  unifiedSchema: meshInstance.schema,
                  rawSources: meshInstance.rawSources,
                  mergerType: meshConfig.merger.name,
                  documents: meshConfig.documents,
                  flattenTypes: false,
                  importedModulesSet: new Set(),
                  baseDir,
                  pollingInterval: meshConfig.config.pollingInterval,
                  meshConfigImportCodes: new Set([
                    `import { findAndParseConfig } from '@graphql-mesh/cli';`,
                    `import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';`,
                  ]),
                  meshConfigCodes: new Set([
                    `
export function getMeshOptions() {
  console.warn('WARNING: These artifacts are built for development mode. Please run "${
    cliParams.commandName
  } build" to build production artifacts');
  return findAndParseConfig({
    dir: baseDir,
    artifactsDir: ${JSON.stringify(cliParams.artifactsDir)},
    configName: ${JSON.stringify(cliParams.configName)},
    additionalPackagePrefixes: ${JSON.stringify(cliParams.additionalPackagePrefixes)},
    initialLoggerPrefix: ${JSON.stringify(cliParams.initialLoggerPrefix)},
  });
}

export function createBuiltMeshHTTPHandler<TServerContext = {}>(): MeshHTTPHandler<TServerContext> {
  return createMeshHTTPHandler<TServerContext>({
    baseDir,
    getBuiltMesh: ${cliParams.builtMeshFactoryName},
    rawServeConfig: ${JSON.stringify(meshConfig.config.serve)},
  })
}
              `.trim(),
                  ]),
                  logger,
                  sdkConfig: meshConfig.config.sdk,
                  fileType: 'ts',
                  codegenConfig: meshConfig.config.codegen,
                },
                cliParams,
              ).catch(e => {
                logger.error(
                  `An error occurred while building the artifacts: ${e.stack || e.message}`,
                );
              });
              return meshInstance;
            });
          }

          let meshInstance$: Promise<MeshInstance>;

          meshInstance$ = buildMeshInstance();

          if (meshConfig.config.pollingInterval) {
            logger.info(`Polling enabled with interval of ${meshConfig.config.pollingInterval}ms`);
            const interval = setInterval(() => {
              logger.info(`Polling for changes...`);
              buildMeshInstance()
                .then(newMeshInstance =>
                  meshInstance$.then(oldMeshInstance => {
                    oldMeshInstance.destroy();
                    meshInstance$ = fakePromise(newMeshInstance);
                  }),
                )
                .catch(e => {
                  logger.error(`Mesh polling failed so the previous version will be served: `, e);
                });
            }, meshConfig.config.pollingInterval);
            registerTerminateHandler(() => {
              logger.info(`Terminating polling...`);
              clearInterval(interval);
            });
          }

          const serveMeshOptions: ServeMeshOptions = {
            baseDir,
            argsPort: args.port,
            getBuiltMesh: () => meshInstance$,
            logger: meshConfig.logger.child('Server'),
            rawServeConfig: meshConfig.config.serve,
            registerTerminateHandler,
          };
          await serveMesh(serveMeshOptions, cliParams);
        } catch (e) {
          handleFatalError(e, logger);
        }
      },
    )
    .command<{ port: number; prod: boolean; validate: boolean }>(
      cliParams.prodServerCommand,
      'Serves a GraphQL server with GraphQL interface based on your generated artifacts',
      builder => {
        builder.option('port', {
          type: 'number',
        });
      },
      async args => {
        try {
          const builtMeshArtifactsPath = pathModule.join(baseDir, cliParams.artifactsDir);
          if (!(await pathExists(builtMeshArtifactsPath))) {
            throw new Error(
              `Seems like you haven't build the artifacts yet to start production server! You need to build artifacts first with "${cliParams.commandName} build" command!`,
            );
          }
          process.env.NODE_ENV = 'production';
          const mainModule = pathModule.join(builtMeshArtifactsPath, 'index');
          const builtMeshArtifacts = await include(mainModule);
          const rawServeConfig: YamlConfig.Config['serve'] = builtMeshArtifacts.rawServeConfig;
          const meshOptions = await builtMeshArtifacts.getMeshOptions();
          logger = meshOptions.logger;
          const serveMeshOptions: ServeMeshOptions = {
            baseDir,
            argsPort: args.port,
            getBuiltMesh: builtMeshArtifacts[cliParams.builtMeshFactoryName],
            logger,
            rawServeConfig,
            registerTerminateHandler,
          };
          await serveMesh(serveMeshOptions, cliParams);
        } catch (e) {
          handleFatalError(e, logger);
        }
      },
    )
    .command(
      cliParams.validateCommand,
      'Validates artifacts',
      builder => {},
      async args => {
        let destroy: VoidFunction;
        try {
          if (!(await pathExists(pathModule.join(baseDir, cliParams.artifactsDir)))) {
            throw new Error(
              `You cannot validate artifacts now because you don't have built artifacts yet! You need to build artifacts first with "${cliParams.commandName} build" command!`,
            );
          }

          const store = new MeshStore(
            cliParams.artifactsDir,
            new FsStoreStorageAdapter({
              cwd: baseDir,
              importFn: include,
              fileType: 'ts',
            }),
            {
              readonly: false,
              validate: true,
            },
          );

          logger.info(`Reading the configuration`);
          const meshConfig = await findAndParseConfig({
            dir: baseDir,
            store,
            importFn: include,
            ignoreAdditionalResolvers: true,
            artifactsDir: cliParams.artifactsDir,
            configName: cliParams.configName,
            additionalPackagePrefixes: cliParams.additionalPackagePrefixes,
            initialLoggerPrefix: cliParams.initialLoggerPrefix,
            logger,
          });
          logger = meshConfig.logger;

          logger.info(`Generating the unified schema`);
          const mesh = await getMesh(meshConfig);
          logger.info(`Artifacts are valid!`);
          destroy = mesh?.destroy;
        } catch (e) {
          handleFatalError(e, logger);
        }
        if (destroy) {
          destroy();
        }
      },
    )
    .command<{ fileType: 'json' | 'ts' | 'js'; throwOnInvalidConfig: boolean }>(
      cliParams.buildArtifactsCommand,
      'Builds artifacts',
      builder => {
        builder.option('fileType', {
          type: 'string',
          choices: ['json', 'ts', 'js'],
          default: 'ts',
        });
        builder.option('throwOnInvalidConfig', {
          type: 'boolean',
          default: false,
        });
      },
      async args => {
        try {
          const outputDir = pathModule.join(baseDir, cliParams.artifactsDir);

          logger.info('Cleaning existing artifacts');
          await rmdirs(outputDir);

          const importedModulesSet = new Set<string>();
          const importPromises: Promise<any>[] = [];
          const importFn = (moduleId: string, noCache: boolean) => {
            const importPromise = include(moduleId)
              .catch(e => {
                if (e.message.includes('getter')) {
                  return e;
                } else {
                  throw e;
                }
              })
              .then(m => {
                if (!noCache) {
                  importedModulesSet.add(moduleId);
                }
                return m;
              });
            importPromises.push(importPromise.catch(() => {}));
            return importPromise;
          };

          await Promise.all(importPromises);

          const store = new MeshStore(
            cliParams.artifactsDir,
            new FsStoreStorageAdapter({
              cwd: baseDir,
              importFn,
              fileType: args.fileType,
            }),
            {
              readonly: false,
              validate: false,
            },
          );

          logger.info(`Reading the configuration`);
          const meshConfig = await findAndParseConfig({
            dir: baseDir,
            store,
            importFn,
            ignoreAdditionalResolvers: true,
            artifactsDir: cliParams.artifactsDir,
            configName: cliParams.configName,
            additionalPackagePrefixes: cliParams.additionalPackagePrefixes,
            generateCode: true,
            initialLoggerPrefix: cliParams.initialLoggerPrefix,
            throwOnInvalidConfig: args.throwOnInvalidConfig,
            logger,
          });
          logger = meshConfig.logger;

          logger.info(`Generating the unified schema`);
          const { schema, destroy, rawSources } = await getMesh(meshConfig);
          await writeFile(
            pathModule.join(outputDir, 'schema.graphql'),
            printSchemaWithDirectives(schema),
          );

          logger.info(`Generating artifacts`);
          meshConfig.importCodes.add(
            `import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';`,
          );
          meshConfig.codes.add(`
export function createBuiltMeshHTTPHandler<TServerContext = {}>(): MeshHTTPHandler<TServerContext> {
  return createMeshHTTPHandler<TServerContext>({
    baseDir,
    getBuiltMesh: ${cliParams.builtMeshFactoryName},
    rawServeConfig: ${JSON.stringify(meshConfig.config.serve)},
  })
}
`);
          await generateTsArtifacts(
            {
              unifiedSchema: schema,
              rawSources,
              mergerType: meshConfig.merger.name,
              documents: meshConfig.documents,
              flattenTypes: false,
              importedModulesSet,
              baseDir,
              meshConfigImportCodes: meshConfig.importCodes,
              meshConfigCodes: meshConfig.codes,
              logger,
              sdkConfig: meshConfig.config.sdk,
              fileType: args.fileType,
              codegenConfig: meshConfig.config.codegen,
              pollingInterval: meshConfig.config.pollingInterval,
            },
            cliParams,
          );

          logger.info(`Cleanup`);
          destroy();
          logger.info('Done! => ' + outputDir);
        } catch (e) {
          handleFatalError(e, logger);
        }
      },
    )
    .command<{ source: string }>(
      cliParams.sourceServerCommand + ' <source>',
      'Serves specific source in development mode',
      builder => {
        builder.positional('source', {
          type: 'string',
          requiresArg: true,
        });
      },
      async args => {
        process.env.NODE_ENV = 'development';
        const meshConfig = await findAndParseConfig({
          dir: baseDir,
          artifactsDir: cliParams.artifactsDir,
          configName: cliParams.configName,
          additionalPackagePrefixes: cliParams.additionalPackagePrefixes,
          initialLoggerPrefix: cliParams.initialLoggerPrefix,
          logger,
        });
        logger = meshConfig.logger;
        const sourceIndex = meshConfig.sources.findIndex(
          rawSource => rawSource.name === args.source,
        );
        if (sourceIndex === -1) {
          throw new Error(`Source ${args.source} not found`);
        }
        const getMeshOpts: GetMeshOptions = {
          ...meshConfig,
          additionalTypeDefs: undefined,
          additionalResolvers: [],
          transforms: [],
          sources: [meshConfig.sources[sourceIndex]],
        };
        let meshInstance$: Promise<MeshInstance>;
        if (meshConfig.config.pollingInterval) {
          const interval = setInterval(() => {
            getMesh(getMeshOpts)
              .then(newMeshInstance =>
                meshInstance$.then(oldMeshInstance => {
                  oldMeshInstance.destroy();
                  meshInstance$ = fakePromise(newMeshInstance);
                }),
              )
              .catch(e => {
                logger.error(`Mesh polling failed so the previous version will be served: `, e);
              });
          }, meshConfig.config.pollingInterval);
          registerTerminateHandler(() => {
            clearInterval(interval);
          });
        } else {
          meshInstance$ = getMesh(getMeshOpts);
        }
        const serveMeshOptions: ServeMeshOptions = {
          baseDir,
          argsPort: 4000 + sourceIndex + 1,
          getBuiltMesh: () => meshInstance$,
          logger: meshConfig.logger.child('Server'),
          rawServeConfig: meshConfig.config.serve,
          playgroundTitle: `${args.source} GraphiQL`,
          registerTerminateHandler,
        };
        await serveMesh(serveMeshOptions, cliParams);
      },
    ).argv;
}
