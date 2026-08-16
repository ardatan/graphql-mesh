import type { GraphQLSchema } from 'graphql';
import JSON5 from 'json5';
import ts from 'typescript';
import { codegen } from '@graphql-codegen/core';
import * as typedDocumentNodePlugin from '@graphql-codegen/typed-document-node';
import * as typescriptGenericSdk from '@graphql-codegen/typescript-generic-sdk';
import * as tsOperationsPlugin from '@graphql-codegen/typescript-operations';
import * as tsResolversPlugin from '@graphql-codegen/typescript-resolvers';
import type { Source } from '@graphql-mesh/config';
import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';
import {
  generateIncontextSDKTypes,
  generateUnifiedContextTypeFromIdentifiers,
} from '@graphql-mesh/incontext-sdk-codegen';
import type { Logger, RawSourceOutput, YamlConfig } from '@graphql-mesh/types';
import {
  defaultImportFn,
  pathExists,
  printWithCache,
  writeFile,
  writeJSON,
} from '@graphql-mesh/utils';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import type { GraphQLMeshCLIParams } from '../index.js';
import { generateOperations } from './generate-operations.js';

const BASEDIR_ASSIGNMENT_COMMENT = `/* BASEDIR_ASSIGNMENT */`;

export type MeshArtifactEsmExt = 'js' | 'mjs';

export function getMeshArtifactEmitPlan({
  hasTsConfig,
  tsConfigModule,
  hasPackageJson,
  packageJsonType,
  fileType,
}: {
  hasTsConfig: boolean;
  tsConfigModule?: string;
  hasPackageJson: boolean;
  packageJsonType?: string;
  fileType: 'ts' | 'json' | 'js';
}): {
  esmExt?: MeshArtifactEsmExt;
  cjs: boolean;
  artifactsPackageType?: 'module' | 'commonjs';
} {
  const tsModule = tsConfigModule?.toLowerCase() ?? '';
  const isPackageModule = packageJsonType === 'module';

  const esmAsJs = (): ReturnType<typeof getMeshArtifactEmitPlan> => ({
    esmExt: 'js',
    cjs: false,
    artifactsPackageType: fileType === 'ts' ? undefined : 'module',
  });

  const cjsOnly = (): ReturnType<typeof getMeshArtifactEmitPlan> => ({
    cjs: true,
    artifactsPackageType: fileType === 'ts' ? undefined : 'commonjs',
  });

  const dualCjsPackage = (): ReturnType<typeof getMeshArtifactEmitPlan> => ({
    esmExt: 'mjs',
    cjs: fileType !== 'js',
    artifactsPackageType: fileType === 'js' ? 'module' : 'commonjs',
  });

  if (hasTsConfig) {
    if (tsModule.startsWith('es')) {
      return esmAsJs();
    }
    if (tsModule.startsWith('node') && hasPackageJson) {
      return isPackageModule ? esmAsJs() : cjsOnly();
    }
    // `"type": "module"` means Node loads `.js` as ESM; emitting CJS artifacts
    // into that package (hello-world-esm) makes `exports is not defined`.
    if (hasPackageJson && isPackageModule) {
      return esmAsJs();
    }
    return cjsOnly();
  }
  if (hasPackageJson && isPackageModule) {
    return esmAsJs();
  }
  return dualCjsPackage();
}

export function getMeshArtifactsPackageJson(
  moduleType: 'module' | 'commonjs',
  esmEntry: 'index.js' | 'index.mjs' = 'index.mjs',
) {
  const pureEsmJs = moduleType === 'module' && esmEntry === 'index.js';
  return {
    name: 'mesh-artifacts',
    private: true,
    type: moduleType,
    main: 'index.js',
    module: esmEntry,
    sideEffects: false,
    typings: 'index.d.ts',
    typescript: {
      definition: 'index.d.ts',
    },
    exports: pureEsmJs
      ? {
          '.': './index.js',
          './*': './*.js',
        }
      : {
          '.': {
            require: './index.js',
            import: './index.mjs',
          },
          './*': {
            require: './*.js',
            import: './*.mjs',
          },
        },
  };
}

async function loadTypeScriptCodegenPlugin() {
  return defaultImportFn('@graphql-codegen/typescript');
}

export async function generateTsArtifacts(
  {
    unifiedSchema,
    rawSources,
    mergerType = 'stitching',
    documents,
    flattenTypes,
    importedModulesSet,
    baseDir,
    meshConfigImportCodes,
    meshConfigCodes,
    logger,
    sdkConfig,
    fileType,
    codegenConfig = {},
    pollingInterval,
  }: {
    unifiedSchema: GraphQLSchema;
    rawSources: readonly RawSourceOutput[];
    mergerType: string;
    documents: Source[];
    flattenTypes: boolean;
    importedModulesSet: Set<string>;
    baseDir: string;
    meshConfigImportCodes: Set<string>;
    meshConfigCodes: Set<string>;
    logger: Logger;
    sdkConfig: YamlConfig.SDKConfig;
    fileType: 'ts' | 'json' | 'js';
    codegenConfig: any;
    pollingInterval?: number;
  },
  cliParams: GraphQLMeshCLIParams,
) {
  const artifactsDir = pathModule.join(baseDir, cliParams.artifactsDir);
  logger.info('Generating index file in TypeScript');
  for (const rawSource of rawSources) {
    const transformedSchema = (unifiedSchema.extensions as any).sourceMap.get(rawSource);
    const sdl = printSchemaWithDirectives(transformedSchema);
    await writeFile(pathModule.join(artifactsDir, `sources/${rawSource.name}/schema.graphql`), sdl);
  }
  const documentsInput = sdkConfig?.generateOperations
    ? generateOperations(unifiedSchema, sdkConfig.generateOperations)
    : documents;
  const pluginsInput: Record<string, any>[] = [
    {
      typescript: {},
    },
    {
      resolvers: {},
    },
    {
      contextSdk: {},
    },
  ];
  if (documentsInput.length) {
    pluginsInput.push(
      {
        typescriptOperations: {},
      },
      {
        typedDocumentNode: {},
      },
      {
        typescriptGenericSdk: {
          documentMode: 'external',
          importDocumentNodeExternallyFrom: 'NOWHERE',
        },
      },
    );
    const documentHashMap: Record<string, string> = {};
    for (const document of documentsInput) {
      if (document.sha256Hash) {
        documentHashMap[document.sha256Hash] = document.rawSDL || printWithCache(document.document);
      }
    }
    await writeFile(
      pathModule.join(artifactsDir, `persisted_operations.json`),
      JSON.stringify(documentHashMap, null, 2),
    );
  }
  const tsBasePlugin = await loadTypeScriptCodegenPlugin();
  const codegenOutput =
    '// @ts-nocheck\n' +
    (
      await codegen({
        filename: 'types.ts',
        documents: documentsInput,
        config: {
          skipTypename: true,
          flattenGeneratedTypes: flattenTypes,
          onlyOperationTypes: flattenTypes,
          preResolveTypes: flattenTypes,
          namingConvention: 'keep',
          documentMode: 'graphQLTag',
          gqlImport: '@graphql-mesh/utils#gql',
          enumsAsTypes: true,
          ignoreEnumValuesFromSchema: true,
          useIndexSignature: true,
          noSchemaStitching: false,
          contextType: 'MeshContext',
          federation: mergerType === 'federation',
          ...codegenConfig,
        },
        schemaAst: unifiedSchema,
        schema: undefined as any, // This is not necessary on codegen.
        // skipDocumentsValidation: true,
        pluginMap: {
          typescript: tsBasePlugin,
          typescriptOperations: tsOperationsPlugin,
          typedDocumentNode: typedDocumentNodePlugin,
          typescriptGenericSdk,
          resolvers: tsResolversPlugin,
          contextSdk: {
            plugin: async () => {
              const importCodes = new Set([
                ...meshConfigImportCodes,
                `import { getMesh, type ExecuteMeshFn, type SubscribeMeshFn, type MeshContext as BaseMeshContext, type MeshInstance } from '@graphql-mesh/runtime';`,
                `import { MeshStore, FsStoreStorageAdapter } from '@graphql-mesh/store';`,
                `import { path as pathModule } from '@graphql-mesh/cross-helpers';`,
                `import type { ImportFn } from '@graphql-mesh/types';`,
              ]);
              const results = await Promise.all(
                rawSources.map(async source => {
                  const sourceMap = unifiedSchema.extensions.sourceMap as Map<
                    RawSourceOutput,
                    GraphQLSchema
                  >;
                  const sourceSchema = sourceMap.get(source);
                  const { identifier, codeAst } = await generateIncontextSDKTypes({
                    schema: sourceSchema,
                    name: source.name,
                    contextVariables: source.contextVariables,
                    flattenTypes,
                    codegenConfig,
                    unifiedContextIdentifier: 'BaseMeshContext',
                  });

                  if (codeAst) {
                    const content = '// @ts-nocheck\n' + codeAst;
                    await writeFile(
                      pathModule.join(artifactsDir, `sources/${source.name}/types.ts`),
                      content,
                    );
                  }

                  if (identifier) {
                    importCodes.add(
                      `import type { ${identifier} } from './sources/${source.name}/types';`,
                    );
                  }

                  return {
                    identifier,
                    codeAst,
                  };
                }),
              );

              let contextType = generateUnifiedContextTypeFromIdentifiers(
                results.map(r => r.identifier).filter((id): id is string => Boolean(id)),
              );

              contextType += '\n\nexport type MeshContext = BaseMeshContext & MeshInContextSDK;';

              let meshMethods = `
${BASEDIR_ASSIGNMENT_COMMENT}

const importFn: ImportFn = <T>(moduleId: string) => {
  const relativeModuleId = (pathModule.isAbsolute(moduleId) ? pathModule.relative(baseDir, moduleId) : moduleId).split('\\\\').join('/').replace(baseDir + '/', '');
  switch(relativeModuleId) {${[...importedModulesSet]
    .map(importedModuleName => {
      const importPathRelativeToBaseDir = pathModule
        .relative(baseDir, importedModuleName)
        .split('\\')
        .join('/');
      let importPath = importedModuleName;
      if (importPath.startsWith('.')) {
        importPath = pathModule.join(baseDir, importPath);
      }
      if (pathModule.isAbsolute(importPath)) {
        importPath = `./${pathModule
          .relative(artifactsDir, importedModuleName)
          .split('\\')
          .join('/')}`;
        importPath = replaceTypeScriptExtension(importPath);
      }
      return `
    case ${JSON.stringify(importPathRelativeToBaseDir)}:
      return import(${JSON.stringify(importPath)}) as T;
    `;
    })
    .join('')}
    default:
      return Promise.reject(new Error(\`Cannot find module '\${relativeModuleId}'.\`));
  }
};

const rootStore = new MeshStore('${cliParams.artifactsDir}', new FsStoreStorageAdapter({
  cwd: baseDir,
  importFn,
  fileType: ${JSON.stringify(fileType)},
}), {
  readonly: ${!pollingInterval},
  validate: false
});

${[...meshConfigCodes].join('\n')}

let meshInstance$: Promise<MeshInstance> | undefined;

export const pollingInterval = ${pollingInterval || null};

export function ${cliParams.builtMeshFactoryName}(): Promise<MeshInstance> {
  if (meshInstance$ == null) {
    if (pollingInterval) {
      setInterval(() => {
        getMeshOptions()
        .then(meshOptions => getMesh(meshOptions))
        .then(newMesh =>
          meshInstance$.then(oldMesh => {
            oldMesh.destroy()
            meshInstance$ = Promise.resolve(newMesh)
          })
        ).catch(err => {
          console.error("Mesh polling failed so the existing version will be used:", err);
        });
      }, pollingInterval)
    }
    meshInstance$ = getMeshOptions().then(meshOptions => getMesh(meshOptions)).then(mesh => {
      const id = mesh.pubsub.subscribe('destroy', () => {
        meshInstance$ = undefined;
        mesh.pubsub.unsubscribe(id);
      });
      return mesh;
    }).catch((err) => {
      meshInstance$ = undefined;
      return Promise.reject(err);
    });
  }
  return meshInstance$;
}

export const execute: ExecuteMeshFn = (...args) => ${
                cliParams.builtMeshFactoryName
              }().then(({ execute }) => execute(...args));

export const subscribe: SubscribeMeshFn = (...args) => ${
                cliParams.builtMeshFactoryName
              }().then(({ subscribe }) => subscribe(...args));`;

              if (documentsInput.length) {
                meshMethods += `
export function ${cliParams.builtMeshSDKFactoryName}<TGlobalContext = any, TOperationContext = any>(globalContext?: TGlobalContext) {
  const sdkRequester$ = ${cliParams.builtMeshFactoryName}().then(({ sdkRequesterFactory }) => sdkRequesterFactory(globalContext));
  return getSdk<TOperationContext, TGlobalContext>((...args) => sdkRequester$.then(sdkRequester => sdkRequester(...args)));
}`;
              }

              return {
                prepend: [[...importCodes].join('\n'), '\n\n'],
                content: [contextType, meshMethods].join('\n\n'),
              };
            },
          },
        },
        plugins: pluginsInput,
      })
    )
      .replace(`import * as Operations from 'NOWHERE';\n`, '')
      .replace(`import { DocumentNode } from 'graphql';`, '')
      .split('(Operations.')
      .join('(');

  const endpointAssignmentESM = `import { fileURLToPath } from '@graphql-mesh/utils';
const baseDir = pathModule.join(pathModule.dirname(fileURLToPath(import.meta.url)), '${pathModule.relative(
    artifactsDir,
    baseDir,
  )}');`;
  const endpointAssignmentCJS = `const baseDir = pathModule.join(typeof __dirname === 'string' ? __dirname : '/', '${pathModule.relative(
    artifactsDir,
    baseDir,
  )}');`;

  const tsFilePath = pathModule.join(artifactsDir, 'index.ts');

  const jobs: (() => Promise<void>)[] = [];
  const jsFilePath = pathModule.join(artifactsDir, 'index.js');
  const dtsFilePath = pathModule.join(artifactsDir, 'index.d.ts');

  const esmJob = (ext: 'mjs' | 'js') => async () => {
    logger.info('Writing index.ts for ESM to the disk.');
    await writeFile(
      tsFilePath,
      codegenOutput.replace(BASEDIR_ASSIGNMENT_COMMENT, endpointAssignmentESM),
    );

    const esmJsFilePath = pathModule.join(artifactsDir, `index.${ext}`);
    if (await pathExists(esmJsFilePath)) {
      await fs.promises.unlink(esmJsFilePath);
    }

    if (fileType !== 'ts') {
      logger.info(`Compiling TS file as ES Module to "index.${ext}"`);
      compileTS(tsFilePath, ts.ModuleKind.ESNext, [jsFilePath, dtsFilePath]);

      if (ext === 'mjs') {
        const mjsFilePath = pathModule.join(artifactsDir, 'index.mjs');
        await fs.promises.rename(jsFilePath, mjsFilePath);
      }

      logger.info('Deleting index.ts');
      await fs.promises.unlink(tsFilePath);
    }
  };

  const cjsJob = async () => {
    logger.info('Writing index.ts for CJS to the disk.');
    await writeFile(
      tsFilePath,
      codegenOutput.replace(BASEDIR_ASSIGNMENT_COMMENT, endpointAssignmentCJS),
    );

    if (await pathExists(jsFilePath)) {
      await fs.promises.unlink(jsFilePath);
    }
    if (fileType !== 'ts') {
      logger.info('Compiling TS file as CommonJS Module to `index.js`');
      compileTS(tsFilePath, ts.ModuleKind.CommonJS, [jsFilePath, dtsFilePath]);

      logger.info('Deleting index.ts');
      await fs.promises.unlink(tsFilePath);
    }
  };

  const packageJsonJob =
    (moduleType: 'module' | 'commonjs', esmEntry: 'index.js' | 'index.mjs' = 'index.mjs') =>
    () =>
      writeJSON(
        pathModule.join(artifactsDir, 'package.json'),
        getMeshArtifactsPackageJson(moduleType, esmEntry),
      );

  const rootDir = pathModule.resolve('./');
  const tsConfigPath = pathModule.join(rootDir, 'tsconfig.json');
  const packageJsonPath = pathModule.join(rootDir, 'package.json');
  const hasTsConfig = await pathExists(tsConfigPath);
  const hasPackageJson = await pathExists(packageJsonPath);
  let tsConfigModule: string | undefined;
  let packageJsonType: string | undefined;
  if (hasTsConfig) {
    const tsConfig = JSON5.parse(await fs.promises.readFile(tsConfigPath, 'utf-8'));
    tsConfigModule = tsConfig?.compilerOptions?.module;
  }
  if (hasPackageJson) {
    const packageJson = JSON5.parse(await fs.promises.readFile(packageJsonPath, 'utf-8'));
    packageJsonType = packageJson?.type;
  }
  const plan = getMeshArtifactEmitPlan({
    hasTsConfig,
    tsConfigModule,
    hasPackageJson,
    packageJsonType,
    fileType,
  });
  if (plan.esmExt) {
    jobs.push(esmJob(plan.esmExt));
  }
  if (plan.cjs) {
    jobs.push(cjsJob);
  }
  if (plan.artifactsPackageType) {
    jobs.push(
      packageJsonJob(plan.artifactsPackageType, plan.esmExt === 'js' ? 'index.js' : 'index.mjs'),
    );
  }

  for (const job of jobs) {
    await job();
  }
}

export function compileTS(tsFilePath: string, module: ts.ModuleKind, outputFilePaths: string[]) {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module,
    sourceMap: false,
    inlineSourceMap: false,
    importHelpers: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    declaration: true,
  };
  const host = ts.createCompilerHost(options);

  const hostWriteFile = host.writeFile.bind(host);
  host.writeFile = (fileName, ...rest) => {
    if (outputFilePaths.some(f => pathModule.normalize(f) === pathModule.normalize(fileName))) {
      return hostWriteFile(fileName, ...rest);
    }
  };

  // Prepare and emit the d.ts files
  const program = ts.createProgram([tsFilePath], options, host);
  program.emit();
}

/**
 * If the specified path corresponds to a TypeScript file, replace
 * its extension to `.js`.
 *
 * @param {string} path The path to a potential TypeScript file
 * @returns {string}
 */
function replaceTypeScriptExtension(path: string): string {
  let modifiedPath = path;
  if (modifiedPath.toLowerCase().endsWith('.ts')) {
    const extensionStart = modifiedPath.lastIndexOf('.');
    modifiedPath = modifiedPath.substring(0, extensionStart).concat('.js');
  }
  return modifiedPath;
}
