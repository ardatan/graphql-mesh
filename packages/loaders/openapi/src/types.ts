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
   */
  source: string;
  /**
   * Force Query vs Mutation for matching operation / GraphQL field names,
   * overriding the loader's default get/list/... Query heuristic for those
   * entries.
   *
   * @example [{ type: 'query', fieldName: 'listPets' }]
   */
  selectQueryOrMutationField?: SelectQueryOrMutationFieldConfig[];
  /**
   * Force document parse format when the URL/path has no clear extension
   * (for example a bare URL without `.yaml` / `.json`).
   *
   * @example 'yaml'
   */
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  /**
   * Enable JSON:API-style field handling when the OpenAPI document uses
   * JSON:API response shapes / sparse fieldsets.
   */
  jsonApi?: boolean;
  /**
   * HATEOAS `_links` / `x-links` handling.
   * `true` applies defaults (`rel` / `href` / `_links` / `x-links`).
   * A full {@link HATEOASConfig} object replaces those identifiers.
   * When omitted, the same defaults are used (link processing stays on).
   * Pass `false` to disable HATEOAS link resolution.
   *
   * @example {
   *   linkNameIdentifier: 'relation',
   *   linkPathIdentifier: 'url',
   *   linkObjectIdentifier: 'links',
   *   linkObjectExtensionIdentifier: 'x-hateoas-links',
   * }
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
