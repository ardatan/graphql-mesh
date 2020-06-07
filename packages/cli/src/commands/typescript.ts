import { Maybe, RawSourceOutput } from '@graphql-mesh/types';
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
  NamedTypeNode,
  Kind,
} from 'graphql';
import { codegen } from '@graphql-codegen/core';
import { scalarsMap } from './scalars-map';

const unifiedContextIdentifier = 'MeshContext';

function isWrapperType(t: GraphQLOutputType): t is GraphQLNonNull<any> | GraphQLList<any> {
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
    const argsExists = field.args && field.args.length > 0;
    const argsName = argsExists ? `${type.name}${codegenHelpers.convertName(field.name)}Args` : '{}';
    return `  ${field.name}: (args${
      argsExists ? '' : '?'
    }: ${argsName}, projectionOptions?: ProjectionOptions) => Promise<${codegenHelpers.getTypeToUse({
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: baseType.name,
      },
    })}>`;
  });
}

function generateTypesForApi(options: { schema: GraphQLSchema; name: string; contextVariables: (keyof any)[] }) {
  const codegenHelpers = new CodegenHelpers(options.schema, {}, {});
  const sdkIdentifier = `${options.name}Sdk`;
  const additionalContextIdentifier = `${options.name}AdditionalContext`;
  const contextIdentifier = `${options.name}Context`;
  const operations = [
    ...buildSignatureBasedOnRootFields(codegenHelpers, additionalContextIdentifier, options.schema.getQueryType()),
    ...buildSignatureBasedOnRootFields(codegenHelpers, additionalContextIdentifier, options.schema.getMutationType()),
    ...buildSignatureBasedOnRootFields(
      codegenHelpers,
      additionalContextIdentifier,
      options.schema.getSubscriptionType()
    ),
  ];

  const sdk = {
    identifier: sdkIdentifier,
    codeAst: `export type ${sdkIdentifier} = {
${operations.join(',\n')}
};`,
  };

  const additionalContext = {
    identifier: additionalContextIdentifier,
    codeAst: `export type ${additionalContextIdentifier} = { 
      ${options.contextVariables.map(val => `${val.toString()}?: any,`)}
    };`,
  };

  const context = {
    identifier: contextIdentifier,
    codeAst: `export type ${contextIdentifier} = { 
      ${options.name}: { api: ${sdkIdentifier} }, 
    } & ${additionalContextIdentifier};`,
  };

  return {
    sdk,
    additionalContext,
    context,
  };
}

export function generateTsTypes(unifiedSchema: GraphQLSchema, rawSources: RawSourceOutput[]): Promise<string> {
  return codegen({
    filename: 'types.ts',
    documents: [],
    config: {
      scalars: scalarsMap,
    },
    schemaAst: unifiedSchema,
    schema: undefined as any, // This is not necessary on codegen.
    pluginMap: {
      typescript: tsBasePlugin,
      resolvers: tsResolversPlugin,
      contextSdk: {
        plugin: async () => {
          const commonTypes = [
            `export type SelectedFields = {
  [fieldName: string]: SelectedFields;
} | true;
export type ProjectionOptions = {
  /**
  * If you don't provide custom selection, this is the depth of generated selection set by GraphQL Mesh
  * default: 2
  */
  depth?: number;
  /**
  * Provide selection set in form of object similar to MongoDB's projection
  * example: { foo: { bar: true }, baz: true }
  */
  fields?: SelectedFields;
  /**
  * Provide selection set in form of GraphQL SDL
  * example: { foo bar baz }
  */
  selectionSet?: string;
}`,
          ];
          const sdkItems: string[] = [];
          const additionalContextItems: string[] = [];
          const contextItems: string[] = [];

          const results = await Promise.all(
            rawSources.map(source => {
              const item = generateTypesForApi({
                schema: unifiedSchema.extensions.stitchingInfo.transformedSchemas.get(source),
                name: source.name,
                contextVariables: source.contextVariables || [],
              });

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
              return item;
            })
          );

          const contextType = `export type ${unifiedContextIdentifier} = ${results
            .map(r => r?.context?.identifier)
            .filter(Boolean)
            .join(' & ')};`;

          return {
            content: [...commonTypes, ...sdkItems, ...additionalContextItems, ...contextItems, contextType].join(
              '\n\n'
            ),
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
          noSchemaStitching: true,
          contextType: unifiedContextIdentifier,
          federation: false,
        },
      },
      {
        contextSdk: {},
      },
    ],
  });
}
