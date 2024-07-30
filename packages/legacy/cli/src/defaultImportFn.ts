import createJITI, { type JITI } from 'jiti';
import * as tsconfigPaths from 'tsconfig-paths';
import type { ImportFn } from '@graphql-mesh/types';

const tsconfig = tsconfigPaths.loadConfig();
if (tsconfig.resultType === 'success') {
  // there's a tsconfig loaded, register its paths
  tsconfigPaths.register({
    baseUrl: tsconfig.absoluteBaseUrl,
    paths: tsconfig.paths,
  });
}

let jiti: JITI;
function getOrCreateImportFn(): ImportFn {
  if (!jiti) {
    // we instantiate on demand because sometimes jiti is not used
    jiti = createJITI(__filename);
  }
  return id => jiti.import(id, {}) as Promise<any>;
}

export const defaultImportFn: ImportFn = async id => {
  let module: any = await getOrCreateImportFn()(id);
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
