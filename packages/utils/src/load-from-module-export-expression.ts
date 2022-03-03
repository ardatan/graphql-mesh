/* eslint-disable @typescript-eslint/return-await */
import path from 'path';
import { ImportFn } from '@graphql-mesh/types';
import { defaultImportFn } from './defaultImportFn';

const { isAbsolute, join } = path;

type LoadFromModuleExportExpressionOptions = {
  defaultExportName: string;
  cwd: string;
  importFn: ImportFn;
};

export function loadFromModuleExportExpression<T>(
  expression: T | string,
  options: LoadFromModuleExportExpressionOptions
): Promise<T> {
  if (typeof expression !== 'string') {
    return Promise.resolve(expression);
  }

  const { defaultExportName, cwd, importFn = defaultImportFn } = options || {};
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  return tryImport(modulePath, cwd, importFn).then(
    mod => mod[exportName] || (mod.default && mod.default[exportName]) || mod.default || mod
  );
}

function tryImport(modulePath: string, cwd: string, importFn: ImportFn) {
  return importFn(modulePath).catch((e1: Error): any => {
    if (!isAbsolute(modulePath)) {
      const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(cwd, modulePath);
      return importFn(absoluteModulePath);
    }
  });
}
