import { findAndParseConfig } from '@graphql-mesh/config';
import { DefaultLogger, getMesh, GetMeshOptions } from '@graphql-mesh/runtime';
import { generateTsArtifacts } from './commands/ts-artifacts';
import { serveMesh } from './commands/serve/serve';
import { isAbsolute, resolve, join } from 'path';
import { existsSync } from 'fs';
import { FsStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { writeFile, pathExists, rmdirs } from '@graphql-mesh/utils';
import { handleFatalError } from './handleFatalError';
import { cwd, env } from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export { generateTsArtifacts, serveMesh };

export async function graphqlMesh() {
  let baseDir = cwd();
  let logger = new DefaultLogger('Mesh');
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
            return import(islocalModule ? localModulePath : module);
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
      },
    })
    .command<{ port: number; prod: boolean; validate: boolean }>(
      'dev',
      'Serves a GraphQL server with GraphQL interface to test your Mesh API',
      builder => {
        builder.option('port', {
          type: 'number',
        });
      },
      async args => {
        try {
          env.NODE_ENV = 'development';
          const meshConfig = await findAndParseConfig({
            dir: baseDir,
          });
          const result = await serveMesh({
            baseDir,
            argsPort: args.port,
            getMeshOptions: meshConfig,
            rawConfig: meshConfig.config,
            documents: meshConfig.documents,
          });
          logger = result.logger;
        } catch (e) {
          handleFatalError(e, logger);
        }
      }
    )
    .command<{ port: number; prod: boolean; validate: boolean }>(
      'start',
      'Serves a GraphQL server with GraphQL interface to test your Mesh API',
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
          const builtMeshArtifacts = await import(mainModule).then(m => m.default || m);
          const getMeshOptions: GetMeshOptions = await builtMeshArtifacts.getMeshOptions();
          logger = getMeshOptions.logger;
          await serveMesh({
            baseDir,
            argsPort: args.port,
            getMeshOptions,
            rawConfig: builtMeshArtifacts.rawConfig,
            documents: builtMeshArtifacts.documents,
          });
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

          const importFn = (moduleId: string) => import(moduleId).then(m => m.default || m);

          const store = new MeshStore(
            '.mesh',
            new FsStoreStorageAdapter({
              cwd: baseDir,
              importFn,
            }),
            {
              readonly: false,
              validate: true,
            }
          );

          logger.info(`Reading Mesh configuration`);
          const meshConfig = await findAndParseConfig({
            dir: baseDir,
            ignoreAdditionalResolvers: true,
            store,
            importFn,
          });
          logger = meshConfig.logger;

          logger.info(`Generating Mesh schema`);
          const mesh = await getMesh(meshConfig);
          destroy = mesh?.destroy;
        } catch (e) {
          handleFatalError(e, logger);
        }
        if (destroy) {
          destroy();
        }
      }
    )
    .command(
      'build',
      'Builds artifacts',
      builder => {},
      async args => {
        try {
          const rootArtifactsName = '.mesh';
          const outputDir = join(baseDir, rootArtifactsName);

          logger.info('Cleaning existing artifacts');
          await rmdirs(outputDir);

          const importedModulesSet = new Set<string>();
          const importFn = (moduleId: string) =>
            import(moduleId).then(m => {
              importedModulesSet.add(moduleId);
              return m.default || m;
            });

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
            ignoreAdditionalResolvers: true,
            store,
            importFn,
          });
          logger = meshConfig.logger;

          logger.info(`Generating Mesh schema`);
          const { schema, destroy, rawSources } = await getMesh(meshConfig);
          await writeFile(join(outputDir, 'schema.graphql'), printSchemaWithDirectives(schema));

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
          });

          logger.info(`Cleanup`);
          destroy();
          logger.info('Done! => ' + outputDir);
        } catch (e) {
          handleFatalError(e, logger);
        }
      }
    ).argv;
}
