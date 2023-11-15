/* eslint-disable import/no-extraneous-dependencies */
import { buildASTSchema, buildSchema, DocumentNode, GraphQLSchema, isSchema } from 'graphql';
import { defaultImportFn, isUrl, readFileOrUrl } from '@graphql-mesh/utils';
import { isDocumentNode, isPromise, isValidPath } from '@graphql-tools/utils';
import { MeshServeContext } from './types';

export type SupergraphConfig =
  | GraphQLSchema
  | DocumentNode
  | string
  | (() => SupergraphConfig)
  | Promise<SupergraphConfig>;

export function handleSupergraphConfig(
  supergraphConfig: SupergraphConfig,
  serveContext: MeshServeContext,
): Promise<GraphQLSchema> | GraphQLSchema {
  if (isPromise(supergraphConfig)) {
    return supergraphConfig.then(newConfig => handleSupergraphConfig(newConfig, serveContext));
  }
  if (typeof supergraphConfig === 'function') {
    return handleSupergraphConfig(supergraphConfig(), serveContext);
  }
  if (isSchema(supergraphConfig)) {
    return supergraphConfig;
  }
  if (typeof supergraphConfig === 'string') {
    if (isValidPath(supergraphConfig) || isUrl(supergraphConfig)) {
      const sdl$ = readFileOrUrl<string>(supergraphConfig, {
        fetch: serveContext.fetch,
        cwd: serveContext.cwd,
        logger: serveContext.logger,
        allowUnknownExtensions: true,
        importFn: defaultImportFn,
      });
      if (isPromise(sdl$)) {
        return sdl$.then(sdl => handleSupergraphConfig(sdl, serveContext));
      }
      return handleSupergraphConfig(sdl$, serveContext);
    }
    try {
      return buildSchema(supergraphConfig, {
        assumeValid: true,
        assumeValidSDL: true,
      });
    } catch (e) {
      serveContext.logger.error(`Failed to load Supergraph from ${supergraphConfig}`);
      throw e;
    }
  }
  if (isDocumentNode(supergraphConfig)) {
    return buildASTSchema(supergraphConfig, {
      assumeValid: true,
      assumeValidSDL: true,
    });
  }
  throw new Error(
    `Invalid Supergraph config: ${supergraphConfig}. It can be an SDL string, a GraphQLSchema, a DocumentNode or a function that returns any of these`,
  );
}
