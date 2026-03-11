import {
  getCachedDocumentNodeFromSchema,
  type CodegenPlugin,
} from '@graphql-codegen/plugin-helpers';
import { path } from '@graphql-mesh/cross-helpers';
import { handleFederationSupergraph } from '@graphql-mesh/fusion-runtime';
import { defaultPrintFn } from '@graphql-mesh/transport-common';
import { writeFile } from '@graphql-mesh/utils';
import { wrapSchema } from '@graphql-tools/wrap';
import {
  generateIncontextSDKTypes,
  generateUnifiedContextTypeFromIdentifiers,
} from './generateIncontextSDKTypes';

export interface InContextSDKCodegenPluginConfig {}

export const codegenPlugin: CodegenPlugin = {
  async plugin(unifiedGraph, _documents, config, info) {
    const outputFileDirName = info.outputFile ? path.dirname(info.outputFile) : process.cwd();
    const { inContextSDK, getSubschema } = handleFederationSupergraph({
      unifiedGraph,
      getUnifiedGraphSDL() {
        return defaultPrintFn(getCachedDocumentNodeFromSchema(unifiedGraph));
      },
      onSubgraphExecute(subgraphName, executionRequest) {
        return {};
      },
    });
    const imports = new Set<string>();
    const identifiers = new Set<string>();
    for (const sourceName in inContextSDK) {
      const subschemaConfig = getSubschema(sourceName);
      const transformedSchema = wrapSchema(subschemaConfig);
      const typesResult = await generateIncontextSDKTypes({
        schema: transformedSchema,
        name: sourceName,
        contextVariables: {},
        flattenTypes: true,
        codegenConfig: {},
        unifiedContextIdentifier: '{}',
      });

      identifiers.add(typesResult.identifier);
      const targetPath = `./subgraphs/${sourceName}`;
      imports.add(`import type { ${typesResult.identifier} } from '${targetPath}';`);

      await writeFile(path.join(outputFileDirName, targetPath + '.ts'), typesResult.codeAst);
    }

    const unifiedContextType = generateUnifiedContextTypeFromIdentifiers([...identifiers]);

    const content = `
${[...imports].join('\n')}

${unifiedContextType}
`;

    return {
      content,
    };
  },
};
