import { getSdk } from './sdk.generated';
import { getMesh, findAndParseConfig } from '@graphql-mesh/runtime';

async function testSdk(city: string) {
  console.log(`Loading Mesh config...`);
  const meshConfig = await findAndParseConfig();
  console.log(`Loading Mesh schema...`);
  const { sdkRequester, destroy } = await getMesh(meshConfig);
  try {
    const sdk = getSdk(sdkRequester);
    console.log(`Running query, looking for GitHub developers from ${city}...`);
    const result = await sdk.citiesAndDevelopers({ city });

    console.table(result.allCities?.nodes[0]?.developers, ['login', 'avatarUrl']);
  } catch (e) {
    console.error(e);
  }
  destroy();
}

testSdk(process.argv[2]).catch(e => console.error(e));
