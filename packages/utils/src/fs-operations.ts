import { MakeDirectoryOptions, promises as fsPromises, readFileSync } from 'fs';
import { dirname } from 'path';
import { jsonFlatStringify } from './flat-string';

const { stat, writeFile: fsWriteFile, readFile, mkdir: fsMkdir } = fsPromises || {};

export async function pathExists(path: string) {
  if (!path) {
    return false;
  }
  try {
    await stat(path);
    return true;
  } catch (e) {
    if (e.toString().includes('ENOENT')) {
      return false;
    } else {
      throw e;
    }
  }
}

export function readJSONSync<T = any>(path: string): T {
  const fileContent = readFileSync(path, 'utf-8');
  return JSON.parse(fileContent);
}

export async function readJSON<T = any>(path: string): Promise<T> {
  const fileContent = await readFile(path, 'utf-8');
  return JSON.parse(fileContent);
}

export function writeJSON<T>(
  path: string,
  data: T,
  replacer?: (this: any, key: string, value: any) => any,
  space?: string | number
) {
  const stringified = jsonFlatStringify(data, replacer, space);
  return writeFile(path, stringified, 'utf-8');
}

export const writeFile: typeof fsPromises.writeFile = async (path, ...args) => {
  if (typeof path === 'string') {
    const containingDir = dirname(path);
    if (!(await pathExists(containingDir))) {
      await mkdir(containingDir);
    }
  }
  return fsWriteFile(path, ...args);
};

export async function mkdir(path: string, options: MakeDirectoryOptions = { recursive: true }) {
  const ifExists = await pathExists(path);
  if (!ifExists) {
    await fsMkdir(path, options);
  }
}
