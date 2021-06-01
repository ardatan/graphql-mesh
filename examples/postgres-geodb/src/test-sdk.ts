import { getBuiltMesh, getSdk } from '../.mesh/index';

async function testSdk(city: string) {
  console.log(`Loading Mesh Schema...`);
  const { sdkRequester, destroy } = await getBuiltMesh();
  console.log(`Loading Mesh SDK...`);
  const sdk = await getSdk(sdkRequester);
  try {
    console.log(`Running query, looking for GitHub developers from ${city}...`);
    const result = await sdk.citiesAndDevelopers({ city });

    console.table(result.allCities?.nodes[0]?.developers?.nodes, ['id', 'login', 'name', 'avatarUrl']);
  } catch (e) {
    console.error(e);
  }
  destroy();
}

testSdk(process.argv[2]).catch(e => console.error(e));
