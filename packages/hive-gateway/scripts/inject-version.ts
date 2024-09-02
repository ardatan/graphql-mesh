import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
// @ts-expect-error tsx will allow this to work
import pkg from '../package.json';

const version = process.argv[2] || pkg.version;

console.log(`Injecting version ${version} to build and bundle`);

const source = '// @inject-version globalThis.__VERSION__ here';
const inject = `globalThis.__VERSION__ = '${version}';`;

const __dirname = fileURLToPath(new URL('.', import.meta.url));

for (const file of [
  // build
  resolve(__dirname, '../dist/cjs/bin.js'),
  resolve(__dirname, '../dist/esm/bin.js'),
  // bundle
  resolve(__dirname, '../bundle/dist/bin.mjs'),
  // binary bundle
  resolve(__dirname, '../bundle/hive-gateway.cjs'),
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
