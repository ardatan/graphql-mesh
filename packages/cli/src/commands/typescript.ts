import Maybe from 'graphql/tsutils/Maybe';
import { RawSourcesOutput } from '@graphql-mesh/runtime';
import * as tsBasePlugin from '@graphql-codegen/typescript';
import * as tsResolversPlugin from '@graphql-codegen/typescript-resolvers';
import { BaseVisitor } from '@graphql-codegen/visitor-plugin-common';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLNonNull,
  GraphQLList,
  isListType,
  isNonNullType,
  GraphQLNamedType,
  parse,
  printSchema
} from 'graphql';
import { codegen } from '@graphql-codegen/core';

const unifiedContextIdentifier = 'MeshContext';
const baseVisitor = new BaseVisitor({}, {});

function isWrapperType(
  t: GraphQLOutputType
): t is GraphQLNonNull<any> | GraphQLList<any> {
  return isListType(t) || isNonNullType(t);
}

function getBaseType(type: GraphQLOutputType): GraphQLNamedType {
  if (isWrapperType(type)) {
    return getBaseType(type.ofType);
  } else {
    return type;
  }
}
function buildSignatureBasedOnRootFields(
  type: Maybe<GraphQLObjectType>
): string[] {
  if (!type) {
    return [];
  }

  const fields = type.getFields();

  return Object.keys(fields).map(fieldName => {
    const field = fields[fieldName];
    const baseType = getBaseType(field.type);
    const argsName = field.args && field.args.length > 0 ? `${type.name}${baseVisitor.convertName(field.name)}Args` : 'never';

    return `  ${
      field.name
    }: (args: ${argsName}, context: ${unifiedContextIdentifier}, info: GraphQLResolveInfo) => Promise<${baseVisitor.convertName(
      baseType.name
    )}>`;
  });
}

function generateTypesForApi(options: { schema: GraphQLSchema; name: string; contextVariables: string[] }) {
  const sdkIdentifier = `${options.name}Sdk`;
  const contextIdentifier = `${options.name}Context`;
  const operations = [
    ...buildSignatureBasedOnRootFields(options.schema.getQueryType()),
    ...buildSignatureBasedOnRootFields(options.schema.getMutationType()),
    ...buildSignatureBasedOnRootFields(options.schema.getSubscriptionType())
  ];

  const sdk = {
    identifier: sdkIdentifier,
    codeAst: `export type ${sdkIdentifier} = {
${operations.join(',\n')}
};`
  };

  const context = {
    identifier: contextIdentifier,
    codeAst: `export type ${contextIdentifier} = { 
      ${options.name}: { config: Record<string, any>, api: ${sdkIdentifier} }, 
      ${options.contextVariables.map(val => `${val}?: string | number,`)}
    };`
  };

  return {
    sdk,
    context
  };
}

export async function generateTsTypes(
  unifiedSchema: GraphQLSchema,
  rawSources: RawSourcesOutput
): Promise<string> {
  return codegen({
    filename: 'types.ts',
    documents: [],
    config: {},
    schemaAst: unifiedSchema,
    schema: parse(printSchema(unifiedSchema)),
    pluginMap: {
      typescript: tsBasePlugin,
      resolvers: tsResolversPlugin,
      contextSdk: {
        plugin: async () => {
          const results = await Promise.all(
            Object.keys(rawSources).map(async apiName => {
              const source = rawSources[apiName];

              return generateTypesForApi({
                schema: source.schema,
                name: apiName,
                contextVariables: source.contextVariables || [],
              });
            })
          );

          let sdkItems: string[] = [];
          let contextItems: string[] = [];

          for (const item of results) {
            if (item) {
              if (item.sdk) {
                sdkItems.push(item.sdk.codeAst);
              }
              if (item.context) {
                contextItems.push(item.context.codeAst);
              }
            }
          }

          const contextType = `export type ${unifiedContextIdentifier} = ${results
            .filter(r => r && r.context)
            .map(r => r?.context?.identifier)
            .join(' & ')};`;

          return {
            content: [...sdkItems, ...contextItems, contextType].join('\n\n')
          };
        }
      }
    },
    plugins: [
      {
        typescript: {}
      },
      {
        resolvers: {
          useIndexSignature: true,
          noSchemaStitching: true,
          contextType: unifiedContextIdentifier,
          federation: false
        }
      },
      {
        contextSdk: {}
      }
    ]
  });
}
