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

const resolveFilename: (path: string) => string = module['_resolveFilename'];

let pathsMatcher: ((specifier: string) => string[]) | undefined;

let packedDepsPath = '';

export interface InitializeData {
  packedDepsPath: string;
}

export const initialize: module.InitializeHook<InitializeData> = data => {
  if (data.packedDepsPath) {
    packedDepsPath = data.packedDepsPath;
    debug(`Packed dependencies available at "${packedDepsPath}"`);
  }
  const tsconfig = getTsconfig(
    undefined,
    process.env.MESH_INCLUDE_TSCONFIG_NAME || 'tsconfig.json',
  );
  if (tsconfig) {
    debug(`tsconfig found at "${tsconfig.path}"`);
    pathsMatcher = createPathsMatcher(tsconfig);
  }
};

export const resolve: module.ResolveHook = async (specifier, context, nextResolve) => {
  if (packedDepsPath) {
    try {
      const resolved = await nextResolve(
        resolveFilename(path.join(packedDepsPath, specifier)),
        context,
      );
      debug(`Using packed dependency "${specifier}" from "${packedDepsPath}"`);
      return resolved;
    } catch {
      // noop
    }
  }

  try {
    return await nextResolve(specifier, context);
  } catch (e) {
    // default resolve failed, try alternatives
    try {
      return await nextResolve(resolveFilename(specifier), context);
    } catch {
      try {
        // usual filenames tried, could be a .ts file?
        return await nextResolve(
          resolveFilename(
            specifier + '.ts', // TODO: .mts or .cts?
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
                // the tsconfig path might point to a .ts file, try it too
                return await nextResolve(
                  resolveFilename(
                    possiblePath + '.ts', // TODO: .mts or .cts?
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

    // none of the alternatives worked, fail with original error
    throw e;
  }
};

export const load: module.LoadHook = async (url, context, nextLoad) => {
  if (/\.(m|c)?ts$/.test(url)) {
    debug(`Transpiling TypeScript file at "${url}"`);
    const source = await fs.readFile(new URL(url), 'utf8');
    const { code } = transform(source, { transforms: ['typescript'] });
    return {
      format: /\.cts$/.test(url) ? 'commonjs' : 'module', // TODO: ".ts" files _might_ not always be esm
      source: code,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
};
