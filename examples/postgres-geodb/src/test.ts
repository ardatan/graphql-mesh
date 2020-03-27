import { getSdk } from './sdk.generated';
import { parseConfig, getMesh } from '@graphql-mesh/runtime';

async function testSdk(city: string) {
  console.log(`Loading Mesh config...`)
  const meshConfig = await parseConfig();
  console.log(`Loading Mesh schema...`)
  const { sdkRequester, destroy } = await getMesh(meshConfig);
  try {
    const sdk = getSdk(sdkRequester);
    console.log(`Running query, looking for GitHub developers from ${city}...`)
    const result = await sdk.citiesAndDevelopers({ city });
    
    console.table(result.allCities?.nodes[0]?.developers.nodes, ['login', 'avatarUrl'])
  
  } catch(e) {
    debugger;
    console.error(e.message);
  }
  destroy();
} 

testSdk(process.argv[2]);