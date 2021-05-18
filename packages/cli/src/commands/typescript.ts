import { Maybe, RawSourceOutput } from '@graphql-mesh/types';
import * as tsBasePlugin from '@graphql-codegen/typescript';
import * as tsResolversPlugin from '@graphql-codegen/typescript-resolvers';
import { GraphQLSchema, GraphQLObjectType, NamedTypeNode, Kind } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import { serverSideScalarsMap } from './scalars-map';
import { pascalCase } from 'pascal-case';

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
    const argsName = argsExists ? `${type.name}${codegenHelpers.convertName(field.name)}Args` : '{}';
    const parentTypeNode = {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type.name,
      },
    };
    operationMap[fieldName] = `  ${field.name}: (args${
      argsExists ? '' : '?'
    }: ${argsName}, projectionOptions?: ProjectionOptions) => Promise<${codegenHelpers.getTypeToUse(
      parentTypeNode
    )}['${fieldName}']>`;
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
  const operationMap = Object.assign({}, subscriptionsOperationMap, mutationOperationMap, queryOperationMap);

  const sdk = {
    identifier: sdkIdentifier,
    codeAst: `export type ${sdkIdentifier} = {
${Object.values(operationMap).join(',\n')}
};

export type Query${sdkIdentifier} = {
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
      ["${options.name}"]: { api: ${sdkIdentifier}, apiQuery: Query${sdkIdentifier}, apiMutation: Mutation${sdkIdentifier}, apiSubscription: Subscription${sdkIdentifier} }, 
    };`,
  };

  return {
    sdk,
    context,
  };
}

export function generateTsTypes(
  unifiedSchema: GraphQLSchema,
  rawSources: RawSourceOutput[],
  mergerType = 'stitching'
): Promise<string> {
  return codegen({
    filename: 'types.ts',
    documents: [],
    config: {
      scalars: serverSideScalarsMap,
      skipTypename: true,
    },
    schemaAst: unifiedSchema,
    schema: undefined as any, // This is not necessary on codegen.
    pluginMap: {
      typescript: tsBasePlugin,
      resolvers: tsResolversPlugin,
      contextSdk: {
        plugin: async () => {
          const commonTypes = [
            `import { MeshContext as BaseMeshContext, ProjectionOptions } from '@graphql-mesh/runtime';`,
          ];
          const sdkItems: string[] = [];
          const contextItems: string[] = [];
          const results = await Promise.all(
            rawSources.map(source => {
              const sourceMap = unifiedSchema.extensions.sourceMap as Map<RawSourceOutput, GraphQLSchema>;
              let sourceSchema = sourceMap.get(source);
              if (!sourceSchema) {
                for (const [keySource, valueSchema] of sourceMap.entries()) {
                  if (keySource.name === source.name) {
                    sourceSchema = valueSchema;
                  }
                }
              }
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

          return {
            content: [...commonTypes, ...sdkItems, ...contextItems, contextType].join('\n\n'),
          };
        },
      },
    },
    plugins: [
      {
        typescript: {
          namingConvention: {
            enumValues: 'keep',
          },
        },
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
    ],
  });
}
