/* eslint-disable import/no-nodejs-modules */
// ONLY FOR NODE. register with `node --import @graphql-mesh/include/hooks <your script>`

import fs from 'node:fs/promises';
import module from 'node:module';
import path from 'node:path';
import { createPathsMatcher, getTsconfig } from 'get-tsconfig';
import { transform } from 'sucrase';

const isDebug = ['1', 'y', 'yes', 't', 'true'].includes(String(process.env.DEBUG));

function debug(msg: string) {
  if (isDebug) {
    process.stderr.write(`[${new Date().toISOString()}] HOOKS ${msg}\n`);
  }
}

// eslint-disable-next-line dot-notation
const resolveFilename: (path: string) => string = module['_resolveFilename'];

let pathsMatcher: ((specifier: string) => string[]) | undefined;

let packedDepsPath = '';

export interface InitializeData {
  /**
   * Packed deps will be checked first, and enforced if present, during module resolution.
   * This allows us to consistently use the same module instance even if multiple are installed by the user.
   */
  packedDepsPath?: string;
  /**
   * tsconfig search path for registering tsconfig paths.
   *
   * @default process.env.MESH_INCLUDE_TSCONFIG_SEARCH_PATH || 'tsconfig.json'
   */
  tsconfigSearchPath?: string;
}

export const initialize: module.InitializeHook<InitializeData> = (data = {}) => {
  if (data.packedDepsPath) {
    packedDepsPath = data.packedDepsPath;
    debug(`Packed dependencies available at "${packedDepsPath}"`);
  }
  const tsconfig = getTsconfig(
    undefined,
    data.tsconfigSearchPath || process.env.MESH_INCLUDE_TSCONFIG_SEARCH_PATH || 'tsconfig.json',
  );
  if (tsconfig) {
    debug(`tsconfig found at "${tsconfig.path}"`);
    pathsMatcher = createPathsMatcher(tsconfig);
  }
};

export const resolve: module.ResolveHook = async (specifier, context, nextResolve) => {
  if (path.sep === '\\' && context.parentURL?.[1] === ':') {
    debug(`Fixing Windows path at "${context.parentURL}"`);
    context.parentURL = `file:///${context.parentURL.replace(/\\/g, '/')}`;
  }
  if (packedDepsPath) {
    try {
      const resolved = await nextResolve(
        resolveFilename(path.join(packedDepsPath, specifier)),
        context,
      );
      debug(`Using packed dependency "${specifier}" from "${packedDepsPath}"`);
      if (path.sep === '\\' && !resolved.url.startsWith('file:') && resolved.url[1] === ':') {
        debug(`Fixing Windows path at "${resolved.url}"`);
        resolved.url = `file:///${resolved.url.replace(/\\/g, '/')}`;
      }
      return resolved;
    } catch {
      // noop
    }
  }

  try {
    return await nextResolve(specifier, context);
  } catch (e) {
    try {
      // default resolve failed, try alternatives
      const specifierWithoutJs = specifier.endsWith('.js') ? specifier.slice(0, -3) : specifier;
      return await nextResolve(
        specifierWithoutJs + '.ts', // TODO: .mts or .cts?
        context,
      );
    } catch (e) {
      try {
        return await nextResolve(resolveFilename(specifier), context);
      } catch {
        try {
          const specifierWithoutJs = specifier.endsWith('.js') ? specifier.slice(0, -3) : specifier;
          // usual filenames tried, could be a .ts file?
          return await nextResolve(
            resolveFilename(
              specifierWithoutJs + '.ts', // TODO: .mts or .cts?
            ),
            context,
          );
        } catch {
          // not a .ts file, try the tsconfig paths if available
          if (pathsMatcher) {
            for (const possiblePath of pathsMatcher(specifier)) {
              try {
                return await nextResolve(resolveFilename(possiblePath), context);
              } catch {
                try {
                  const possiblePathWithoutJs = possiblePath.endsWith('.js')
                    ? possiblePath.slice(0, -3)
                    : possiblePath;
                  // the tsconfig path might point to a .ts file, try it too
                  return await nextResolve(
                    resolveFilename(
                      possiblePathWithoutJs + '.ts', // TODO: .mts or .cts?
                    ),
                    context,
                  );
                } catch {
                  // noop
                }
              }
            }
          }
        }
      }
    }

    // none of the alternatives worked, fail with original error
    throw e;
  }
};

export const load: module.LoadHook = async (url, context, nextLoad) => {
  if (path.sep === '\\' && !url.startsWith('file:') && url[1] === ':') {
    debug(`Fixing Windows path at "${url}"`);
    url = `file:///${url.replace(/\\/g, '/')}`;
  }
  if (/\.(m|c)?ts$/.test(url)) {
    debug(`Transpiling TypeScript file at "${url}"`);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      throw new Error(`Failed to parse URL "${url}"; ${e?.stack || e}`);
    }
    let source: string;
    try {
      source = await fs.readFile(parsedUrl, 'utf8');
    } catch (e) {
      throw new Error(`Failed to read file at "${url}"; ${e?.stack || e}`);
    }
    const { code } = transform(source, { transforms: ['typescript'] });
    return {
      format: /\.cts$/.test(url) ? 'commonjs' : 'module', // TODO: ".ts" files _might_ not always be esm
      source: code,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
};
