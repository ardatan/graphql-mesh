import { getMeshSDK, Sdk } from '../.mesh';

let sdk$: Promise<Sdk>;

export function getSharedSdk() {
  sdk$ = sdk$ || getMeshSDK();
  return sdk$;
}
