import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
// @ts-expect-error tsx will allow this to work
import { version } from '../package.json';

console.log(`Injecting version ${version} to build and bundle`);

const source = '// @inject-version globalThis.__VERSION__ here';
const inject = `globalThis.__VERSION__ = '${version}';`;

for (const file of [
  // build
  resolve(import.meta.dirname, '../dist/cjs/bin.js'),
  resolve(import.meta.dirname, '../dist/esm/bin.js'),
  // bundle
  resolve(import.meta.dirname, '../bundle/bin.js'),
]) {
  try {
    const content = await readFile(file, 'utf-8');
    if (content.includes(source)) {
      await writeFile(file, content.replace(source, inject));
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.warn(`⚠️ File does not exist and cannot have the version injected "${file}"`);
    } else {
      throw e;
    }
  }
}
