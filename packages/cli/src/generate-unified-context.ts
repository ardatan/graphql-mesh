import { makeCleanImportRelative, buildFileContentWithImports } from '@graphql-mesh/utils';
import { writeFileSync } from 'fs';
import { join } from 'path';

export interface GenerateUnifiedContextOptions {
  basePath: string;
  apisRootFiles: Record<string, string>;
  identifier?: string;
  outputPath: string;
}

export const DEFAULT_IDENTIFIER = 'UnifiedMeshContext';

export function generateUnifiedContext({
  basePath,
  apisRootFiles,
  outputPath,
  identifier = DEFAULT_IDENTIFIER
}: GenerateUnifiedContextOptions): { filePath: string; identifier: string } {
  const contextTypesIdentifiers: { identifier: string; file: string }[] = [];

  for (const [apiName, indexFilePath] of Object.entries(apisRootFiles)) {
    const contextTypeIdentifier = `${apiName}Context`;
    const importPath = makeCleanImportRelative(indexFilePath, basePath);

    contextTypesIdentifiers.push({
      identifier: contextTypeIdentifier,
      file: importPath
    });
  }

  const contextImports = new Set<string>(
    contextTypesIdentifiers.map(
      t => `import { ${t.identifier} } from '${t.file}';`
    )
  );

  writeFileSync(
    outputPath,
    buildFileContentWithImports(
      contextImports,
      `export type ${identifier} = ${contextTypesIdentifiers
        .map(t => t.identifier)
        .join(' & ')};`
    )
  );

  return {
    filePath: outputPath,
    identifier
  };
}
