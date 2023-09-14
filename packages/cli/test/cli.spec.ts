import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';
import { DEFAULT_CLI_PARAMS, graphqlMesh } from '../src/index';

describe('runtime', () => {
  it('dummy', async () => {});

  describe('build', () => {
    const generatedMeshConfiguration = '.mesh';

    it('Should strip the extension for a TS config file in the built Mesh index file', async () => {
      const tsConfigFolder = 'ts-config';
      await graphqlMesh(DEFAULT_CLI_PARAMS, [
        'build',
        `--dir=${pathModule.join(__dirname, tsConfigFolder)}`,
      ]);

      const meshConfigPath = pathModule.join(
        __dirname,
        tsConfigFolder,
        generatedMeshConfiguration,
        'index.ts',
      );
      const builtMesh = (await fs.promises.readFile(meshConfigPath)).toString();

      // Check that the import of the main Mesh module has gotten stripped its extension
      expect(builtMesh).toMatch(/import \* as importedModule(.*) from ".*\/\.meshrc";/);

      // Check that the reference to the relative module in the "importFn" function has gotten stripped its extension
      expect(builtMesh).toMatch(/case "\.meshrc":/);
    });

    it('Should strip the extension for a JS config file in the built Mesh index file', async () => {
      const jsConfigFolder = 'js-config';
      await graphqlMesh(DEFAULT_CLI_PARAMS, [
        'build',
        `--dir=${pathModule.join(__dirname, jsConfigFolder)}`,
      ]);

      const meshConfigPath = pathModule.join(
        __dirname,
        jsConfigFolder,
        generatedMeshConfiguration,
        'index.ts',
      );
      const builtMesh = (await fs.promises.readFile(meshConfigPath)).toString();

      // Check that the import of the main Mesh module has gotten stripped its extension
      expect(builtMesh).toMatch(/import \* as importedModule(.*) from ".*\/\.meshrc";/);

      // Check that the reference to the relative module in the "importFn" function has gotten stripped its extension
      expect(builtMesh).toMatch(/case "\.meshrc":/);
    });
  });
});
