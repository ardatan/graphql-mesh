import { join } from 'path';
import { writeFileSync } from 'fs';
import { makeCleanImportRelative, buildFileContentWithImports } from '@graphql-mesh/utils';

export interface GenerateRootExecutableSchemaFileOptions {
  apisRootFiles: Record<string, string>;
  additionalImports: Set<string>;
  schemaFilePath: string;
  basePath: string;
  unifiedContext: { path: string, identifier: string };
}

export function generateRootExecutableSchemaFile({
  apisRootFiles,
  schemaFilePath,
  additionalImports,
  basePath,
  unifiedContext
}: GenerateRootExecutableSchemaFileOptions): {
  filePath: string;
} {
  const outputFile = join(basePath, './index.ts');
  const imports = new Set<string>();
  imports.add(`import { makeExecutableSchema } from 'graphql-tools-fork';`);
  imports.add(`import { readFileSync } from 'fs';`);
  const contextIdentifiers: string[] = [];
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

    resolversIdentifiers.push(resolversIdentifier);
    contextIdentifiers.push(contextIdentifier);

    imports.add(
      `import { createContext as ${contextIdentifier}, resolvers as ${resolversIdentifier} } from '${importPath}';`
    );
  }

  imports.add(`import { ${unifiedContext.identifier} } from '${makeCleanImportRelative(unifiedContext.path, basePath)}';`);

  const schemaString = `export const schemaAst = readFileSync('${schemaFilePath}', 'utf-8')`;
  const content = `export const schema = makeExecutableSchema<${unifiedContext.identifier}>({
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

  return {
    filePath: outputFile
  };
}
