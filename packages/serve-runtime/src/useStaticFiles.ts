/* eslint-disable import/no-extraneous-dependencies */
import { Plugin } from 'graphql-yoga';
import { fs, path } from '@graphql-mesh/cross-helpers';
import { pathExists } from '@graphql-mesh/utils';

export interface StaticFilesOpts {
  baseDir: string;
  staticFiles?: string;
}

export const useStaticFiles = ({ baseDir, staticFiles = 'public' }: StaticFilesOpts): Plugin => {
  return {
    onRequest({ request, url, endResponse, fetchAPI }): void | Promise<void> {
      if (request.method === 'GET') {
        let relativePath = url.pathname;
        if (relativePath === '/' || !relativePath) {
          relativePath = 'index.html';
        }
        const absoluteStaticFilesPath = path.join(baseDir, staticFiles);
        const absolutePath = path.join(absoluteStaticFilesPath, relativePath);
        if (absolutePath.startsWith(absoluteStaticFilesPath)) {
          return pathExists(absolutePath).then(exists => {
            if (exists) {
              const readStream = fs.createReadStream(absolutePath);
              endResponse(
                new fetchAPI.Response(readStream as any, {
                  status: 200,
                }),
              );
            }
          });
        }
      }
    },
  };
};
