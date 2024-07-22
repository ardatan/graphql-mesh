#! /usr/bin/env node --import tsx
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
// @ts-expect-error tsx will allow this to work
import { version } from '../package.json';

console.log(`Injecting version ${version} to build and bundle`);

const inject = `globalThis.__VERSION__ = '${version}'`;

for (const file of [
  // build
  resolve(import.meta.dirname, '../dist/cjs/bin.js'),
  resolve(import.meta.dirname, '../dist/esm/bin.js'),
  // bundle
  resolve(import.meta.dirname, '../bundle/bin.js'),
]) {
  try {
    const content = await readFile(file, 'utf-8');
    // avoid re-injecting when build doesnt change
    if (!content.includes(inject)) {
      await writeFile(file, content.replace('globalThis.__VERSION__', `(${inject})`));
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.warn(`⚠️ File does not exist and cannot have the version injected "${file}"`);
    } else {
      throw e;
    }
  }
}
