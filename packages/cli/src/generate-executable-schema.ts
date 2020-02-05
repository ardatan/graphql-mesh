import { join } from 'path';
import { writeFileSync } from 'fs';
import { buildFileContentWithImports } from '@graphql-mesh/utils';
import { makeCleanImportRelative } from './utils';

export interface GenerateRootExecutableSchemaFileOptions {
  apisRootFiles: Record<string, string>;
  additionalImports: Set<string>;
  schemaFilePath: string;
  basePath: string;
}

export function generateRootExecutableSchemaFile({
  apisRootFiles,
  schemaFilePath,
  additionalImports,
  basePath
}: GenerateRootExecutableSchemaFileOptions): {
  executableSchemaFilePath: string;
  unifiedContextFilePath: string;
} {
  const outputFile = join(basePath, './index.ts');
  const contextFile = join(basePath, './context.ts');
  const imports = new Set<string>();
  imports.add(`import { makeExecutableSchema } from 'graphql-tools-fork';`);
  imports.add(`import { readFileSync } from 'fs';`);
  const contextIdentifiers: string[] = [];
  const contextTypesIdentifiers: { identifier: string; file: string }[] = [];
  const resolversIdentifiers: string[] = [];

  for (const additionalFilePath of additionalImports) {
    // TODO: Aliasing this
    resolversIdentifiers.push('additionalResolvers');
    imports.add(
      `import { resolvers as additionalResolvers } from '${makeCleanImportRelative(
        additionalFilePath,
        basePath
      )}';`
    );
  }

  for (const [apiName, indexFilePath] of Object.entries(apisRootFiles)) {
    const importPath = makeCleanImportRelative(indexFilePath, basePath);
    const contextIdentifier = `createContext${apiName}`;
    const resolversIdentifier = `resolvers${apiName}`;
    const contextTypeIdentifier = `${apiName}Context`;

    resolversIdentifiers.push(resolversIdentifier);
    contextIdentifiers.push(contextIdentifier);

    contextTypesIdentifiers.push({
      identifier: contextTypeIdentifier,
      file: importPath
    });

    imports.add(
      `import { createContext as ${contextIdentifier}, resolvers as ${resolversIdentifier} } from '${importPath}';`
    );
  }

  imports.add(`import { UnifiedMeshContext } from './context';`);

  const schemaString = `export const schemaAst = readFileSync('${schemaFilePath}', 'utf-8')`;
  const content = `export const schema = makeExecutableSchema<UnifiedMeshContext>({
  typeDefs: schemaAst,
  resolvers: [${resolversIdentifiers.join(', ')}]
});`;
  const context = `export const contextBuilderFn = () => {
    return [${contextIdentifiers.join(', ')}]
      .reduce((prev, contextFn) => {
        return {
          ...prev,
          ...contextFn()
        };
      }, {});
};`;
  const result = buildFileContentWithImports(
    imports,
    [schemaString, context, content, ''].join('\n\n')
  );

  writeFileSync(outputFile, result);

  const contextImports = new Set<string>(
    contextTypesIdentifiers.map(
      t => `import { ${t.identifier} } from '${t.file}';`
    )
  );
  writeFileSync(
    contextFile,
    buildFileContentWithImports(
      contextImports,
      `export type UnifiedMeshContext = ${contextTypesIdentifiers
        .map(t => t.identifier)
        .join(' & ')};`
    )
  );

  return {
    executableSchemaFilePath: outputFile,
    unifiedContextFilePath: contextFile
  };
}
