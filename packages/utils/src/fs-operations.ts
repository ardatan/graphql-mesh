import { MakeDirectoryOptions, promises as fsPromises, readFileSync } from 'fs';
import { dirname } from 'path';

const { stat, writeFile, readFile, mkdir: fsMkdir } = fsPromises || {};

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

export function readJSONSync(path: string) {
  const fileContent = readFileSync(path, 'utf-8');
  return JSON.parse(fileContent);
}

export async function readJSON(path: string) {
  const fileContent = await readFile(path, 'utf-8');
  return JSON.parse(fileContent);
}

export async function writeJSON<T>(
  path: string,
  data: T,
  replacer?: (this: any, key: string, value: any) => any,
  space?: string | number
) {
  const stringified = JSON.stringify(data, replacer, space);
  const containingDir = dirname(path);
  if (!(await pathExists(containingDir))) {
    await mkdir(containingDir);
  }
  return writeFile(path, stringified, 'utf-8');
}

export async function mkdir(path: string, options: MakeDirectoryOptions = { recursive: true }) {
  const ifExists = await pathExists(path);
  if (!ifExists) {
    await fsMkdir(path, options);
  }
}
