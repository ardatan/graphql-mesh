import { getSdk } from './src/generated/sdk';
import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';

const app = async () => {
  console.log('initiating sdk...');

  const meshConfig = await findAndParseConfig();
  const { sdkRequester } = await getMesh(meshConfig);
  const sdk = getSdk(sdkRequester);

  console.log('sdk ready');

  return sdk;
};

export default app;

const testRun = async () => {
  const sdk = await app();

  const res = await sdk.companyQuery();

  console.log(res);
};

testRun();