/* eslint-disable @typescript-eslint/return-await */
import { path } from '@graphql-mesh/cross-helpers';
import { ImportFn } from '@graphql-mesh/types';
import { defaultImportFn } from './defaultImportFn';

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
    return Promise.resolve(expression);
  }

  const { defaultExportName, cwd, importFn = defaultImportFn } = options || {};
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  const mod = await tryImport(modulePath, cwd, importFn);
  return mod[exportName] || (mod.default && mod.default[exportName]) || mod.default || mod;
}

async function tryImport(modulePath: string, cwd: string, importFn: ImportFn) {
  try {
    return await importFn(modulePath);
  } catch {
    if (!path.isAbsolute(modulePath)) {
      const absoluteModulePath = path.isAbsolute(modulePath) ? modulePath : path.join(cwd, modulePath);
      return importFn(absoluteModulePath);
    }
  }
}
