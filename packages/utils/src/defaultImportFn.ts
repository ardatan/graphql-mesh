import { path as pathModule } from '@graphql-mesh/cross-helpers';

export async function defaultImportFn(path: string): Promise<any> {
  let module = await import(/* @vite-ignore */ path)
    .catch(e => {
      if (e.code === 'ERR_REQUIRE_ESM') {
        // eslint-disable-next-line no-new-func
        return new Function(`return import(${JSON.stringify(path)})`)();
      }
      throw e;
    })
    .catch(e => {
      if (pathModule.isAbsolute(path) && !path.endsWith('.js') && !path.endsWith('.ts')) {
        return defaultImportFn(`${path}.ts`);
      }
      throw e;
    });
  if (module.default != null) {
    module = module.default;
  }
  if (typeof module === 'object' && module != null) {
    const prototypeOfObject = Object.getPrototypeOf(module);
    if (prototypeOfObject == null || prototypeOfObject === Object.prototype) {
      const normalizedVal = {};
      for (const key in module) {
        normalizedVal[key] = module[key];
      }
      return normalizedVal;
    }
  }
  return module;
}
