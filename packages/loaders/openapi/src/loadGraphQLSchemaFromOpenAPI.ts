import {
  loadGraphQLSchemaFromJSONSchemas,
  loadNonExecutableGraphQLSchemaFromJSONSchemas,
} from '@omnigraph/json-schema';
import {
  getJSONSchemaOptionsFromOpenAPIOptions,
  type HATEOASContext,
} from './getJSONSchemaOptionsFromOpenAPIOptions.js';
import type { OpenAPILoaderOptions } from './types.js';

/**
 * Isolated HATEOAS state for a single-document load.
 * Avoids the process-global `defaultLoadedSchemas` / `defaultFutureLinks` maps
 * (and their 5s unresolved-link timers) that break Jest `--detectLeaks` on large
 * fixtures such as Calendly / Spotify. Cross-schema compose keeps using the
 * process defaults via {@link loadNonExecutableGraphQLSchemaFromOpenAPI} or
 * `getJSONSchemaOptionsFromMultipleOpenAPIOptions`.
 */
function createEphemeralHateoasContext(): HATEOASContext {
  return {
    futureLinks: new Set(),
    loadedSchemas: new Map(),
  };
}

/**
 * Creates a local GraphQLSchema instance from a OpenAPI Document.
 * Everytime this function is called, the OpenAPI file and its dependencies will be resolved on runtime.
 * If you want to avoid this, use `createBundle` function to create a bundle once and save it to a storage
 * then load it with `loadGraphQLSchemaFromBundle`.
 */
export async function loadGraphQLSchemaFromOpenAPI(name: string, options: OpenAPILoaderOptions) {
  const extraJSONSchemaOptions = await getJSONSchemaOptionsFromOpenAPIOptions(
    name,
    options,
    createEphemeralHateoasContext(),
  );
  return loadGraphQLSchemaFromJSONSchemas(name, {
    ...options,
    ...extraJSONSchemaOptions,
  });
}

export async function loadNonExecutableGraphQLSchemaFromOpenAPI(
  name: string,
  options: OpenAPILoaderOptions,
) {
  const extraJSONSchemaOptions = await getJSONSchemaOptionsFromOpenAPIOptions(name, options);
  return loadNonExecutableGraphQLSchemaFromJSONSchemas(name, {
    ...options,
    ...extraJSONSchemaOptions,
  });
}

export { processDirectives } from '@omnigraph/json-schema';
