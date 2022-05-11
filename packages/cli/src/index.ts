import { findAndParseConfig } from './config';
import { getMesh, GetMeshOptions, ServeMeshOptions } from '@graphql-mesh/runtime';
import { generateTsArtifacts } from './commands/ts-artifacts';
import { serveMesh } from './commands/serve/serve';
import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';
import { FsStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import {
  writeFile,
  pathExists,
  rmdirs,
  DefaultLogger,
  loadFromModuleExportExpression,
  defaultImportFn,
} from '@graphql-mesh/utils';
import { handleFatalError } from './handleFatalError';
import { cwd, env } from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Logger, YamlConfig } from '@graphql-mesh/types';
import { register as tsNodeRegister } from 'ts-node';
import { register as tsConfigPathsRegister } from 'tsconfig-paths';
import { config as dotEnvRegister } from 'dotenv';
import { printSchema } from 'graphql';
import { stripJSONComments } from './utils';
import { inspect } from 'util';

export { generateTsArtifacts, serveMesh, findAndParseConfig };

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
  initialLoggerPrefix: '🕸️  Mesh',
  configName: 'mesh',
  artifactsDir: '.mesh',
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

export async function graphqlMesh(cliParams = DEFAULT_CLI_PARAMS, args = hideBin(process.argv), cwdPath = cwd()) {
  let baseDir = cwdPath;
  let logger: Logger = new DefaultLogger(cliParams.initialLoggerPrefix);
  return yargs(args)
    .help()
    .option('r', {
      alias: 'require',
      describe: 'Loads specific require.extensions before running the codegen and reading the configuration',
      type: 'array' as const,
      default: [],
      coerce: (externalModules: string[]) =>
        Promise.all(
          externalModules.map(module => {
            const localModulePath = pathModule.resolve(baseDir, module);
            const islocalModule = fs.existsSync(localModulePath);
            return defaultImportFn(islocalModule ? localModulePath : module);
          })
        ),
    })
    .option('dir', {
      describe: 'Modified the base directory to use for looking for ' + cliParams.configName + ' config file',
      type: 'string',
      default: baseDir,
      coerce: dir => {
        if (pathModule.isAbsolute(dir)) {
          baseDir = dir;
        } else {
          baseDir = pathModule.resolve(cwdPath, dir);
        }
        const tsConfigPath = pathModule.join(baseDir, 'tsconfig.json');
        const tsConfigExists = fs.existsSync(tsConfigPath);
        tsNodeRegister({
          transpileOnly: true,
          typeCheck: false,
          dir: baseDir,
          require: ['graphql-import-node/register'],
          compilerOptions: {
            module: 'commonjs',
          },
        });
        if (tsConfigExists) {
          try {
            const tsConfigStr = fs.readFileSync(tsConfigPath, 'utf-8');
            const tsConfigStrWithoutComments = stripJSONComments(tsConfigStr);
            const tsConfig = JSON.parse(tsConfigStrWithoutComments);
            if (tsConfig.compilerOptions?.paths) {
              tsConfigPathsRegister({
                baseUrl: baseDir,
                paths: tsConfig.compilerOptions.paths,
              });
            }
          } catch (e) {
            logger.warn(`Unable to read TSConfig file ${tsConfigPath};\n ${e.stack || e.message || inspect(e)}`);
          }
        }
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

          env.NODE_ENV = 'development';
          const meshConfig = await findAndParseConfig({
            dir: baseDir,
            artifactsDir: cliParams.artifactsDir,
            configName: cliParams.configName,
            additionalPackagePrefixes: cliParams.additionalPackagePrefixes,
          });
          logger = meshConfig.logger;
          const meshInstance$ = getMesh(meshConfig);
          meshInstance$
            .then(({ schema }) => writeFile(pathModule.join(outputDir, 'schema.graphql'), printSchema(schema)))
            .catch(e => {
              logger.error(`An error occured while writing the schema file: ${e.stack || e.message}`);
            });
          meshInstance$
            .then(({ schema, rawSources }) =>
              generateTsArtifacts(
                {
                  unifiedSchema: schema,
                  rawSources,
                  mergerType: meshConfig.merger.name,
                  documents: meshConfig.documents,
                  flattenTypes: false,
                  importedModulesSet: new Set(),
                  baseDir,
                  meshConfigCode: `
                import { findAndParseConfig } from '@graphql-mesh/cli';
                function getMeshOptions() {
                  console.warn('WARNING: These artifacts are built for development mode. Please run "${
                    cliParams.commandName
                  } build" to build production artifacts');
                  return findAndParseConfig({
                    dir: baseDir,
                    artifactsDir: ${JSON.stringify(cliParams.artifactsDir)},
                    configName: ${JSON.stringify(cliParams.configName)},
                    additionalPackagePrefixes: ${JSON.stringify(cliParams.additionalPackagePrefixes)},
                  });
                }
              `,
                  logger,
                  sdkConfig: meshConfig.config.sdk,
                  fileType: 'ts',
                  codegenConfig: meshConfig.config.codegen,
                },
                cliParams
              )
            )
            .catch(e => {
              logger.error(`An error occurred while building the artifacts: ${e.stack || e.message}`);
            });
          const serveMeshOptions: ServeMeshOptions = {
            baseDir,
            argsPort: args.port,
            getBuiltMesh: () => meshInstance$,
            logger: meshConfig.logger.child('Server'),
            rawConfig: meshConfig.config,
          };
          if (meshConfig.config.serve?.customServerHandler) {
            const customServerHandler = await loadFromModuleExportExpression<any>(
              meshConfig.config.serve.customServerHandler,
              {
                defaultExportName: 'default',
                cwd: baseDir,
                importFn: defaultImportFn,
              }
            );
            await customServerHandler(serveMeshOptions);
          } else {
            await serveMesh(serveMeshOptions, cliParams);
          }
        } catch (e) {
          handleFatalError(e, logger);
        }
      }
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
              `Seems like you haven't build the artifacts yet to start production server! You need to build artifacts first with "${cliParams.commandName} build" command!`
            );
          }
          env.NODE_ENV = 'production';
          const mainModule = pathModule.join(builtMeshArtifactsPath, 'index');
          const builtMeshArtifacts = await defaultImportFn(mainModule);
          const getMeshOptions: GetMeshOptions = await builtMeshArtifacts.getMeshOptions();
          logger = getMeshOptions.logger;
          const rawConfig: YamlConfig.Config = builtMeshArtifacts.rawConfig;
          const serveMeshOptions: ServeMeshOptions = {
            baseDir,
            argsPort: args.port,
            getBuiltMesh: () => getMesh(getMeshOptions),
            logger: getMeshOptions.logger.child('Server'),
            rawConfig: builtMeshArtifacts.rawConfig,
          };
          if (rawConfig.serve?.customServerHandler) {
            const customServerHandler = await loadFromModuleExportExpression<any>(rawConfig.serve.customServerHandler, {
              defaultExportName: 'default',
              cwd: baseDir,
              importFn: defaultImportFn,
            });
            await customServerHandler(serveMeshOptions);
          } else {
            await serveMesh(serveMeshOptions, cliParams);
          }
        } catch (e) {
          handleFatalError(e, logger);
        }
      }
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
              `You cannot validate artifacts now because you don't have built artifacts yet! You need to build artifacts first with "${cliParams.commandName} build" command!`
            );
          }

          const store = new MeshStore(
            cliParams.artifactsDir,
            new FsStoreStorageAdapter({
              cwd: baseDir,
              importFn: defaultImportFn,
              fileType: 'ts',
            }),
            {
              readonly: false,
              validate: true,
            }
          );

          logger.info(`Reading the configuration`);
          const meshConfig = await findAndParseConfig({
            dir: baseDir,
            store,
            importFn: defaultImportFn,
            ignoreAdditionalResolvers: true,
            artifactsDir: cliParams.artifactsDir,
            configName: cliParams.configName,
            additionalPackagePrefixes: cliParams.additionalPackagePrefixes,
          });
          logger = meshConfig.logger;

          logger.info(`Generating the unified schema`);
          const mesh = await getMesh(meshConfig);
          logger.info(`Artifacts have been validated successfully`);
          destroy = mesh?.destroy;
        } catch (e) {
          handleFatalError(e, logger);
        }
        if (destroy) {
          destroy();
        }
      }
    )
    .command<{ fileType: 'json' | 'ts' | 'js' }>(
      cliParams.buildArtifactsCommand,
      'Builds artifacts',
      builder => {
        builder.option('fileType', {
          type: 'string',
          choices: ['json', 'ts', 'js'],
          default: 'ts',
        });
      },
      async args => {
        try {
          const outputDir = pathModule.join(baseDir, cliParams.artifactsDir);

          logger.info('Cleaning existing artifacts');
          await rmdirs(outputDir);

          const importedModulesSet = new Set<string>();
          const importPromises: Promise<any>[] = [];
          const importFn = (moduleId: string) => {
            const importPromise = defaultImportFn(moduleId)
              .catch(e => {
                if (e.message.includes('getter')) {
                  return e;
                } else {
                  throw e;
                }
              })
              .then(m => {
                importedModulesSet.add(moduleId);
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
            }
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
          });
          logger = meshConfig.logger;

          logger.info(`Generating the unified schema`);
          const { schema, destroy, rawSources } = await getMesh(meshConfig);
          await writeFile(pathModule.join(outputDir, 'schema.graphql'), printSchema(schema));

          logger.info(`Generating artifacts`);
          await generateTsArtifacts(
            {
              unifiedSchema: schema,
              rawSources,
              mergerType: meshConfig.merger.name,
              documents: meshConfig.documents,
              flattenTypes: false,
              importedModulesSet,
              baseDir,
              meshConfigCode: meshConfig.code,
              logger,
              sdkConfig: meshConfig.config.sdk,
              fileType: args.fileType,
              codegenConfig: meshConfig.config.codegen,
            },
            cliParams
          );

          logger.info(`Cleanup`);
          destroy();
          logger.info('Done! => ' + outputDir);
        } catch (e) {
          handleFatalError(e, logger);
        }
      }
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
        env.NODE_ENV = 'development';
        const meshConfig = await findAndParseConfig({
          dir: baseDir,
          artifactsDir: cliParams.artifactsDir,
          configName: cliParams.configName,
          additionalPackagePrefixes: cliParams.additionalPackagePrefixes,
        });
        logger = meshConfig.logger;
        const sourceIndex = meshConfig.sources.findIndex(rawSource => rawSource.name === args.source);
        if (sourceIndex === -1) {
          throw new Error(`Source ${args.source} not found`);
        }
        const meshInstance$ = getMesh({
          ...meshConfig,
          additionalTypeDefs: undefined,
          additionalResolvers: [],
          transforms: [],
          sources: [meshConfig.sources[sourceIndex]],
        });
        const serveMeshOptions: ServeMeshOptions = {
          baseDir,
          argsPort: 4000 + sourceIndex + 1,
          getBuiltMesh: () => meshInstance$,
          logger: meshConfig.logger.child('Server'),
          rawConfig: meshConfig.config,
          playgroundTitle: `${args.source} GraphiQL`,
        };
        if (meshConfig.config.serve?.customServerHandler) {
          const customServerHandler = await loadFromModuleExportExpression<any>(
            meshConfig.config.serve.customServerHandler,
            {
              defaultExportName: 'default',
              cwd: baseDir,
              importFn: defaultImportFn,
            }
          );
          await customServerHandler(serveMeshOptions);
        } else {
          await serveMesh(serveMeshOptions, cliParams);
        }
      }
    ).argv;
}
