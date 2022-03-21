import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';
import { jsonFlatStringify } from './flat-string';

export async function pathExists(path: string) {
  if (!path) {
    return false;
  }
  try {
    await fs.promises.stat(path);
    return true;
  } catch (e) {
    if (e.toString().includes('ENOENT')) {
      return false;
    } else {
      throw e;
    }
  }
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

export const writeFile: typeof fs.promises.writeFile = async (path, ...args) => {
  if (typeof path === 'string') {
    const containingDir = pathModule.dirname(path);
    if (!(await pathExists(containingDir))) {
      await mkdir(containingDir);
    }
  }
  return fs.promises.writeFile(path, ...args);
};

export async function mkdir(path: string, options: fs.MakeDirectoryOptions = { recursive: true }) {
  const ifExists = await pathExists(path);
  if (!ifExists) {
    await fs.promises.mkdir(path, options);
  }
}

export async function rmdirs(dir: string) {
  if (await pathExists(dir)) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const results = await Promise.allSettled(
      entries.map(entry => {
        const fullPath = pathModule.join(dir, entry.name);
        if (entry.isDirectory()) {
          return rmdirs(fullPath);
        } else {
          return fs.promises.unlink(fullPath);
        }
      })
    );
    for (const result of results) {
      if (result.status === 'rejected' && result.reason.code !== 'ENOENT') {
        throw result.reason;
      }
    }
    await fs.promises.rmdir(dir);
  }
}
