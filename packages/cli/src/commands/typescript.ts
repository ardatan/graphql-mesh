import { Logger } from 'winston';
import { RawSourcesOutput } from '@graphql-mesh/runtime';
import { plugin as tsBasePlugin } from '@graphql-codegen/typescript';
import { plugin as tsResolversPlugin } from '@graphql-codegen/typescript-resolvers';
import { Types } from '@graphql-codegen/plugin-helpers';
import { GraphQLSchema } from 'graphql';

export async function generateTsTypes(
  logger: Logger,
  unifiedSchema: GraphQLSchema,
  rawSources: RawSourcesOutput
): Promise<string> {
  const unifiedContextIdentifier = 'MeshContext';

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

      if (source.handler.tsSupport) {
        return await source.handler.tsSupport({
          schema: source.schema,
          getMeshSourcePayload: source.meshSourcePayload,
          name: apiName
        });
      } else {
        logger.warn(
          `Mesh source ${apiName} doesn't support TypeScript, ignoring...`
        );
      }
    })
  );

  let sdkItems: string[] = [];
  let contextItems: string[] = [];
  let models: string[] = [];

  for (const item of results) {
    if (item) {
      if (item.sdk) {
        sdkItems.push(item.sdk.codeAst);
      }
      if (item.context) {
        contextItems.push(item.context.codeAst);
      }
      if (item.models) {
        contextItems.push(item.models);
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
    ...models,
    ...sdkItems,
    ...contextItems,
    contextType,
    ...(tsTypes.append || []),
    ...(tsResolversTypes.append || [])
  ]
    .filter(Boolean)
    .join('\n\n');
}
