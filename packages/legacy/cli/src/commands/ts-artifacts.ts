import type { GraphQLObjectType, GraphQLSchema, NamedTypeNode } from 'graphql';
import { getNamedType, isAbstractType, Kind } from 'graphql';
import JSON5 from 'json5';
import { pascalCase } from 'pascal-case';
import ts from 'typescript';
import { codegen } from '@graphql-codegen/core';
import * as typedDocumentNodePlugin from '@graphql-codegen/typed-document-node';
import * as tsBasePlugin from '@graphql-codegen/typescript';
import * as typescriptGenericSdk from '@graphql-codegen/typescript-generic-sdk';
import * as tsOperationsPlugin from '@graphql-codegen/typescript-operations';
import * as tsResolversPlugin from '@graphql-codegen/typescript-resolvers';
import type { Source } from '@graphql-mesh/config';
import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';
import type { Logger, Maybe, RawSourceOutput, YamlConfig } from '@graphql-mesh/types';
import { pathExists, printWithCache, writeFile, writeJSON } from '@graphql-mesh/utils';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import type { GraphQLMeshCLIParams } from '../index.js';
import { generateOperations } from './generate-operations.js';

const unifiedContextIdentifier = 'MeshContext';

class CodegenHelpers extends tsBasePlugin.TsVisitor {
  public getTypeToUse(namedType: NamedTypeNode, isVisitingInputType: boolean): string {
    if (this.scalars[namedType.name.value]) {
      return this._getScalar(namedType.name.value, isVisitingInputType ? 'input' : 'output');
    }

    return this._getTypeForNode(namedType, isVisitingInputType);
  }
}

function buildSignatureBasedOnRootFields(
  codegenHelpers: CodegenHelpers,
  type: Maybe<GraphQLObjectType>,
  schema: GraphQLSchema,
): Record<string, string> {
  if (!type) {
    return {};
  }

  const fields = type.getFields();
  const operationMap: Record<string, string> = {};
  for (const fieldName in fields) {
    const field = fields[fieldName];
    const argsExists = field.args && field.args.length > 0;
    const argsName = argsExists ? `${type.name}${field.name}Args` : '{}';
    const parentTypeNode: NamedTypeNode = {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type.name,
      },
    };

    const namedFieldType = getNamedType(field.type);

    if (isAbstractType(namedFieldType)) {
      const possibleTypes = schema.getPossibleTypes(namedFieldType);
      const typeNamesDef = possibleTypes
        .map(possibleType =>
          codegenHelpers.getTypeToUse(
            {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: possibleType.name,
              },
            },
            false,
          ),
        )
        .join(' | ');
      const originalDef = field.type.toString();
      const def = originalDef.replace(namedFieldType.name, typeNamesDef);
      operationMap[fieldName] = `  /** ${field.description} **/\n  ${
        field.name
      }: InContextSdkMethod<${def}, ${argsName}, ${unifiedContextIdentifier}>`;
    } else {
      operationMap[fieldName] = `  /** ${field.description} **/\n  ${
        field.name
      }: InContextSdkMethod<${codegenHelpers.getTypeToUse(
        parentTypeNode,
        false,
      )}['${fieldName}'], ${argsName}, ${unifiedContextIdentifier}>`;
    }
  }
  return operationMap;
}

async function generateTypesForApi(options: {
  schema: GraphQLSchema;
  name: string;
  contextVariables: Record<string, string>;
  flattenTypes: boolean;
  codegenConfig: any;
}) {
  const config = {
    skipTypename: true,
    flattenGeneratedTypes: options.flattenTypes,
    onlyOperationTypes: options.flattenTypes,
    preResolveTypes: options.flattenTypes,
    namingConvention: 'keep',
    enumsAsTypes: true,
    ignoreEnumValuesFromSchema: true,
    useIndexSignature: true,
    ...options.codegenConfig,
  };
  const baseTypes = await codegen({
    filename: options.name + '_types.ts',
    documents: [],
    config,
    schemaAst: options.schema,
    schema: undefined as any, // This is not necessary on codegen. Will be removed later
    skipDocumentsValidation: true,
    plugins: [
      {
        typescript: {},
      },
    ],
    pluginMap: {
      typescript: tsBasePlugin,
    },
  });
  const codegenHelpers = new CodegenHelpers(options.schema, config, {});
  const namespace = pascalCase(`${options.name}Types`);
  const queryOperationMap = buildSignatureBasedOnRootFields(
    codegenHelpers,
    options.schema.getQueryType(),
    options.schema,
  );
  const mutationOperationMap = buildSignatureBasedOnRootFields(
    codegenHelpers,
    options.schema.getMutationType(),
    options.schema,
  );
  const subscriptionsOperationMap = buildSignatureBasedOnRootFields(
    codegenHelpers,
    options.schema.getSubscriptionType(),
    options.schema,
  );

  const codeAst = `
import { InContextSdkMethod } from '@graphql-mesh/types';
import { MeshContext } from '@graphql-mesh/runtime';

export namespace ${namespace} {
  ${baseTypes}
  export type QuerySdk = {
    ${Object.values(queryOperationMap).join(',\n')}
  };

  export type MutationSdk = {
    ${Object.values(mutationOperationMap).join(',\n')}
  };

  export type SubscriptionSdk = {
    ${Object.values(subscriptionsOperationMap).join(',\n')}
  };

  export type Context = {
      [${JSON.stringify(
        options.name,
      )}]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      ${Object.keys(options.contextVariables)
        .map(key => `[${JSON.stringify(key)}]: ${options.contextVariables[key]}`)
        .join(',\n')}
    };
}
`;

  return {
    identifier: namespace,
    codeAst,
  };
}

const BASEDIR_ASSIGNMENT_COMMENT = `/* BASEDIR_ASSIGNMENT */`;

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
          contextType: unifiedContextIdentifier,
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
                  const { identifier, codeAst } = await generateTypesForApi({
                    schema: sourceSchema,
                    name: source.name,
                    contextVariables: source.contextVariables,
                    flattenTypes,
                    codegenConfig,
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

              const contextType = `export type ${unifiedContextIdentifier} = ${results
                .map(r => `${r?.identifier}.Context`)
                .filter(Boolean)
                .join(' & ')} & BaseMeshContext;`;

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

  const packageJsonJob = (module: string) => () =>
    writeJSON(pathModule.join(artifactsDir, 'package.json'), {
      name: 'mesh-artifacts',
      private: true,
      type: module,
      main: 'index.js',
      module: 'index.mjs',
      sideEffects: false,
      typings: 'index.d.ts',
      typescript: {
        definition: 'index.d.ts',
      },
      exports: {
        '.': {
          require: './index.js',
          import: './index.mjs',
        },
        './*': {
          require: './*.js',
          import: './*.mjs',
        },
      },
    });

  function setTsConfigDefault() {
    jobs.push(cjsJob);
    if (fileType !== 'ts') {
      jobs.push(packageJsonJob('commonjs'));
    }
  }
  const rootDir = pathModule.resolve('./');
  const tsConfigPath = pathModule.join(rootDir, 'tsconfig.json');
  const packageJsonPath = pathModule.join(rootDir, 'package.json');
  if (await pathExists(tsConfigPath)) {
    // case tsconfig exists
    const tsConfigStr = await fs.promises.readFile(tsConfigPath, 'utf-8');
    const tsConfig = JSON5.parse(tsConfigStr);
    if (tsConfig?.compilerOptions?.module?.toLowerCase()?.startsWith('es')) {
      // case tsconfig set to esm
      jobs.push(esmJob('js'));
      if (fileType !== 'ts') {
        jobs.push(packageJsonJob('module'));
      }
    } else if (
      tsConfig?.compilerOptions?.module?.toLowerCase()?.startsWith('node') &&
      (await pathExists(packageJsonPath))
    ) {
      // case tsconfig set to node* and package.json exists
      const packageJsonStr = await fs.promises.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON5.parse(packageJsonStr);
      if (packageJson?.type === 'module') {
        // case package.json set to esm
        jobs.push(esmJob('js'));
        if (fileType !== 'ts') {
          jobs.push(packageJsonJob('module'));
        }
      } else {
        // case package.json set to cjs or not set
        setTsConfigDefault();
      }
    } else {
      // case tsconfig set to cjs or set to node* with no package.json
      setTsConfigDefault();
    }
  } else if (await pathExists(packageJsonPath)) {
    // case package.json exists
    const packageJsonStr = await fs.promises.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON5.parse(packageJsonStr);
    if (packageJson?.type === 'module') {
      // case package.json set to esm
      jobs.push(esmJob('js'));
      if (fileType !== 'ts') {
        jobs.push(packageJsonJob('module'));
      }
    } else {
      // case package.json set to cjs or not set
      jobs.push(esmJob('mjs'));
      if (fileType === 'js') {
        jobs.push(packageJsonJob('module'));
      } else {
        jobs.push(cjsJob);
        jobs.push(packageJsonJob('commonjs'));
      }
    }
  } else {
    // case no tsconfig and no package.json
    jobs.push(esmJob('mjs'));
    if (fileType === 'js') {
      jobs.push(packageJsonJob('module'));
    } else {
      jobs.push(cjsJob);
      jobs.push(packageJsonJob('commonjs'));
    }
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
