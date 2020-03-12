import Maybe from 'graphql/tsutils/Maybe';
import { RawSourcesOutput } from '@graphql-mesh/runtime';
import { plugin as tsBasePlugin } from '@graphql-codegen/typescript';
import { plugin as tsResolversPlugin } from '@graphql-codegen/typescript-resolvers';
import { Types } from '@graphql-codegen/plugin-helpers';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLNonNull,
  GraphQLList,
  isListType,
  isNonNullType,
  GraphQLNamedType
} from 'graphql';
import { pascalCase } from 'pascal-case';

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
function buildSignatureBasedOnRootFields(type: Maybe<GraphQLObjectType>): string[] {
  if (!type) {
    return [];
  }

  const fields = type.getFields();

  return Object.keys(fields).map(fieldName => {
    const field = fields[fieldName];
    const baseType = getBaseType(field.type);
    const argsName = `${type.name}${pascalCase(field.name)}Args`;

    return `  ${
      field.name
    }: (args: ${argsName}, context: ${unifiedContextIdentifier}, info: GraphQLResolveInfo) => Promise<${pascalCase(
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
  const tsTypes = (await tsBasePlugin(
    unifiedSchema,
    [],
    {}
  )) as Types.ComplexPluginOutput;
  const tsResolversTypes = (await tsResolversPlugin(unifiedSchema, [], {
    useIndexSignature: true,
    noSchemaStitching: true,
    contextType: unifiedContextIdentifier,
    federation: false
  })) as Types.ComplexPluginOutput;

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

  return [
    ...(tsTypes.prepend || []),
    ...(tsResolversTypes.prepend || []),
    tsTypes.content,
    tsResolversTypes.content,
    ...sdkItems,
    ...contextItems,
    contextType,
    ...(tsTypes.append || []),
    ...(tsResolversTypes.append || [])
  ]
    .filter(Boolean)
    .join('\n\n');
}
