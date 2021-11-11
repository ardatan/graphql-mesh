/* eslint-disable @typescript-eslint/return-await */
import { isAbsolute, join } from 'path';
import { ImportFn } from '@graphql-mesh/types';

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

  const { defaultExportName, cwd, importFn = getDefaultImport() } = options || {};
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
        if (e2.message.startsWith('Cannot find')) {
          throw e1;
        }
        throw e2;
      }
    }
    throw e1;
  }
}

export function getDefaultImport(): ImportFn {
  return m => import(m);
}
