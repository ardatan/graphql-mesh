import { Maybe, RawSourceOutput } from '@graphql-mesh/types';
import * as tsBasePlugin from '@graphql-codegen/typescript';
import * as tsResolversPlugin from '@graphql-codegen/typescript-resolvers';
import { GraphQLSchema, GraphQLObjectType, NamedTypeNode, Kind } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import { scalarsMap } from './scalars-map';

const unifiedContextIdentifier = 'MeshContext';

class CodegenHelpers extends tsBasePlugin.TsVisitor {
  public getTypeToUse(namedType: NamedTypeNode): string {
    if (this.scalars[namedType.name.value]) {
      return this._getScalar(namedType.name.value);
    }

    return this._getTypeForNode(namedType);
  }
}

function buildSignatureBasedOnRootFields(codegenHelpers: CodegenHelpers, type: Maybe<GraphQLObjectType>): string[] {
  if (!type) {
    return [];
  }

  const fields = type.getFields();

  return Object.keys(fields).map(fieldName => {
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
    return `  ${field.name}: (args${
      argsExists ? '' : '?'
    }: ${argsName}, projectionOptions?: ProjectionOptions) => Promise<${codegenHelpers.getTypeToUse(
      parentTypeNode
    )}['${fieldName}']>`;
  });
}

function generateTypesForApi(options: { schema: GraphQLSchema; name: string }) {
  const codegenHelpers = new CodegenHelpers(options.schema, {}, {});
  const sdkIdentifier = `${options.name}Sdk`;
  const contextIdentifier = `${options.name}Context`;
  const operations = [
    ...buildSignatureBasedOnRootFields(codegenHelpers, options.schema.getQueryType()),
    ...buildSignatureBasedOnRootFields(codegenHelpers, options.schema.getMutationType()),
    ...buildSignatureBasedOnRootFields(codegenHelpers, options.schema.getSubscriptionType()),
  ];

  const sdk = {
    identifier: sdkIdentifier,
    codeAst: `export type ${sdkIdentifier} = {
${operations.join(',\n')}
};`,
  };

  const context = {
    identifier: contextIdentifier,
    codeAst: `export type ${contextIdentifier} = { 
      ${options.name}: { api: ${sdkIdentifier} }, 
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
      scalars: scalarsMap,
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
            `import { MeshContext as OriginalMeshContext, ProjectionOptions } from '@graphql-mesh/runtime';`,
          ];
          const sdkItems: string[] = [];
          const contextItems: string[] = [];

          const results = await Promise.all(
            rawSources.map(source => {
              const item = generateTypesForApi({
                schema: unifiedSchema.extensions.sourceMap.get(source),
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
            .join(' & ')} & OriginalMeshContext;`;

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
