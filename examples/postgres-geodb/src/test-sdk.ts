import { getMeshSDK } from '../.mesh';

async function testSdk(city: string) {
  console.log(`Loading Mesh SDK...`);
  const sdk = getMeshSDK();
  try {
    console.log(`Running query, looking for GitHub developers from ${city}...`);
    const result = await sdk.citiesAndDevelopers({ city });

    console.table(result.allCities?.nodes[0]?.developers, ['id', 'login', 'name', 'avatarUrl']);
  } catch (e) {
    console.error(e);
  }
}

testSdk(process.argv[2]).catch(e => console.error(e));
