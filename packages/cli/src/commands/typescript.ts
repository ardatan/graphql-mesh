import Maybe from 'graphql/tsutils/Maybe';
import { RawSourceOutput } from '@graphql-mesh/runtime';
import * as tsBasePlugin from '@graphql-codegen/typescript';
import * as tsResolversPlugin from '@graphql-codegen/typescript-resolvers';
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
  NamedTypeNode,
  Kind
} from 'graphql';
import { codegen } from '@graphql-codegen/core';
import { printSchemaWithDirectives } from '@graphql-toolkit/common';

const unifiedContextIdentifier = 'MeshContext';

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
  additionalContextIdentifier: string,
  type: Maybe<GraphQLObjectType>
): string[] {
  if (!type) {
    return [];
  }

  const fields = type.getFields();

  return Object.keys(fields).map(fieldName => {
    const field = fields[fieldName];
    const baseType = getBaseType(field.type);
    const argsName =
      field.args && field.args.length > 0
        ? `${type.name}${codegenHelpers.convertName(field.name)}Args`
        : 'never';

    return `  ${
      field.name
    }: (args: ${argsName}, context?: ${additionalContextIdentifier}, info?: GraphQLResolveInfo) => Promise<${codegenHelpers.getTypeToUse(
      {
        kind: Kind.NAMED_TYPE,
        name: {
          kind: Kind.NAME,
          value: baseType.name
        }
      }
    )}>`;
  });
}

function generateTypesForApi(options: {
  schema: GraphQLSchema;
  name: string;
  contextVariables: string[];
}) {
  const codegenHelpers = new CodegenHelpers(options.schema, {}, {});
  const sdkIdentifier = `${options.name}Sdk`;
  const additionalContextIdentifier = `${options.name}AdditionalContext`;
  const contextIdentifier = `${options.name}Context`;
  const operations = [
    ...buildSignatureBasedOnRootFields(
      codegenHelpers,
      additionalContextIdentifier,
      options.schema.getQueryType()
    ),
    ...buildSignatureBasedOnRootFields(
      codegenHelpers,
      additionalContextIdentifier,
      options.schema.getMutationType()
    ),
    ...buildSignatureBasedOnRootFields(
      codegenHelpers,
      additionalContextIdentifier,
      options.schema.getSubscriptionType()
    )
  ];

  const sdk = {
    identifier: sdkIdentifier,
    codeAst: `export type ${sdkIdentifier} = {
${operations.join(',\n')}
};`
  };

  const additionalContext = {
    identifier: additionalContextIdentifier,
    codeAst: `export type ${additionalContextIdentifier} = { 
      ${options.contextVariables.map(val => `${val}?: string | number,`)}
    };`
  }

  const context = {
    identifier: contextIdentifier,
    codeAst: `export type ${contextIdentifier} = { 
      ${options.name}: { config: Record<string, any>, api: ${sdkIdentifier} }, 
    } & ${additionalContextIdentifier};`
  };

  return {
    sdk,
    additionalContext,
    context
  };
}

export async function generateTsTypes(
  unifiedSchema: GraphQLSchema,
  rawSources: RawSourceOutput[]
): Promise<string> {
  return codegen({
    filename: 'types.ts',
    documents: [],
    config: {},
    schemaAst: unifiedSchema,
    schema: parse(printSchemaWithDirectives(unifiedSchema)),
    pluginMap: {
      typescript: tsBasePlugin,
      resolvers: tsResolversPlugin,
      contextSdk: {
        plugin: async () => {
          const results = await Promise.all(
            rawSources.map(async source => {
              return generateTypesForApi({
                schema: source.schema,
                name: source.name,
                contextVariables: source.contextVariables || []
              });
            })
          );

          let sdkItems: string[] = [];
          let additionalContextItems: string[] = [];
          let contextItems: string[] = [];

          for (const item of results) {
            if (item) {
              if (item.sdk) {
                sdkItems.push(item.sdk.codeAst);
              }
              if (item.additionalContext) {
                additionalContextItems.push(item.additionalContext.codeAst);
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
            content: [...sdkItems, ...additionalContextItems, ...contextItems, contextType].join('\n\n')
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
