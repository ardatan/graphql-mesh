import { writeFileSync } from 'fs';
import { buildFileContentWithImports } from '@graphql-mesh/utils';
import { makeCleanImportRelative } from './utils';

export interface GenerateRootExecutableSchemaFileOptions {
  apisRootFiles: Record<string, string>;
  additionalImports: Set<string>;
  schemaFilePath: string;
  outputFile: string;
  basePath: string;
}

export function generateRootExecutableSchemaFile({
  apisRootFiles,
  schemaFilePath,
  additionalImports,
  outputFile,
  basePath
}: GenerateRootExecutableSchemaFileOptions) {
  const imports = new Set<string>();
  imports.add(`import { makeExecutableSchema } from 'graphql-tools-fork';`);
  imports.add(`import { readFileSync } from 'fs';`);
  const contextIdentifiers: string[] = [];
  const contextTypesIdentifiers: string[] = [];
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
    const contextIdentifier = `createContext${apiName}`;
    const resolversIdentifier = `resolvers${apiName}`;
    const contextTypeIdentifier = `${apiName}Context`;
    contextIdentifiers.push(contextIdentifier);
    contextTypesIdentifiers.push(contextTypeIdentifier);
    resolversIdentifiers.push(resolversIdentifier);
    imports.add(
      `import { createContext as ${contextIdentifier}, ${contextTypeIdentifier}, resolvers as ${resolversIdentifier} } from '${makeCleanImportRelative(
        indexFilePath,
        basePath
      )}';`
    );
  }

  const schemaString = `export const schemaAst = readFileSync('${schemaFilePath}', 'utf-8')`;
  const content = `export const schema = makeExecutableSchema<${contextTypesIdentifiers.join(
    ' & '
  )}>({
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
}
