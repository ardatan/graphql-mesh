/* eslint-disable import/no-nodejs-modules */
// ONLY FOR NODE. register with `node --import @graphql-mesh/include/hooks <your script>`

import fs from 'node:fs/promises';
import module from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createPathsMatcher, getTsconfig } from 'get-tsconfig';
import { transform, type Transform } from 'sucrase';

const isDebug = ['1', 'y', 'yes', 't', 'true'].includes(String(process.env.DEBUG));

function debug(msg: string) {
  if (isDebug) {
    process.stderr.write(`[${new Date().toISOString()}] HOOKS ${msg}\n`);
  }
}

// eslint-disable-next-line dot-notation
const resolveFilename: (path: string) => string = module['_resolveFilename'];

let packedDepsPath = '';

let pathsMatcher: ((specifier: string) => string[]) | undefined;

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

function fixSpecifier(specifier: string, context: module.ResolveHookContext) {
  if (path.sep === '\\') {
    if (context.parentURL != null && context.parentURL[1] === ':') {
      context.parentURL = pathToFileURL(context.parentURL.replaceAll('/', '\\')).toString();
    }
    if (specifier[1] === ':' && specifier[2] === '/') {
      specifier = specifier.replaceAll('/', '\\');
    }
    if (specifier.startsWith('file://')) {
      specifier = fileURLToPath(specifier);
    }
    if (!specifier.startsWith('.') && !specifier.startsWith('file:') && specifier[1] === ':') {
      specifier = pathToFileURL(specifier).toString();
    }
  }
  if (specifier.startsWith('node_modules/') || specifier.startsWith('node_modules\\')) {
    specifier = specifier
      .replace('node_modules/', '')
      .replace('node_modules\\', '')
      .replace(/\\/g, '/');
  }
  return specifier;
}

export const resolve: module.ResolveHook = async (specifier, context, nextResolve) => {
  specifier = fixSpecifier(specifier, context);

  if (specifier.startsWith('node:')) {
    return nextResolve(specifier, context);
  }
  if (module.builtinModules.includes(specifier)) {
    return nextResolve(specifier, context);
  }

  if (!specifier.startsWith('.') && packedDepsPath) {
    try {
      debug(
        `Trying packed dependency "${specifier}" for "${context.parentURL?.toString() || '.'}"`,
      );
      const resolved = resolveFilename(path.join(packedDepsPath, specifier));
      debug(`Possible packed dependency "${specifier}" to "${resolved}"`);
      return await nextResolve(fixSpecifier(resolved, context), context);
    } catch {
      // noop
    }
  }

  try {
    // debug(`Trying default resolve for "${specifier}"`);
    return await nextResolve(specifier, context);
  } catch (e) {
    try {
      debug(`Trying default resolve for "${specifier}" failed; trying alternatives`);
      const specifierWithoutJs = specifier.endsWith('.js') ? specifier.slice(0, -3) : specifier;
      const specifierWithTs = specifierWithoutJs + '.ts'; // TODO: .mts or .cts
      debug(`Trying "${specifierWithTs}"`);
      return await nextResolve(fixSpecifier(specifierWithTs, context), context);
    } catch (e) {
      try {
        return await nextResolve(fixSpecifier(resolveFilename(specifier), context), context);
      } catch {
        try {
          const specifierWithoutJs = specifier.endsWith('.js') ? specifier.slice(0, -3) : specifier;
          // usual filenames tried, could be a .ts file?
          return await nextResolve(
            fixSpecifier(
              resolveFilename(
                specifierWithoutJs + '.ts', // TODO: .mts or .cts?
              ),
              context,
            ),
            context,
          );
        } catch {
          // not a .ts file, try the tsconfig paths if available
          if (pathsMatcher) {
            for (const possiblePath of pathsMatcher(specifier)) {
              try {
                return await nextResolve(
                  fixSpecifier(resolveFilename(possiblePath), context),
                  context,
                );
              } catch {
                try {
                  const possiblePathWithoutJs = possiblePath.endsWith('.js')
                    ? possiblePath.slice(0, -3)
                    : possiblePath;
                  // the tsconfig path might point to a .ts file, try it too
                  return await nextResolve(
                    fixSpecifier(
                      resolveFilename(
                        possiblePathWithoutJs + '.ts', // TODO: .mts or .cts?
                      ),
                      context,
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
    // debug(`Transpiling TypeScript file at "${url}"`);
    const filePath = fileURLToPath(url);
    let source: string;
    try {
      source = await fs.readFile(filePath, 'utf8');
    } catch (e) {
      throw new Error(`Failed to read file at "${url}"; ${e?.stack || e}`);
    }
    let format: 'module' | 'commonjs';
    if (/\.ts$/.test(url)) {
      // try {
      //   const { isSea } = await import('node:sea');
      //   format = isSea() ? 'commonjs' : 'module';
      // } catch {
      format = 'module';
      // }
    } else if (/\.mts$/.test(url)) {
      format = 'module';
    } else if (/\.cts$/.test(url)) {
      format = 'commonjs';
    }
    const transforms: Transform[] = ['typescript'];
    if (format === 'commonjs') {
      transforms.push('imports');
    }
    const { code } = transform(source, { transforms });
    return {
      format,
      source: code,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
};
