import { isAbsolute, join } from 'path';

export async function loadFromModuleExportExpression(expression: string, defaultExportName?: string) {
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  const mod = await tryImport(modulePath);

  if (exportName === 'default' || !exportName) {
    return mod.default || mod;
  } else {
    return mod[exportName] || (mod.default && mod.default[exportName]);
  }
}

async function tryImport(modulePath: string) {
  try {
    return await import(modulePath);
  } catch (e1) {
    if (!isAbsolute(modulePath)) {
      try {
        const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(process.cwd(), modulePath);
        return await import(absoluteModulePath);
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
