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
   * Intended to force Query vs Mutation for matching GraphQL field names.
   * Current RAML emit only treats a truthy map entry as Query (any non-empty
   * `type` string, including `'mutation'`), so Mutation overrides do not work
   * yet - use this only as a Query force, or omit and rely on HTTP method
   * (GET -> Query, otherwise Mutation).
   *
   * @example [{ type: 'query', fieldName: 'getUsers' }]
   */
  selectQueryOrMutationField?: SelectQueryOrMutationFieldConfig[];
}

/**
 * Entry for {@link RAMLLoaderOptions.selectQueryOrMutationField}.
 * See that field for the current Query-only override limitation.
 *
 * @example { type: 'query', fieldName: 'getUsers' }
 */
export interface SelectQueryOrMutationFieldConfig {
  /**
   * Target root type. Today only a truthy value forces Query; `'mutation'` is
   * not honored by the RAML selector.
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
