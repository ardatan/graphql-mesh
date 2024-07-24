import createJITI from 'jiti';
import type { ImportFn } from '@graphql-mesh/types';

const jiti = createJITI(__filename);

export const defaultImportFn: ImportFn = async id => {
  let module: any = await jiti.import(id, {});
  if (module.default != null) {
    module = module.default;
  }
  if (typeof module === 'object' && module != null) {
    const prototypeOfObject = Object.getPrototypeOf(module);
    if (prototypeOfObject == null || prototypeOfObject === Object.prototype) {
      const normalizedVal: Record<string, any> = {};
      for (const key in module) {
        normalizedVal[key] = module[key];
      }
      return normalizedVal;
    }
  }
  return module;
};
