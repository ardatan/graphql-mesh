import { MakeDirectoryOptions, promises as fsPromises, readFileSync } from 'fs';

const { stat, writeFile, readFile, mkdir: fsMkdir } = fsPromises;

export async function pathExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') {
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

export function writeJSON<T>(
  path: string,
  data: T,
  replacer?: (this: any, key: string, value: any) => any,
  space?: string | number
) {
  const stringified = JSON.stringify(data, replacer, space);
  return writeFile(path, stringified, 'utf-8');
}

export async function mkdir(path: string, options?: MakeDirectoryOptions) {
  const ifExists = await pathExists(path);
  if (!ifExists) {
    await fsMkdir(path, options);
  }
}
