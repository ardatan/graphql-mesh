import type { JSONSchemaLoaderOptions } from '@omnigraph/json-schema';

/**
 * Options for {@link loadRAMLSubgraph} / {@link loadGraphQLSchemaFromRAML}.
 * Extends {@link JSONSchemaLoaderOptions}; `source` is required (RAML document).
 *
 * @example
 * ```ts
 * import { loadRAMLSubgraph } from '@omnigraph/raml';
 *
 * loadRAMLSubgraph('api', {
 *   source: './api.raml',
 *   endpoint: 'https://api.example.com',
 * })
 * ```
 */
export interface RAMLLoaderOptions extends Partial<JSONSchemaLoaderOptions> {
  /**
   * URL or filesystem path to the RAML document.
   *
   * @example './api.raml'
   */
  source: string;
  /**
   * Force Query vs Mutation for matching field names.
   *
   * @example [{ type: 'query', fieldName: 'getUsers' }]
   */
  selectQueryOrMutationField?: SelectQueryOrMutationFieldConfig[];
}

/**
 * Force a RAML operation onto Query or Mutation by field name.
 *
 * @example { type: 'mutation', fieldName: 'createUser' }
 */
export interface SelectQueryOrMutationFieldConfig {
  /**
   * Target root type.
   *
   * @example 'query'
   */
  type: 'query' | 'mutation' | 'Query' | 'Mutation';
  /**
   * GraphQL field name to force.
   *
   * @example 'getUsers'
   */
  fieldName: string;
}
