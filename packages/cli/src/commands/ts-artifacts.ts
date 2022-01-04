import { Logger, Maybe, RawSourceOutput, YamlConfig } from '@graphql-mesh/types';
import * as tsBasePlugin from '@graphql-codegen/typescript';
import * as tsResolversPlugin from '@graphql-codegen/typescript-resolvers';
import { GraphQLSchema, GraphQLObjectType, NamedTypeNode, Kind } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import { pascalCase } from 'pascal-case';
import { Source } from '@graphql-tools/utils';
import * as tsOperationsPlugin from '@graphql-codegen/typescript-operations';
import * as tsJitSdkPlugin from '@graphql-codegen/typescript-jit-sdk';
import { isAbsolute, relative, join, normalize } from 'path';
import ts from 'typescript';
import { writeFile, writeJSON } from '@graphql-mesh/utils';
import { promises as fsPromises } from 'fs';
import { generateOperations } from './generate-operations';

const { unlink, rename } = fsPromises;

const unifiedContextIdentifier = 'MeshContext';

class CodegenHelpers extends tsBasePlugin.TsVisitor {
  public getTypeToUse(namedType: NamedTypeNode): string {
    if (this.scalars[namedType.name.value]) {
      return this._getScalar(namedType.name.value);
    }

    return this._getTypeForNode(namedType);
  }
}

function buildSignatureBasedOnRootFields(
  codegenHelpers: CodegenHelpers,
  type: Maybe<GraphQLObjectType>
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

    operationMap[fieldName] = `  ${field.name}: InContextSdkMethod<${codegenHelpers.getTypeToUse(
      parentTypeNode
    )}['${fieldName}'], ${argsName}, ${unifiedContextIdentifier}>`;
  }
  return operationMap;
}

function generateTypesForApi(options: { schema: GraphQLSchema; name: string }) {
  const codegenHelpers = new CodegenHelpers(options.schema, {}, {});
  const sdkIdentifier = pascalCase(`${options.name}Sdk`);
  const contextIdentifier = pascalCase(`${options.name}Context`);
  const queryOperationMap = buildSignatureBasedOnRootFields(codegenHelpers, options.schema.getQueryType());
  const mutationOperationMap = buildSignatureBasedOnRootFields(codegenHelpers, options.schema.getMutationType());
  const subscriptionsOperationMap = buildSignatureBasedOnRootFields(
    codegenHelpers,
    options.schema.getSubscriptionType()
  );

  const sdk = {
    identifier: sdkIdentifier,
    codeAst: `export type Query${sdkIdentifier} = {
${Object.values(queryOperationMap).join(',\n')}
};

export type Mutation${sdkIdentifier} = {
${Object.values(mutationOperationMap).join(',\n')}
};

export type Subscription${sdkIdentifier} = {
${Object.values(subscriptionsOperationMap).join(',\n')}
};`,
  };

  const context = {
    identifier: contextIdentifier,
    codeAst: `export type ${contextIdentifier} = {
      ["${options.name}"]: { Query: Query${sdkIdentifier}, Mutation: Mutation${sdkIdentifier}, Subscription: Subscription${sdkIdentifier} },
    };`,
  };

  return {
    sdk,
    context,
  };
}

const BASEDIR_ASSIGNMENT_COMMENT = `/* BASEDIR_ASSIGNMENT */`;

export async function generateTsArtifacts({
  unifiedSchema,
  rawSources,
  mergerType = 'stitching',
  documents,
  flattenTypes,
  importedModulesSet,
  baseDir,
  meshConfigCode,
  logger,
  sdkConfig,
}: {
  unifiedSchema: GraphQLSchema;
  rawSources: RawSourceOutput[];
  mergerType: string;
  documents: Source[];
  flattenTypes: boolean;
  importedModulesSet: Set<string>;
  baseDir: string;
  meshConfigCode: string;
  logger: Logger;
  sdkConfig: YamlConfig.SDKConfig;
}) {
  const artifactsDir = join(baseDir, '.mesh');
  logger.info('Generating index file in TypeScript');
  const codegenOutput = await codegen({
    filename: 'types.ts',
    documents: sdkConfig?.generateOperations
      ? generateOperations(unifiedSchema, sdkConfig.generateOperations)
      : documents,
    config: {
      skipTypename: true,
      flattenGeneratedTypes: flattenTypes,
      onlyOperationTypes: flattenTypes,
      preResolveTypes: flattenTypes,
      namingConvention: 'keep',
      documentMode: 'documentNode',
      enumsAsTypes: true,
      ignoreEnumValuesFromSchema: true,
    },
    schemaAst: unifiedSchema,
    schema: undefined as any, // This is not necessary on codegen.
    skipDocumentsValidation: true,
    pluginMap: {
      typescript: tsBasePlugin,
      typescriptOperations: tsOperationsPlugin,
      typescriptJitSdk: tsJitSdkPlugin,
      resolvers: tsResolversPlugin,
      contextSdk: {
        plugin: async () => {
          const commonTypes = [
            `import { MeshContext as BaseMeshContext, MeshInstance } from '@graphql-mesh/runtime';`,
            `import { InContextSdkMethod } from '@graphql-mesh/types';`,
          ];
          const sdkItems: string[] = [];
          const contextItems: string[] = [];
          const results = await Promise.all(
            rawSources.map(source => {
              const sourceMap = unifiedSchema.extensions.sourceMap as Map<RawSourceOutput, GraphQLSchema>;
              const sourceSchema = sourceMap.get(source);
              const item = generateTypesForApi({
                schema: sourceSchema,
                name: source.name,
              });

              if (item) {
                if (item.sdk) {
                  sdkItems.push(item.sdk.codeAst);
                }
                if (item.context) {
                  contextItems.push(item.context.codeAst);
                }
              }
              return item;
            })
          );

          const contextType = `export type ${unifiedContextIdentifier} = ${results
            .map(r => r?.context?.identifier)
            .filter(Boolean)
            .join(' & ')} & BaseMeshContext;`;

          const importCodes = [
            `import { parse, DocumentNode } from 'graphql';`,
            `import { getMesh } from '@graphql-mesh/runtime';`,
            `import { MeshStore, FsStoreStorageAdapter } from '@graphql-mesh/store';`,
            `import { cwd } from 'process';`,
            `import { join, relative, isAbsolute, dirname } from 'path';`,
            `import { fileURLToPath } from 'url';`,
          ];
          const importedModulesCodes: string[] = [...importedModulesSet].map((importedModuleName, i) => {
            let moduleMapProp = importedModuleName;
            let importPath = importedModuleName;
            if (importPath.startsWith('.')) {
              importPath = join(baseDir, importPath);
            }
            if (isAbsolute(importPath)) {
              moduleMapProp = relative(baseDir, importedModuleName).split('\\').join('/');
              importPath = `./${relative(artifactsDir, importedModuleName).split('\\').join('/')}`;
            }
            const importedModuleVariable = pascalCase(`ExternalModule$${i}`);
            importCodes.push(`import ${importedModuleVariable} from '${importPath}';`);
            return `  // @ts-ignore\n  [${JSON.stringify(moduleMapProp)}]: ${importedModuleVariable}`;
          });

          const meshMethods = `
${importCodes.join('\n')}

const importedModules: Record<string, any> = {
${importedModulesCodes.join(',\n')}
};

${BASEDIR_ASSIGNMENT_COMMENT}

const importFn = (moduleId: string) => {
  const relativeModuleId = (isAbsolute(moduleId) ? relative(baseDir, moduleId) : moduleId).split('\\\\').join('/');
  if (!(relativeModuleId in importedModules)) {
    throw new Error(\`Cannot find module '\${relativeModuleId}'.\`);
  }
  return Promise.resolve(importedModules[relativeModuleId]);
};

const rootStore = new MeshStore('.mesh', new FsStoreStorageAdapter({
  cwd: baseDir,
  importFn,
}), {
  readonly: true,
  validate: false
});

${meshConfigCode}

export const documentsInSDL = /*#__PURE__*/ [${documents.map(
            documentSource => `/* GraphQL */\`${documentSource.rawSDL}\``
          )}];

export async function getBuiltMesh(): Promise<MeshInstance> {
  const meshConfig = await getMeshOptions();
  return getMesh(meshConfig);
}

export async function getMeshSDK<TGlobalContext = any, TGlobalRoot = any, TOperationContext = any, TOperationRoot = any>(sdkOptions?: SdkOptions<TGlobalContext, TGlobalRoot>) {
  const { schema } = await getBuiltMesh();
  return getSdk<TGlobalContext, TGlobalRoot, TOperationContext, TOperationRoot>(schema, {
    jitOptions: {
      disableLeafSerialization: true,
      disablingCapturingStackErrors: true
    },
    ...sdkOptions,
  });
}`;

          return {
            content: [...commonTypes, ...sdkItems, ...contextItems, contextType, meshMethods].join('\n\n'),
          };
        },
      },
    },
    plugins: [
      {
        typescript: {},
      },
      {
        resolvers: {
          useIndexSignature: true,
          noSchemaStitching: mergerType !== 'stitching',
          contextType: unifiedContextIdentifier,
          federation: mergerType === 'federation',
        },
      },
      {
        contextSdk: {},
      },
      {
        typescriptOperations: {},
      },
      {
        typescriptJitSdk: {},
      },
    ],
  });

  const baseUrlAssignmentESM = `const baseDir = join(dirname(fileURLToPath(import.meta.url)), '${relative(
    artifactsDir,
    baseDir
  )}');`;
  const baseUrlAssignmentCJS = `const baseDir = join(__dirname, '${relative(artifactsDir, baseDir)}');`;

  logger.info('Writing index.ts for ESM to the disk.');
  const tsFilePath = join(artifactsDir, 'index.ts');
  await writeFile(tsFilePath, codegenOutput.replace(BASEDIR_ASSIGNMENT_COMMENT, baseUrlAssignmentESM));

  logger.info('Compiling TS file as ES Module to `index.mjs`');
  const jsFilePath = join(artifactsDir, 'index.js');
  const dtsFilePath = join(artifactsDir, 'index.d.ts');
  compileTS(tsFilePath, ts.ModuleKind.ESNext, [jsFilePath, dtsFilePath]);

  const mjsFilePath = join(artifactsDir, 'index.mjs');
  await rename(jsFilePath, mjsFilePath);

  logger.info('Writing index.ts for CJS to the disk.');
  await writeFile(tsFilePath, codegenOutput.replace(BASEDIR_ASSIGNMENT_COMMENT, baseUrlAssignmentCJS));

  logger.info('Compiling TS file as CommonJS Module to `index.js`');
  compileTS(tsFilePath, ts.ModuleKind.CommonJS, [jsFilePath, dtsFilePath]);

  await writeJSON(join(artifactsDir, 'package.json'), {
    name: 'mesh-artifacts',
    private: true,
    type: 'commonjs',
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

  logger.info('Deleting index.ts');
  await unlink(tsFilePath);
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
    if (outputFilePaths.some(f => normalize(f) === normalize(fileName))) {
      return hostWriteFile(fileName, ...rest);
    }
  };

  // Prepare and emit the d.ts files
  const program = ts.createProgram([tsFilePath], options, host);
  program.emit();
}
