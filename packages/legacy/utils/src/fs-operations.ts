import { fs, path as pathModule } from '@graphql-mesh/cross-helpers';

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
  space?: string | number,
) {
  const stringified = JSON.stringify(data, replacer, space);
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

export async function mkdir(
  path: string,
  /**
   * Copied from fs.MakeDirectoryOptions.
   * TODO: somehow import it without depending on Node
   */
  options: {
    /**
     * Indicates whether parent folders should be created.
     * If a folder was created, the path to the first created folder will be returned.
     * @default true
     */
    recursive?: boolean | undefined;
    /**
     * A file mode. If a string is passed, it is parsed as an octal integer. If not specified
     * @default 0o777
     */
    mode?: string | number | undefined;
  } = { recursive: true },
) {
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
      }),
    );
    for (const result of results) {
      if (result.status === 'rejected' && result.reason.code !== 'ENOENT') {
        throw result.reason;
      }
    }
    await fs.promises.rmdir(dir);
  }
}
