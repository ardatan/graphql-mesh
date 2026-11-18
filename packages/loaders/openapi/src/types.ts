import type { JSONSchemaLoaderOptions } from '@omnigraph/json-schema';
import type { HATEOASConfig } from './getJSONSchemaOptionsFromOpenAPIOptions.js';

/**
 * Options for {@link loadOpenAPISubgraph} / {@link loadNonExecutableGraphQLSchemaFromOpenAPI}.
 * Extends {@link JSONSchemaLoaderOptions}; `source` is required (OpenAPI document).
 *
 * @example
 * ```ts
 * import { loadOpenAPISubgraph } from '@omnigraph/openapi';
 *
 * loadOpenAPISubgraph('petstore', {
 *   source: './openapi.yaml',
 *   endpoint: 'https://petstore.example.com/api',
 *   operationHeaders: { Authorization: 'Bearer {context.token}' },
 * })
 * ```
 * @example
 * ```ts
 * loadOpenAPISubgraph('wiki', {
 *   source: 'https://api.example.com/openapi.json',
 *   selectQueryOrMutationField: [{ type: 'query', fieldName: 'getPage' }],
 *   HATEOAS: true,
 * })
 * ```
 */
export interface OpenAPILoaderOptions extends Partial<JSONSchemaLoaderOptions> {
  /**
   * URL or filesystem path to the OpenAPI / Swagger document.
   *
   * @example './openapi.yaml'
   * @example 'https://petstore.example.com/openapi.json'
   */
  source: string;
  /**
   * Force Query vs Mutation for matching operation / field names.
   *
   * @example [{ type: 'query', fieldName: 'listPets' }]
   */
  selectQueryOrMutationField?: SelectQueryOrMutationFieldConfig[];
  /**
   * Force document parse format when the URL/path has no clear extension.
   *
   * @example 'yaml'
   */
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  /**
   * Enable JSON:API-style field handling when the document uses it.
   *
   * @example true
   */
  jsonApi?: boolean;
  /**
   * HATEOAS `_links` / `x-links` handling (`true` = defaults, or custom identifiers).
   *
   * @example true
   * @example { linkObjectIdentifier: '_links', linkNameIdentifier: 'rel' }
   */
  HATEOAS?: HATEOASConfig | boolean;
}

/**
 * Force an OpenAPI operation onto Query or Mutation by field name.
 *
 * @example { type: 'query', fieldName: 'getPetById' }
 */
export interface SelectQueryOrMutationFieldConfig {
  /**
   * Target root type.
   *
   * @example 'query'
   * @example 'Mutation'
   */
  type: 'query' | 'mutation' | 'Query' | 'Mutation';
  /**
   * GraphQL field name to force.
   *
   * @example 'listPets'
   */
  fieldName: string;
}
