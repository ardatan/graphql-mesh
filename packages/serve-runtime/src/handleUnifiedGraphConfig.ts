/* eslint-disable import/no-extraneous-dependencies */
import { buildASTSchema, buildSchema, DocumentNode, GraphQLSchema, isSchema } from 'graphql';
import { defaultImportFn, isUrl, readFileOrUrl } from '@graphql-mesh/utils';
import { isDocumentNode, isPromise, isValidPath } from '@graphql-tools/utils';
import { MeshServeConfigContext } from './types';

export type UnifiedGraphSchema = GraphQLSchema | DocumentNode | string;

export type UnifiedGraphConfig =
  | UnifiedGraphSchema
  | Promise<UnifiedGraphSchema>
  | (() => UnifiedGraphSchema | Promise<UnifiedGraphSchema>);

export function handleUnifiedGraphConfig(
  config: UnifiedGraphConfig,
  configContext: MeshServeConfigContext,
): Promise<GraphQLSchema> | GraphQLSchema {
  const config$ = typeof config === 'function' ? config() : config;
  if (isPromise(config$)) {
    return config$.then(schema => handleUnifiedGraphConfig(schema, configContext));
  }
  return handleUnifiedGraphConfig(config$, configContext);
}

export function handleUnifiedGraphSchema(
  schema: UnifiedGraphSchema,
  configContext: MeshServeConfigContext,
): Promise<GraphQLSchema> | GraphQLSchema {
  if (isSchema(schema)) {
    return schema;
  }
  if (isDocumentNode(schema)) {
    return buildASTSchema(schema, {
      assumeValid: true,
      assumeValidSDL: true,
    });
  }
  if (typeof schema === 'string') {
    if (isValidPath(schema) || isUrl(schema)) {
      return readFileOrUrl<string>(schema, {
        fetch: configContext.fetch,
        cwd: configContext.cwd,
        logger: configContext.logger,
        allowUnknownExtensions: true,
        importFn: defaultImportFn,
      }).then(sdl => handleUnifiedGraphSchema(sdl, configContext));
    }
    try {
      return buildSchema(schema, {
        assumeValid: true,
        assumeValidSDL: true,
      });
    } catch (e) {
      configContext.logger.error(`Failed to build UnifiedGraphSchema from "${schema}"`);
      throw e;
    }
  }
  throw new Error(
    `Invalid UnifiedGraphSchema "${schema}". It can be an SDL string, an instance of GraphQLSchema or DocumentNode, or a function that returns/resolves any of these.`,
  );
}
