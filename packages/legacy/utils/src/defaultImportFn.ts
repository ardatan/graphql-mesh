import { path as pathModule } from '@graphql-mesh/cross-helpers';

function defaultImportFn(path: string): Promise<any> {
  return import(/* @vite-ignore */ path).then(
    module => {
      let i = 0;
      while (module?.default != null) {
        if (i > 10 || module === module.default) {
          break;
        }
        module = module.default;
        i++;
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
    },
    e => {
      if (e.code === 'ERR_REQUIRE_ESM') {
        // eslint-disable-next-line no-new-func
        return new Function(`return import(${JSON.stringify(path)})`)();
      }
      if (pathModule.isAbsolute(path) && !path.endsWith('.js') && !path.endsWith('.ts')) {
        return defaultImportFn(`${path}.ts`);
      }
      throw e;
    },
  );
}

function handleImport<T>(module: T): T {
  let i = 0;
  while ((module as any)?.default != null) {
    if (i > 10 || module === (module as any).default) {
      break;
    }
    module = (module as any).default;
    i++;
  }
  if (typeof module === 'object' && module != null) {
    const prototypeOfObject = Object.getPrototypeOf(module);
    if (prototypeOfObject == null || prototypeOfObject === Object.prototype) {
      const normalizedVal: Record<string, any> = {};
      for (const key in module) {
        normalizedVal[key] = module[key];
      }
      return normalizedVal as T;
    }
  }
  return module;
}

export { defaultImportFn, handleImport };
