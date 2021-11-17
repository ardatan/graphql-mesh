export async function defaultImportFn(path: string) {
  let module = await import(path);
  if ('default' in module) {
    module = module.default;
  }
  if (typeof module === 'object') {
    const normalizedVal = {};
    for (const key in module) {
      normalizedVal[key] = module[key];
    }
    module = normalizedVal;
  }
  return module;
}
