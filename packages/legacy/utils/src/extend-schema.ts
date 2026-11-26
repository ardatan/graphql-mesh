import type { DocumentNode, GraphQLSchema } from 'graphql';
import { extendSchema as graphqlExtendSchema } from 'graphql';

export type ExtendSchemaOptions = {
  assumeValid?: boolean;
  assumeValidSDL?: boolean;
};

/**
 * `graphql` v16 `extendSchema` drops `schema.extensions` (including Mesh/Connectors
 * `extensions.directives` used by `printSchemaWithDirectives`). v17 keeps them.
 * Always re-attach prior extensions so 16/17 stay equivalent.
 */
export function extendSchemaPreservingExtensions(
  schema: GraphQLSchema,
  documentAST: DocumentNode,
  options?: ExtendSchemaOptions,
): GraphQLSchema {
  const prior = schema.extensions;
  const next = graphqlExtendSchema(schema, documentAST, options);
  if (prior == null || Object.keys(prior).length === 0) {
    return next;
  }
  next.extensions = {
    ...prior,
    ...(next.extensions || {}),
  };
  return next;
}
