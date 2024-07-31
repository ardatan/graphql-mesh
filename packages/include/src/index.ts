import Module from 'node:module';
import { isAbsolute } from 'node:path';
import { createPathsMatcher, getTsconfig } from 'get-tsconfig';
import createJITI from 'jiti';

const jiti = createJITI(
  /** We require absolute import paths, so a base url is not required. See documentation of {@link include} for the why. */
  '',
);

/**
 * Import a module, ESM or CJS at the provided {@link absolutePath absolute path}.
 *
 * We intentionally require an absolute path to the module because `import.meta.url` is
 * not available in CJS (and cant even be in the syntax) and `__filename` is not available in ESM.
 *
 * If the included module has a "default" export, it will be returned instead.
 *
 * If the module is not found, `null` will be returned.
 */
export async function include(absolutePath: string): Promise<unknown> {
  if (!isAbsolute(absolutePath)) {
    throw new Error('Only absolute paths can be included');
  }
  try {
    const module = await jiti.import(absolutePath, {});
    if (!module) {
      throw new Error('Included module is empty');
    }
    if (typeof module !== 'object') {
      throw new Error(`Included module is not an object, is instead "${typeof module}"`);
    }
    if ('default' in module) {
      return module.default;
    }
    return module;
  } catch (err) {
    // NOTE: we dont use the err.code because maybe the included module is importing another module that does not exist.
    //       if we were to use the MODULE_NOT_FOUND code, then those includes will fail with an unclear error
    if (String(err).includes(`Cannot find module '${absolutePath}'`)) {
      //
    } else {
      throw err;
    }
  }
  return null;
}

export interface RegisterTsconfigPathsOptions {
  /**
   * Accepts a path to a file or directory to search up for a {@link configName} file.
   *
   * @default process.cwd()
   */
  searchPath?: string;
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
  searchPath = process.cwd(),
  configName = process.env.MESH_INCLUDE_TSCONFIG_NAME || 'tsconfig.json',
}: RegisterTsconfigPathsOptions = {}): () => void {
  const tsconfig = getTsconfig(searchPath, configName);
  const pathsMatcher = createPathsMatcher(tsconfig);

  // @ts-expect-error
  const originalResolveFilename = Module._resolveFilename;
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
    // @ts-expect-error
    Module._resolveFilename = originalResolveFilename;
  };
}
