import type { ImportFn } from '@graphql-mesh/types';
import { fakePromise, handleMaybePromise } from '@whatwg-node/promise-helpers';
import { defaultImportFn } from './defaultImportFn.js';

type LoadFromModuleExportExpressionOptions = {
  defaultExportName: string;
  cwd: string;
  importFn: ImportFn;
};

export function loadFromModuleExportExpression<T>(
  expression: T | string,
  options: LoadFromModuleExportExpressionOptions,
): Promise<T> {
  if (typeof expression !== 'string') {
    return fakePromise(expression);
  }

  const { defaultExportName, cwd, importFn = defaultImportFn } = options || {};
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  return handleMaybePromise(
    () => tryImport(modulePath, cwd, importFn),
    mod => mod[exportName] || (mod.default && mod.default[exportName]) || mod.default || mod,
  );
}

function tryImport(modulePath: string, cwd: string, importFn: ImportFn) {
  return handleMaybePromise(
    () => importFn(modulePath),
    m => m,
    () => {
      const path = globalThis.process?.getBuiltinModule?.('node:path');
      if (!path) {
        throw new Error('Node.js path module is required to resolve relative module paths');
      }
      if (!path.isAbsolute(modulePath)) {
        const absoluteModulePath = path.isAbsolute(modulePath)
          ? modulePath
          : path.join(cwd, modulePath);
        return importFn(absoluteModulePath);
      }
    },
  );
}
