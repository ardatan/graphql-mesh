import { findAndParseConfig } from './config';
import { getMesh, GetMeshOptions, ServeMeshOptions } from '@graphql-mesh/runtime';
import { generateTsArtifacts } from './commands/ts-artifacts';
import { serveMesh } from './commands/serve/serve';
import { isAbsolute, resolve, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { FsStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import {
  writeFile,
  pathExists,
  rmdirs,
  DefaultLogger,
  loadFromModuleExportExpression,
  parseWithCache,
  defaultImportFn,
} from '@graphql-mesh/utils';
import { handleFatalError } from './handleFatalError';
import { cwd, env } from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { YamlConfig } from '@graphql-mesh/types';
import { register as tsNodeRegister } from 'ts-node';
import { register as tsConfigPathsRegister } from 'tsconfig-paths';
import { config as dotEnvRegister } from 'dotenv';
import { printSchema } from 'graphql';

export { generateTsArtifacts, serveMesh, findAndParseConfig };

const SERVE_COMMAND_WARNING =
  '`serve` command has been replaced by `dev` and `start` commands. Check our documentation for new usage';

export async function graphqlMesh() {
  let baseDir = cwd();
  let logger = new DefaultLogger('🕸️');
  return yargs(hideBin(process.argv))
    .help()
    .option('r', {
      alias: 'require',
      describe: 'Loads specific require.extensions before running the codegen and reading the configuration',
      type: 'array' as const,
      default: [],
      coerce: (externalModules: string[]) =>
        Promise.all(
          externalModules.map(module => {
            const localModulePath = resolve(baseDir, module);
            const islocalModule = existsSync(localModulePath);
            return defaultImportFn(islocalModule ? localModulePath : module);
          })
        ),
    })
    .option('dir', {
      describe: 'Modified the base directory to use for looking for meshrc config file',
      type: 'string',
      default: baseDir,
      coerce: dir => {
        if (isAbsolute(dir)) {
          baseDir = dir;
        } else {
          baseDir = resolve(cwd(), dir);
        }
        const tsConfigExists = existsSync(join(baseDir, 'tsconfig.json'));
        tsNodeRegister({
          transpileOnly: true,
          typeCheck: false,
          preferTsExts: true,
          dir: baseDir,
          require: ['graphql-import-node/register'],
          ...(tsConfigExists
            ? {}
            : {
                compilerOptions: {
                  module: 'commonjs',
                },
              }),
        });
        if (tsConfigExists) {
          try {
            const tsConfigStr = readFileSync(join(baseDir, 'tsconfig.json'), 'utf-8');
            const tsConfig = JSON.parse(tsConfigStr);
            if (tsConfig.compilerOptions?.paths) {
              tsConfigPathsRegister({
                baseUrl: baseDir,
                paths: tsConfig.compilerOptions.paths,
              });
            }
          } catch (e) {
            logger.warn(e);
          }
        }
        if (existsSync(join(baseDir, '.env'))) {
          dotEnvRegister({
            path: join(baseDir, '.env'),
          });
        }
      },
    })
    .command(
      'serve',
      SERVE_COMMAND_WARNING,
      () => {},
      () => {
        logger.error(SERVE_COMMAND_WARNING);
      }
    )
    .command<{ port: number; prod: boolean; validate: boolean }>(
      'dev',
      'Serves a GraphQL server with GraphQL interface by building Mesh artifacts on the fly',
      builder => {
        builder.option('port', {
          type: 'number',
        });
      },
      async args => {
        try {
          const rootArtifactsName = '.mesh';
          const outputDir = join(baseDir, rootArtifactsName);

          env.NODE_ENV = 'development';
          const meshConfig = await findAndParseConfig({
            dir: baseDir,
          });
          logger = meshConfig.logger;
          const meshInstance$ = getMesh(meshConfig);
          meshInstance$
            .then(({ schema }) => writeFile(join(outputDir, 'schema.graphql'), printSchema(schema)))
            .catch(e => {
              logger.error(`An error occured while writing the schema file: ${e.message}`);
            });
          meshInstance$
            .then(({ schema, rawSources }) =>
              generateTsArtifacts({
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
                  console.warn('WARNING: These artifacts are built for development mode. Please run "mesh build" to build production artifacts');
                  return findAndParseConfig({
                    dir: baseDir
                  });
                }
              `,
                logger,
                sdkConfig: meshConfig.config.sdk,
                tsOnly: true,
                codegenConfig: meshConfig.config.codegen,
              })
            )
            .catch(e => {
              logger.error(`An error occurred while building the mesh artifacts: ${e.message}`);
            });
          const serveMeshOptions: ServeMeshOptions = {
            baseDir,
            argsPort: args.port,
            getBuiltMesh: () => meshInstance$,
            logger: meshConfig.logger.child('Server'),
            rawConfig: meshConfig.config,
            documents: meshConfig.documents,
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
            await serveMesh(serveMeshOptions);
          }
        } catch (e) {
          handleFatalError(e, logger);
        }
      }
    )
    .command<{ port: number; prod: boolean; validate: boolean }>(
      'start',
      'Serves a GraphQL server with GraphQL interface based on your generated Mesh artifacts',
      builder => {
        builder.option('port', {
          type: 'number',
        });
      },
      async args => {
        try {
          const builtMeshArtifactsPath = join(baseDir, '.mesh');
          if (!(await pathExists(builtMeshArtifactsPath))) {
            throw new Error(
              `Seems like you haven't build Mesh artifacts yet to start production server! You need to build artifacts first with "mesh build" command!`
            );
          }
          env.NODE_ENV = 'production';
          const mainModule = join(builtMeshArtifactsPath, 'index.js');
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
            documents: builtMeshArtifacts.documentsInSDL.map((documentSdl: string, i: number) => ({
              rawSDL: documentSdl,
              document: parseWithCache(documentSdl),
              location: `document_${i}.graphql`,
            })),
          };
          if (rawConfig.serve?.customServerHandler) {
            const customServerHandler = await loadFromModuleExportExpression<any>(rawConfig.serve.customServerHandler, {
              defaultExportName: 'default',
              cwd: baseDir,
              importFn: defaultImportFn,
            });
            await customServerHandler(serveMeshOptions);
          } else {
            await serveMesh(serveMeshOptions);
          }
        } catch (e) {
          handleFatalError(e, logger);
        }
      }
    )
    .command(
      'validate',
      'Validates artifacts',
      builder => {},
      async args => {
        let destroy: VoidFunction;
        try {
          if (!(await pathExists(join(baseDir, '.mesh')))) {
            throw new Error(
              `You cannot validate artifacts now because you don't have built artifacts yet! You need to build artifacts first with "mesh build" command!`
            );
          }

          const store = new MeshStore(
            '.mesh',
            new FsStoreStorageAdapter({
              cwd: baseDir,
              importFn: defaultImportFn,
            }),
            {
              readonly: false,
              validate: true,
            }
          );

          logger.info(`Reading Mesh configuration`);
          const meshConfig = await findAndParseConfig({
            dir: baseDir,
            store,
            importFn: defaultImportFn,
            ignoreAdditionalResolvers: true,
          });
          logger = meshConfig.logger;

          logger.info(`Generating Mesh schema`);
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
    .command<{ tsOnly: boolean }>(
      'build',
      'Builds artifacts',
      builder => {
        builder.option('tsOnly', {
          type: 'boolean',
        });
      },
      async args => {
        try {
          const rootArtifactsName = '.mesh';
          const outputDir = join(baseDir, rootArtifactsName);

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
            rootArtifactsName,
            new FsStoreStorageAdapter({
              cwd: baseDir,
              importFn,
            }),
            {
              readonly: false,
              validate: false,
            }
          );

          logger.info(`Reading Mesh configuration`);
          const meshConfig = await findAndParseConfig({
            dir: baseDir,
            store,
            importFn,
            ignoreAdditionalResolvers: true,
          });
          logger = meshConfig.logger;

          logger.info(`Generating Mesh schema`);
          const { schema, destroy, rawSources } = await getMesh(meshConfig);
          await writeFile(join(outputDir, 'schema.graphql'), printSchema(schema));

          logger.info(`Generating artifacts`);
          await generateTsArtifacts({
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
            tsOnly: args.tsOnly,
            codegenConfig: meshConfig.config.codegen,
          });

          logger.info(`Cleanup`);
          destroy();
          logger.info('Done! => ' + outputDir);
        } catch (e) {
          handleFatalError(e, logger);
        }
      }
    )
    .command<{ source: string }>(
      'serve-source <source>',
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
          documents: [],
          graphiqlTitle: `${args.source} GraphiQL`,
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
          await serveMesh(serveMeshOptions);
        }
      }
    ).argv;
}
