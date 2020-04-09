import { isAbsolute, join } from 'path';

export async function loadFromModuleExportExpression(expression: string, defaultExportName?: string) {
  const [modulePath, exportName = defaultExportName] = expression.split('#');
  const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(process.cwd(), modulePath);
  const mod = await import(absoluteModulePath).catch(() => import(modulePath));

  if (exportName === 'default' || !exportName) {
    return mod.default || mod;
  } else {
    return mod[exportName] || (mod.default && mod.default[exportName]);
  }
}
