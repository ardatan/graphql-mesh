import { RawSourcesOutput } from '@graphql-mesh/runtime';
import { plugin as tsBasePlugin } from '@graphql-codegen/typescript';
import { plugin as tsResolversPlugin } from '@graphql-codegen/typescript-resolvers';
import { Types } from '@graphql-codegen/plugin-helpers';
import { GraphQLSchema } from 'graphql';
import { pascalCase } from 'change-case';

const unifiedContextIdentifier = 'MeshContext';

function generateTypesForApi(options: {
  schema: GraphQLSchema;
  name: string;
  getMeshSourcePayload: any;
}) {
  const sdkIdentifier = `${options.name}Sdk`;
  const contextIdentifier = `${options.name}Context`;
  const operations = options.getMeshSourcePayload.preprocessingData.operations;

  const sdk = {
    identifier: sdkIdentifier,
    codeAst: `export type ${sdkIdentifier} = {
${Object.keys(operations)
  .map(operationName => {
    const operation = operations[operationName];
    const operationGqlBaseType =
      operation.method === 'get'
        ? options.schema.getQueryType()?.name
        : options.schema.getMutationType()?.name;
    const argsName = `${operationGqlBaseType}${pascalCase(
      operation.operationId
    )}Args`;

    return `  ${
      operation.operationId
    }: (args: ${argsName}, context: ${unifiedContextIdentifier}, info: GraphQLResolveInfo) => Promise<${pascalCase(
      operation.responseDefinition.graphQLTypeName
    )}>`;
  })
  .join(',\n')}
};`
  };

  const context = {
    identifier: contextIdentifier,
    codeAst: `export type ${contextIdentifier} = { ${options.name}: { config: Record<string, any>, api: ${sdkIdentifier} } };`
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
        getMeshSourcePayload: source.meshSourcePayload,
        name: apiName
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
    `import { GraphQLResolveInfo } from 'graphql';`,
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
