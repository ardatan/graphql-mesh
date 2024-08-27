/* eslint-disable import/no-extraneous-dependencies */
import type { DocumentNode, GraphQLSchema } from 'graphql';
import { buildASTSchema, isSchema, parse, print } from 'graphql';
import { defaultImportFn, isUrl, mapMaybePromise, readFileOrUrl } from '@graphql-mesh/utils';
import type { MaybePromise } from '@graphql-tools/utils';
import { getDocumentNodeFromSchema, isDocumentNode, isValidPath } from '@graphql-tools/utils';
import type { GatewayConfigContext } from './types.js';

export type UnifiedGraphSchema = GraphQLSchema | DocumentNode | string;

export type UnifiedGraphConfig =
  | UnifiedGraphSchema
  | Promise<UnifiedGraphSchema>
  | (() => UnifiedGraphSchema | Promise<UnifiedGraphSchema>);

export function handleUnifiedGraphConfig(
  config: UnifiedGraphConfig,
  configContext: GatewayConfigContext,
): MaybePromise<GraphQLSchema> {
  return mapMaybePromise(typeof config === 'function' ? config() : config, schema =>
    handleUnifiedGraphSchema(schema, configContext),
  );
}

export const unifiedGraphASTMap = new WeakMap<GraphQLSchema, DocumentNode>();
export const unifiedGraphSDLMap = new WeakMap<GraphQLSchema, string>();

export function getUnifiedGraphSDL(schema: GraphQLSchema) {
  let sdl = unifiedGraphSDLMap.get(schema);
  if (!sdl) {
    const ast = getUnifiedGraphAST(schema);
    sdl = print(ast);
    unifiedGraphSDLMap.set(schema, sdl);
  }
  return sdl;
}

export function getUnifiedGraphAST(schema: GraphQLSchema) {
  let ast = unifiedGraphASTMap.get(schema);
  if (!ast) {
    ast = getDocumentNodeFromSchema(schema);
    unifiedGraphASTMap.set(schema, ast);
  }
  return ast;
}

export function handleUnifiedGraphSchema(
  unifiedGraphSchema: UnifiedGraphSchema,
  configContext: GatewayConfigContext,
): Promise<GraphQLSchema> | GraphQLSchema {
  if (isSchema(unifiedGraphSchema)) {
    return unifiedGraphSchema;
  }
  if (isDocumentNode(unifiedGraphSchema)) {
    const schema = buildASTSchema(unifiedGraphSchema, {
      assumeValid: true,
      assumeValidSDL: true,
    });
    unifiedGraphASTMap.set(schema, unifiedGraphSchema);
    return schema;
  }
  if (typeof unifiedGraphSchema === 'string') {
    if (isValidPath(unifiedGraphSchema) || isUrl(unifiedGraphSchema)) {
      return readFileOrUrl<string>(unifiedGraphSchema, {
        fetch: configContext.fetch,
        cwd: configContext.cwd,
        logger: configContext.logger,
        allowUnknownExtensions: true,
        importFn: defaultImportFn,
      }).then(sdl => handleUnifiedGraphSchema(sdl, configContext));
    }
    try {
      const ast = parse(unifiedGraphSchema, {
        noLocation: true,
      });
      const schema = buildASTSchema(ast, {
        assumeValid: true,
        assumeValidSDL: true,
      });
      unifiedGraphSDLMap.set(schema, unifiedGraphSchema);
      unifiedGraphASTMap.set(schema, ast);
      return schema;
    } catch (e) {
      configContext.logger.error(`Failed to build UnifiedGraphSchema from "${unifiedGraphSchema}"`);
      throw e;
    }
  }
  throw new Error(
    `Invalid UnifiedGraphSchema "${unifiedGraphSchema}". It can be an SDL string, an instance of GraphQLSchema or DocumentNode, or a function that returns/resolves any of these.`,
  );
}
