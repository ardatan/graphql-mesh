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

    it('should include renderGraphiQL import and usage in generated artifacts when playground.offline is true', async () => {
      const configFolder = 'playground-offline-config';
      await graphqlMesh(DEFAULT_CLI_PARAMS, [
        'build',
        `--dir=${pathModule.resolve(__dirname, configFolder)}`,
      ]);

      const meshConfigPath = pathModule.resolve(
        __dirname,
        configFolder,
        generatedMeshConfiguration,
        'index.ts',
      );
      const builtMesh = (await fs.promises.readFile(meshConfigPath)).toString();

      // The generated artifact must import renderGraphiQL from @graphql-yoga/render-graphiql
      expect(builtMesh).toMatch(
        /import\s+\{[^}]*renderGraphiQL[^}]*\}\s+from\s+'@graphql-yoga\/render-graphiql'/,
      );
      // And pass it to createMeshHTTPHandler
      expect(builtMesh).toMatch(/renderGraphiQL,/);
    });

    it('should not include renderGraphiQL import in generated artifacts when playground.offline is not set', async () => {
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

      // renderGraphiQL should not be present in regular (non-offline-playground) artifacts
      expect(builtMesh).not.toMatch(/@graphql-yoga\/render-graphiql/);
    });

    it('writes under-the-hood supergraph.graphql.ts (and .graphql) for multi-source builds', async () => {
      const configFolder = 'multi-source-config';
      await graphqlMesh(DEFAULT_CLI_PARAMS, [
        'build',
        `--dir=${pathModule.resolve(__dirname, configFolder)}`,
      ]);

      const artifactsDir = pathModule.resolve(__dirname, configFolder, generatedMeshConfiguration);
      const supergraphGraphql = await fs.promises.readFile(
        pathModule.join(artifactsDir, 'supergraph.graphql'),
        'utf8',
      );
      const supergraphGraphqlTs = await fs.promises.readFile(
        pathModule.join(artifactsDir, 'supergraph.graphql.ts'),
        'utf8',
      );
      const supergraphGraphqlJs = await fs.promises.readFile(
        pathModule.join(artifactsDir, 'supergraph.graphql.js'),
        'utf8',
      );

      expect(supergraphGraphql).toContain('join__Graph');
      expect(supergraphGraphql).not.toContain('mesh://legacy/');
      expect(supergraphGraphqlTs).toMatch(/export default \/\*\s*GraphQL\s*\*\/ `/);
      expect(supergraphGraphqlTs).toContain('join__Graph');
      expect(supergraphGraphqlTs).not.toContain('createBuiltHiveGateway');
      expect(supergraphGraphqlTs).not.toContain('createGatewayRuntime');
      expect(supergraphGraphqlTs).not.toContain('export const supergraphSdl');
      expect(supergraphGraphqlJs).toMatch(/export default \/\*\s*GraphQL\s*\*\/ `/);
      expect(supergraphGraphqlJs).toContain('join__Graph');

      const indexPath = pathModule.join(artifactsDir, 'index.ts');
      const builtMesh = await fs.promises.readFile(indexPath, 'utf8');
      // Must import the loadable JS module — `./supergraph.graphql` resolves to plain SDL.
      expect(builtMesh).toContain(`import supergraph from './supergraph.graphql.js'`);
      expect(builtMesh).not.toContain(`import supergraph from './supergraph.graphql';`);
      expect(builtMesh).toContain('createMeshHTTPHandler');
      expect(builtMesh).not.toContain('createBuiltHiveGateway');

      // Runtime resolution outside Jest's VM (jiti + native ESM deps need a real Node process).
      const { execFile } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execFileAsync = promisify(execFile);
      const { stdout } = await execFileAsync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `
            import { createJiti } from 'jiti';
            const jiti = createJiti('', { interopDefault: true });
            const sg = await jiti.import(${JSON.stringify(
              pathModule.join(artifactsDir, 'supergraph.graphql.js'),
            )}, { default: true });
            if (typeof sg !== 'string' || !sg.includes('join__Graph')) {
              throw new Error('supergraph.graphql.js did not load as SDL string');
            }
            const mod = await jiti.import(${JSON.stringify(indexPath)});
            if (typeof mod.createBuiltMeshHTTPHandler !== 'function') {
              throw new Error('generated index missing createBuiltMeshHTTPHandler');
            }
            if (typeof mod.getBuiltMesh !== 'function') {
              throw new Error('generated index missing getBuiltMesh');
            }
            console.log('LOADED_OK');
          `,
        ],
        { cwd: pathModule.resolve(__dirname, '../../..') },
      );
      expect(stdout).toContain('LOADED_OK');
    });
  });
});
