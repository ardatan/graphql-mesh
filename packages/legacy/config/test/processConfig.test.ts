import { path as pathModule } from '@graphql-mesh/cross-helpers';
import { writeFile } from '@graphql-mesh/utils';
import { processConfig } from '../src/process';

describe('processConfig', () => {
  const generatedMeshConfiguration = '.mesh';

  it('should be possible to load custom fetch function', async () => {
    const config = await processConfig(
      {
        customFetch: './mesh-config-sources/custom-fetch.ts',
        sources: [],
      },
      {
        dir: __dirname,
        generateCode: true,
      },
    );

    // Verify that the code has been generated
    expect(config).toBeDefined();
    expect(config.importCodes).toBeDefined();

    let meshConfigContent = '';

    // Find the custom fetch
    const importCodesIterator = config.importCodes.values();
    let importCodesIteratorResult = importCodesIterator.next();
    let includesCustomFetch;
    while (!importCodesIteratorResult.done) {
      if (importCodesIteratorResult.value.startsWith('import fetchFn from')) {
        meshConfigContent = meshConfigContent.concat(importCodesIteratorResult.value, '\n');
        includesCustomFetch = true;
        break;
      }
      importCodesIteratorResult = importCodesIterator.next();
    }
    expect(includesCustomFetch).toBeTruthy();

    expect(meshConfigContent).toBeDefined();

    // Adding export of fetch function so its resolution is actually attempted
    meshConfigContent = meshConfigContent.concat('export { fetchFn };', '\n');

    // Create a .ts file with the codes and importCodes content
    const meshConfigPath = pathModule.join(__dirname, generatedMeshConfiguration, '/index.ts');
    await writeFile(meshConfigPath, meshConfigContent);

    const { fetchFn } = await import(meshConfigPath);
    expect(fetchFn).toBeDefined();
  });
});
