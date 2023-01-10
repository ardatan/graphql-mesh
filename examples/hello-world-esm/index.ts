import { getMeshSDK } from './.mesh/index.mjs';

async function main() {
  const sdk = getMeshSDK();
  console.log(await sdk.HelloWorld());
}

main();
