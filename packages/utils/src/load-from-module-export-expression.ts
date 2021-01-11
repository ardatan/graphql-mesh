import { ImportFn } from '@graphql-mesh/utils';
import { isAbsolute, join } from 'path';

export async function loadFromModuleExportExpression<T>(
  expression: T | string,
  defaultExportName?: string,
  importFn?: ImportFn
): Promise<T> {
  if (typeof expression !== 'string') {
    return expression;
  }
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  const mod = await tryImport(modulePath, importFn);

  if (exportName === 'default' || !exportName) {
    return mod.default || mod;
  } else {
    return mod[exportName] || (mod.default && mod.default[exportName]);
  }
}

async function tryImport(modulePath: string, importFn: ImportFn) {
  try {
    return await importFn(modulePath);
  } catch (e1) {
    if (!isAbsolute(modulePath)) {
      try {
        const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(process.cwd(), modulePath);
        return await importFn(absoluteModulePath);
      } catch (e2) {
        if (e2.message.includes('Cannot find module')) {
          throw e1;
        } else {
          throw e2;
        }
      }
    }
    throw e1;
  }
}

export function loadFromModuleExportExpressionSync<T>(expression: T | string, defaultExportName?: string): T {
  if (typeof expression !== 'string') {
    return expression;
  }
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  const mod = tryImportSync(modulePath);

  if (exportName === 'default' || !exportName) {
    return mod.default || mod;
  } else {
    return mod[exportName] || (mod.default && mod.default[exportName]);
  }
}

function tryImportSync(modulePath: string) {
  try {
    return require(modulePath);
  } catch (e1) {
    if (!isAbsolute(modulePath)) {
      try {
        const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(process.cwd(), modulePath);
        return require(absoluteModulePath);
      } catch (e2) {
        if (e2.message.includes('Cannot find module')) {
          throw e1;
        } else {
          throw e2;
        }
      }
    }
    throw e1;
  }
}
