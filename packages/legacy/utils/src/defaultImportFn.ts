import createJITI from 'jiti';

const jiti = createJITI(import.meta.url);

async function defaultImportFn(path: string): Promise<any> {
  let module: any = await jiti.import(path, {});
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
}

export { defaultImportFn };
