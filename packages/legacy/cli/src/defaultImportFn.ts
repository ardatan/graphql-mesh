import createJITI from 'jiti';
import type { ImportFn } from '@graphql-mesh/types';

const jiti = createJITI(__filename);

export const defaultImportFn: ImportFn = module => {
  return jiti.import(module, {}) as Promise<any>;
};
