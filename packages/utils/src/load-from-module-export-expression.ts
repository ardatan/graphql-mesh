/* eslint-disable @typescript-eslint/return-await */
import { isAbsolute, join, resolve } from 'path';
import { createRequire } from 'module';
import { ImportFn, SyncImportFn } from '@graphql-mesh/types';

type LoadFromModuleExportExpressionOptions = {
  defaultExportName: string;
  cwd: string;
  importFn: ImportFn;
};

export async function loadFromModuleExportExpression<T>(
  expression: T | string,
  options: LoadFromModuleExportExpressionOptions
): Promise<T> {
  if (typeof expression !== 'string') {
    return expression;
  }

  const { defaultExportName, cwd, importFn = getDefaultImport(cwd) } = options || {};
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  const mod = await tryImport(modulePath, cwd, importFn);

  return mod[exportName] || (mod.default && mod.default[exportName]) || mod.default || mod;
}

async function tryImport(modulePath: string, cwd: string, importFn: ImportFn) {
  try {
    return await importFn(modulePath);
  } catch (e1) {
    if (!isAbsolute(modulePath)) {
      const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(cwd, modulePath);
      try {
        return await importFn(absoluteModulePath);
      } catch (e2) {
        try {
          const cwdRequire = createRequire(join(cwd, 'mesh.config.js'));
          return cwdRequire(absoluteModulePath);
        } catch (e3) {
          if (e3.message.startsWith('Cannot find')) {
            if (e2.message.startsWith('Cannot find')) {
              throw e1;
            }
            throw e2;
          }
          throw e3;
        }
      }
    }
    throw e1;
  }
}
type LoadFromModuleExportExpressionSyncOptions = {
  defaultExportName: string;
  cwd: string;
  syncImportFn: SyncImportFn;
};

export function loadFromModuleExportExpressionSync<T>(
  expression: T | string,
  options: LoadFromModuleExportExpressionSyncOptions
): T {
  if (typeof expression !== 'string') {
    return expression;
  }

  const { defaultExportName = 'default', cwd, syncImportFn } = options || {};
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  const mod = tryImportSync(modulePath, cwd, syncImportFn);

  return mod[exportName] || (mod.default && mod.default[exportName]) || mod.default || mod;
}

function tryImportSync(modulePath: string, cwd: string, syncImportFn: SyncImportFn) {
  try {
    return syncImportFn(modulePath);
  } catch (e1) {
    if (!isAbsolute(modulePath)) {
      try {
        const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(cwd, modulePath);
        return syncImportFn(absoluteModulePath);
      } catch (e2) {
        if (e2.message.startsWith('Cannot find')) {
          throw e1;
        } else {
          throw e2;
        }
      }
    }
    throw e1;
  }
}

export function getDefaultImport(from: string): ImportFn {
  const syncImport = getDefaultSyncImport(from);
  return m => import(m).catch(() => syncImport(m));
}

export function getDefaultSyncImport(from: string): SyncImportFn {
  const createRequireConstructor = isAbsolute(from) ? from : resolve(from);
  const relativeRequire = createRequire(createRequireConstructor);

  return (from: string) => relativeRequire(from);
}
