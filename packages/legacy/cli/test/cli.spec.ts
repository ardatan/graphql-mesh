import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';
import { DEFAULT_CLI_PARAMS, graphqlMesh } from '../src/index';

describe('runtime', () => {
  describe('build', () => {
    const generatedMeshConfiguration = '.mesh';

    it('Should replace the `.ts` extension of a config file in the built Mesh index file for the `.js` extension', async () => {
      const tsConfigFolder = 'ts-config';
      await graphqlMesh(DEFAULT_CLI_PARAMS, [
        'build',
        `--dir=${pathModule.resolve(__dirname, tsConfigFolder)}`,
      ]);

      const meshConfigPath = pathModule.resolve(
        __dirname,
        tsConfigFolder,
        generatedMeshConfiguration,
        'index.ts',
      );
      const builtMesh = (await fs.promises.readFile(meshConfigPath)).toString();

      // Check that the import of the main Mesh module has replaced the extension
      expect(builtMesh).toMatch(/import\(".*\/\.meshrc.js"\)/);

      // Case should stay the same
      expect(builtMesh).toMatch(/case "\.meshrc.ts":/);
    });

    it('Should clear meshInstance$ on failure so subsequent calls retry', async () => {
      const tsConfigFolder = 'ts-config';
      await graphqlMesh(DEFAULT_CLI_PARAMS, [
        'build',
        `--dir=${pathModule.resolve(__dirname, tsConfigFolder)}`,
      ]);

      const meshConfigPath = pathModule.resolve(
        __dirname,
        tsConfigFolder,
        generatedMeshConfiguration,
        'index.ts',
      );
      const builtMesh = (await fs.promises.readFile(meshConfigPath)).toString();

      // The catch must reset meshInstance$ so a failed build doesn't get permanently cached
      expect(builtMesh).toMatch(/\.catch\(/);
      expect(builtMesh).toMatch(/meshInstance\$\s*=\s*undefined/);
    });

    it('Should keep the `.js` extension of a config file in the built Mesh index file', async () => {
      const jsConfigFolder = 'js-config';
      await graphqlMesh(DEFAULT_CLI_PARAMS, [
        'build',
        `--dir=${pathModule.resolve(__dirname, jsConfigFolder)}`,
      ]);

      const meshConfigPath = pathModule.resolve(
        __dirname,
        jsConfigFolder,
        generatedMeshConfiguration,
        'index.ts',
      );
      const builtMesh = (await fs.promises.readFile(meshConfigPath)).toString();

      // Check that the import of the main Mesh module has kept the file's extension
      expect(builtMesh).toMatch(/import\(".*\/\.meshrc.js"\)/);

      // Check that the reference to the relative module in the "importFn" function has kept the file's extension
      expect(builtMesh).toMatch(/case "\.meshrc.js":/);
    });
  });
});
