import { isAbsolute, join } from 'path';

type loadFromModuleExportExpressionOptions = {
  defaultExportName?: string;
  cwd?: string;
};

export async function loadFromModuleExportExpression<T>(
  expression: T | string,
  options?: loadFromModuleExportExpressionOptions
): Promise<T> {
  if (typeof expression !== 'string') {
    return expression;
  }

  const { defaultExportName, cwd } = options || {};
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  const mod = await tryImport(modulePath, cwd);

  if (exportName === 'default' || !exportName) {
    return mod.default || mod;
  } else {
    return mod[exportName] || (mod.default && mod.default[exportName]);
  }
}

async function tryImport(modulePath: string, cwd: string) {
  try {
    return await import(modulePath);
  } catch (e1) {
    if (!isAbsolute(modulePath)) {
      try {
        const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(cwd, modulePath);
        return await import(absoluteModulePath);
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
  try {
    return require(modulePath);
  } catch (e1) {
    if (!isAbsolute(modulePath)) {
      try {
        const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(cwd, modulePath);
        return require(absoluteModulePath);
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
