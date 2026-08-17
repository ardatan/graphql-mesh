import { getMeshSDK } from './.mesh/index.js';

async function main() {
  const sdk = getMeshSDK();
  console.log(await sdk.HelloWorld());
}

main();
