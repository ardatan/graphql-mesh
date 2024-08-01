// eslint-disable-next-line import/no-nodejs-modules
import Module from 'node:module';
import { createPathsMatcher, getTsconfig } from 'get-tsconfig';
import createJITI from 'jiti';

const jiti = createJITI(
  /**
   * We intentionally provide an empty string here and let jiti handle the base URL.
   *
   * This is because `import.meta.url` is not available in CJS (and cant even be in the syntax)
   * and `__filename` is not available in ESM.
   */
  '',
);

/**
 * Import a module, ESM or CJS at the provided {@link path}.
 *
 * If the included module has a "default" export, it will be returned instead.
 *
 * If the module at {@link path} is not found, `null` will be returned.
 */
export async function include<T = any>(path: string): Promise<T> {
  const module = await jiti.import(path, {});
  if (!module) {
    throw new Error('Included module is empty');
  }
  if (typeof module !== 'object') {
    throw new Error(`Included module is not an object, is instead "${typeof module}"`);
  }
  if ('default' in module) {
    return module.default as T;
  }
  return module as T;
}

export interface RegisterTsconfigPathsOptions {
  /**
   * Accepts a path to a file or directory to search up for a {@link configName} file.
   *
   * @default process.cwd()
   */
  cwd?: string;
  /**
   * The file name of the TypeScript config file.
   *
   * Can be changed using the `MESH_INCLUDE_TSCONFIG_NAME` environment variable.
   *
   * @default 'tsconfig.json'
   */
  configName?: string;
}

/**
 * Parses the closest `(t|j)sconfig.json` paths and augments Node's module
 * resolution to consider those paths during imports.
 *
 * @returns The unregister function.
 */
export function registerTsconfigPaths({
  cwd = process.cwd(),
  configName = process.env.MESH_INCLUDE_TSCONFIG_NAME || 'tsconfig.json',
}: RegisterTsconfigPathsOptions = {}): () => void {
  const tsconfig = getTsconfig(cwd, configName);
  if (!tsconfig) return; // no tsconfig, no register

  const pathsMatcher = createPathsMatcher(tsconfig);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const originalResolveFilename = Module._resolveFilename;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  Module._resolveFilename = (...args) => {
    const [path, ...rest] = args;
    try {
      return originalResolveFilename(...args);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        // throw non-module_not_found errors immediately
        throw e;
      }

      // original resolve didnt find the module, try resolving using tsconfig paths
      for (const possiblePath of pathsMatcher(path)) {
        try {
          return originalResolveFilename(possiblePath, ...rest);
        } catch {
          // noop
        }
      }

      // tsconfig paths couldnt resolve the module either, throw original error
      throw e;
    }
  };

  return function unregisterTsconfigPaths() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    Module._resolveFilename = originalResolveFilename;
  };
}
