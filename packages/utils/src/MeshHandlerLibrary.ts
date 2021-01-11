import isUrl from 'is-url';
import { MeshHandlerContext, MeshSource } from './types';
import { isAbsolute, resolve } from 'path';
import { load as loadYaml } from 'js-yaml';

interface ReadFileOrUrlOptions extends RequestInit {
  allowUnknownExtensions?: boolean;
  fallbackFormat?: 'json' | 'yaml';
}

export abstract class MeshHandler<THandlerConfig = any, TContext = any> {
  protected handlerContext: MeshHandlerContext;

  constructor(protected name: string, protected config: THandlerConfig) {}

  abstract getMeshSource(): Promise<MeshSource<TContext>>;

  public setHandlerContext(handlerContext: MeshHandlerContext) {
    this.handlerContext = handlerContext;
  }

  protected isUrl(path: string) {
    return isUrl(path);
  }

  protected async readFileOrUrl<T>(filePathOrUrl: string, options?: ReadFileOrUrlOptions) {
    if (isUrl(filePathOrUrl)) {
      const path = filePathOrUrl;
      const response = await this.handlerContext.fetch(path, options);
      const contentType = response.headers?.get('content-type') || '';
      const responseText = await response.text();
      if (/json$/.test(path) || contentType.startsWith('application/json')) {
        return JSON.parse(responseText);
      } else if (
        /yaml$/.test(path) ||
        /yml$/.test(path) ||
        contentType.includes('yaml') ||
        contentType.includes('yml')
      ) {
        return (loadYaml(responseText) as any) as T;
      } else if (!options?.allowUnknownExtensions) {
        throw new Error(
          `Failed to parse JSON/YAML. Ensure URL '${path}' has ` +
            `the correct extension (i.e. '.json', '.yaml', or '.yml) or mime type in the response headers.`
        );
      }
      return responseText as any;
    } else {
      const filePath = filePathOrUrl;
      const { readFile, stat } = await import('fs-extra');
      const actualPath = isAbsolute ? filePath : resolve(process.cwd(), filePath);
      const cachedObjStr = await this.handlerContext.cache.get(actualPath);
      const stats = await stat(actualPath);
      if (cachedObjStr) {
        const cachedObj = JSON.parse(cachedObjStr);
        if (stats.mtimeMs <= cachedObj.mtimeMs) {
          return cachedObj.result;
        }
      }
      let result: any = await readFile(actualPath, 'utf-8');
      if (/json$/.test(filePath)) {
        result = JSON.parse(result);
      } else if (/yaml$/.test(filePath) || /yml$/.test(filePath)) {
        result = loadYaml(result);
      } else if (options?.fallbackFormat) {
        switch (options.fallbackFormat) {
          case 'json':
            result = JSON.parse(result);
            break;
          case 'yaml':
            result = loadYaml(result);
            break;
        }
      } else if (!options?.allowUnknownExtensions) {
        throw new Error(
          `Failed to parse JSON/YAML. Ensure file '${filePath}' has ` +
            `the correct extension (i.e. '.json', '.yaml', or '.yml).`
        );
      }
      this.handlerContext.cache.set(filePath, JSON.stringify({ result, mtimeMs: stats.mtimeMs }));
      return result;
    }
  }
}
