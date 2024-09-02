const seaWarnings = [
  `Warning: Currently the require() provided to the main script embedded into single-executable applications only supports loading built-in modules.`,
  `To load a module from disk after the single executable application is launched, use require("module").createRequire().`,
  `Support for bundled module loading or virtual file systems are under discussions in https://github.com/nodejs/single-executable`,
  `(Use \`mesh-serve--trace - warnings ...\` to show where the warning was created)`,
];

export function trimError(error: any) {
  let stringError = error.toString();
  for (const warning of seaWarnings) {
    stringError = stringError.replace(`${warning}\n`, '').replace(warning, '');
  }
  return stringError.split('(data:text/javascript')[0];
}
