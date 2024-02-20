/* eslint-disable import/no-extraneous-dependencies */
import { buildASTSchema, buildSchema, DocumentNode, GraphQLSchema, isSchema } from 'graphql';
import { defaultImportFn, isUrl, readFileOrUrl } from '@graphql-mesh/utils';
import { isDocumentNode, isPromise, isValidPath } from '@graphql-tools/utils';
import { MeshServeConfigContext } from './types';

export type UnifiedGraphConfig =
  | GraphQLSchema
  | DocumentNode
  | string
  | (() => UnifiedGraphConfig)
  | Promise<UnifiedGraphConfig>;

export function handleUnifiedGraphConfig(
  unifiedGraphConfig: UnifiedGraphConfig,
  configContext: MeshServeConfigContext,
): Promise<GraphQLSchema> | GraphQLSchema {
  if (isPromise(unifiedGraphConfig)) {
    return unifiedGraphConfig.then(newConfig => handleUnifiedGraphConfig(newConfig, configContext));
  }
  if (typeof unifiedGraphConfig === 'function') {
    return handleUnifiedGraphConfig(unifiedGraphConfig(), configContext);
  }
  if (isSchema(unifiedGraphConfig)) {
    return unifiedGraphConfig;
  }
  if (typeof unifiedGraphConfig === 'string') {
    if (isValidPath(unifiedGraphConfig) || isUrl(unifiedGraphConfig)) {
      const sdl$ = readFileOrUrl<string>(unifiedGraphConfig, {
        fetch: configContext.fetch,
        cwd: configContext.cwd,
        logger: configContext.logger,
        allowUnknownExtensions: true,
        importFn: defaultImportFn,
      });
      if (isPromise(sdl$)) {
        return sdl$.then(sdl => handleUnifiedGraphConfig(sdl, configContext));
      }
      return handleUnifiedGraphConfig(sdl$, configContext);
    }
    try {
      return buildSchema(unifiedGraphConfig, {
        assumeValid: true,
        assumeValidSDL: true,
      });
    } catch (e) {
      configContext.logger.error(`Failed to load Supergraph from ${unifiedGraphConfig}`);
      throw e;
    }
  }
  if (isDocumentNode(unifiedGraphConfig)) {
    return buildASTSchema(unifiedGraphConfig, {
      assumeValid: true,
      assumeValidSDL: true,
    });
  }
  throw new Error(
    `Invalid Supergraph config: ${unifiedGraphConfig}. It can be an SDL string, a GraphQLSchema, a DocumentNode or a function that returns any of these`,
  );
}
