import { Maybe, RawSourceOutput } from '@graphql-mesh/types';
import * as tsBasePlugin from '@graphql-codegen/typescript';
import * as tsResolversPlugin from '@graphql-codegen/typescript-resolvers';
import { GraphQLSchema, GraphQLObjectType, NamedTypeNode, Kind } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import { serverSideScalarsMap } from './scalars-map';
import { pascalCase } from 'pascal-case';
import { Source } from '@graphql-tools/utils';
import * as tsOperationsPlugin from '@graphql-codegen/typescript-operations';
import * as tsGenericSdkPlugin from '@graphql-codegen/typescript-generic-sdk';
import { isAbsolute, relative, join } from 'path';
import ts from 'typescript';
import { writeFile } from '@graphql-mesh/utils';

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
    const parentTypeNode = {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type.name,
      },
    };
    operationMap[fieldName] = `  ${field.name}: (params: {
      root?: any;
      args${argsExists ? '' : '?'}: ${argsName};
      context: ${unifiedContextIdentifier};
      info: GraphQLResolveInfo;
      selectionSet?: SelectionSetParamOrFactory;
    }) => Promise<${codegenHelpers.getTypeToUse(parentTypeNode)}['${fieldName}']>`;
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

export async function generateTsArtifacts({
  unifiedSchema,
  rawSources,
  mergerType = 'stitching',
  documents,
  flattenTypes,
  importedModulesSet,
  baseDir,
  meshConfigCode,
}: {
  unifiedSchema: GraphQLSchema;
  rawSources: RawSourceOutput[];
  mergerType: string;
  documents: Source[];
  flattenTypes: boolean;
  importedModulesSet: Set<string>;
  baseDir: string;
  meshConfigCode: string;
}) {
  const artifactsDir = join(baseDir, '.mesh');
  const codegenOutput = await codegen({
    filename: 'types.ts',
    documents,
    config: {
      scalars: serverSideScalarsMap,
      skipTypename: true,
      flattenGeneratedTypes: flattenTypes,
      onlyOperationTypes: flattenTypes,
      preResolveTypes: flattenTypes,
      namingConvention: 'keep',
      documentMode: 'documentNode',
    },
    schemaAst: unifiedSchema,
    schema: undefined as any, // This is not necessary on codegen.
    skipDocumentsValidation: true,
    pluginMap: {
      typescript: tsBasePlugin,
      typescriptOperations: tsOperationsPlugin,
      typescriptGenericSdk: tsGenericSdkPlugin,
      resolvers: tsResolversPlugin,
      contextSdk: {
        plugin: async () => {
          const commonTypes = [
            `import { MeshContext as BaseMeshContext } from '@graphql-mesh/runtime';`,
            `import { SelectionSetParamOrFactory } from '@graphql-mesh/types';`,
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
            `import { parse } from 'graphql';`,
            `import { getMesh } from '@graphql-mesh/runtime';`,
            `import { MeshStore, FsStoreStorageAdapter } from '@graphql-mesh/store';`,
            `import { cwd } from 'process';`,
            `import { relative, isAbsolute } from 'path';`,
          ];
          const importedModulesCodes: string[] = [...importedModulesSet].map((importedModuleName, i) => {
            let moduleMapProp = importedModuleName;
            let importPath = importedModuleName;
            if (importPath.startsWith('.')) {
              importPath = join(baseDir, importPath);
            }
            if (isAbsolute(importPath)) {
              moduleMapProp = relative(baseDir, importedModuleName);
              importPath = `./${relative(artifactsDir, importedModuleName)}`;
            }
            const importedModuleVariable = pascalCase(`ExternalModule$${i}`);
            importCodes.push(`import ${importedModuleVariable} from '${importPath}';`);
            return `  // @ts-ignore\n  [\`${moduleMapProp}\`]: ${importedModuleVariable}`;
          });

          const meshMethods = `
${importCodes.join('\n')}

const importedModules: Record<string, any> = {
${importedModulesCodes.join(',\n')}
};

const baseDir = cwd();

const syncImportFn = (moduleId: string) => {
  const relativeModuleId = isAbsolute(moduleId) ? relative(baseDir, moduleId) : moduleId;
  if (!(relativeModuleId in importedModules)) {
    throw new Error(\`Cannot find module '\${relativeModuleId}'.\`);
  }
  return importedModules[relativeModuleId];
};
const importFn = async (moduleId: string) => syncImportFn(moduleId);

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

export function getBuiltMesh() {
  const meshConfig = getMeshOptions();
  return getMesh(meshConfig);
}

export async function getMeshSDK() {
  const { sdkRequester } = await getBuiltMesh();
  return getSdk(sdkRequester);
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
        typescriptGenericSdk: {},
      },
    ],
  });

  const tsFilePath = join(artifactsDir, 'index.ts');
  await writeFile(tsFilePath, codegenOutput);

  const compilerOptions = {
    target: ts.ScriptTarget.ESNext,
    sourceMap: false,
    inlineSourceMap: false,
    importHelpers: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
  };

  const jsResult = ts.transpileModule(codegenOutput, {
    compilerOptions: {
      ...compilerOptions,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const jsFilePath = join(artifactsDir, 'index.js');
  await writeFile(jsFilePath, jsResult.outputText);

  const mjsResult = ts.transpileModule(codegenOutput, {
    compilerOptions: {
      ...compilerOptions,
      module: ts.ModuleKind.ESNext,
    },
  });
  const mjsFilePath = join(artifactsDir, 'index.mjs');
  await writeFile(mjsFilePath, mjsResult.outputText);
}
