import { isAbsolute, join } from 'path';
import { createRequire } from 'module';
import { ImportFn } from '@graphql-mesh/types';

type loadFromModuleExportExpressionOptions = {
  defaultExportName?: string;
  cwd?: string;
  importFn?: ImportFn;
};

export async function loadFromModuleExportExpression<T>(
  expression: T | string,
  options?: loadFromModuleExportExpressionOptions
): Promise<T> {
  if (typeof expression !== 'string') {
    return expression;
  }

  const { defaultExportName, cwd, importFn = (m: string) => import(m) } = options || {};
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  const mod = await tryImport(modulePath, cwd, importFn);

  if (exportName === 'default' || !exportName) {
    return mod.default || mod;
  } else {
    return mod[exportName] || (mod.default && mod.default[exportName]);
  }
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
          const cwdRequire = createRequire(cwd);
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

export function loadFromModuleExportExpressionSync<T>(
  expression: T | string,
  options?: loadFromModuleExportExpressionOptions
): T {
  if (typeof expression !== 'string') {
    return expression;
  }

  const { defaultExportName, cwd } = options || {};
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  const mod = tryImportSync(modulePath, cwd);

  if (exportName === 'default' || !exportName) {
    return mod.default || mod;
  } else {
    return mod[exportName] || (mod.default && mod.default[exportName]);
  }
}

function tryImportSync(modulePath: string, cwd: string) {
  const cwdRequire = createRequire(cwd);
  try {
    return cwdRequire(modulePath);
  } catch (e1) {
    if (!isAbsolute(modulePath)) {
      try {
        const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(cwd, modulePath);
        return cwdRequire(absoluteModulePath);
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
