import CacheControlParser from 'cache-control-parser';
import type { DocumentNode, GraphQLSchema } from 'graphql';
import { TypeInfo, visit, visitWithTypeInfo } from 'graphql';
import { defaultBuildResponseCacheKey } from '@envelop/response-cache';
import type { GatewayContext, GatewayPlugin } from '@graphql-hive/gateway-runtime';
import { process } from '@graphql-mesh/cross-helpers';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import type { KeyValueCache, YamlConfig } from '@graphql-mesh/types';
import { getHeadersObj } from '@graphql-mesh/utils';
import type { UseResponseCacheParameter } from '@graphql-yoga/plugin-response-cache';
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';
import { handleMaybePromise, isPromise } from '@whatwg-node/promise-helpers';

/** Glob patterns such as `Query.*` in TTL maps (Mesh schema selectors). */
function isMeshSchemaSelector(coordinate: string): boolean {
  return coordinate.includes('*');
}

function matchSelectorSegment(pattern: string, value: string): boolean {
  if (pattern === '*') {
    return true;
  }
  if (!pattern.includes('*')) {
    return pattern === value;
  }
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(value);
}

/** Match a Mesh selector (e.g. `Query.*`) against a Spec field coordinate (`Query.users`). */
export function matchMeshSchemaSelector(selector: string, schemaCoordinate: string): boolean {
  const selectorParts = selector.split('.');
  const coordinateParts = schemaCoordinate.split('.');
  if (selectorParts.length !== coordinateParts.length) {
    return false;
  }
  for (let i = 0; i < selectorParts.length; i++) {
    if (!matchSelectorSegment(selectorParts[i], coordinateParts[i])) {
      return false;
    }
  }
  return true;
}

function partitionTtlCoordinates(ttlPerSchemaCoordinate: Record<string, number>): {
  exact: Record<string, number>;
  selectors: Array<{ coordinate: string; ttl: number }>;
} {
  const exact: Record<string, number> = {};
  const selectors: Array<{ coordinate: string; ttl: number }> = [];
  for (const [coordinate, ttl] of Object.entries(ttlPerSchemaCoordinate)) {
    if (isMeshSchemaSelector(coordinate)) {
      selectors.push({ coordinate, ttl });
    } else {
      exact[coordinate] = ttl;
    }
  }
  return { exact, selectors };
}

function applyMeshSelectorTtls(params: {
  schema: GraphQLSchema;
  document: DocumentNode;
  selectors: Array<{ coordinate: string; ttl: number }>;
  context: GatewayContext;
  checkTtl: (context: GatewayContext, ttl: number) => void;
}) {
  const { schema, document, selectors, context, checkTtl } = params;
  if (selectors.length === 0) {
    return;
  }
  const typeInfo = new TypeInfo(schema);
  visit(
    document,
    visitWithTypeInfo(typeInfo, {
      Field(node) {
        const parentType = typeInfo.getParentType();
        if (!parentType) {
          return;
        }
        const schemaCoordinate = `${parentType.name}.${node.name.value}`;
        for (const { coordinate, ttl } of selectors) {
          if (matchMeshSchemaSelector(coordinate, schemaCoordinate)) {
            checkTtl(context, ttl);
          }
        }
      },
    }),
  );
}

/**
 * Yoga calls session/enabled as `(request, context)`.
 * `request.headers` is a Fetch `Headers` instance which string interpolation cannot read
 * with `{context.headers.foo}` — convert to a plain/lookup object first.
 */
function getContextWithHeaders(request?: Request, context?: Record<string, any>) {
  const headersSource = context?.headers ?? request?.headers;
  const headers = headersSource != null ? getHeadersObj(headersSource) : {};
  return {
    ...context,
    headers,
    request,
  };
}

function generateSessionIdFactory(sessionIdDef?: string | null) {
  if (sessionIdDef == null) {
    return function voidSession(): null {
      return null;
    };
  }
  return function session(request: Request, context?: Record<string, any>) {
    return stringInterpolator.parse(sessionIdDef, {
      context: getContextWithHeaders(request, context),
      env: process.env,
    });
  };
}

function generateEnabledFactory(ifDef: string) {
  return function enabled(request: Request, context?: Record<string, any>) {
    // eslint-disable-next-line no-new-func
    return new Function('context', `return ${ifDef}`)(getContextWithHeaders(request, context));
  };
}

function getBuildResponseCacheKey(
  cacheKeyDef: string,
): UseResponseCacheParameter['buildResponseCacheKey'] {
  return function buildResponseCacheKey(cacheKeyParameters) {
    const { request, context, ...rest } = cacheKeyParameters;
    const contextWithHeaders = getContextWithHeaders(request, context as Record<string, any>);
    let cacheKey = stringInterpolator.parse(cacheKeyDef, {
      ...rest,
      request,
      context: contextWithHeaders,
      // Docs historically used `contextValue` (Envelop naming)
      contextValue: contextWithHeaders,
      env: process.env,
    });
    if (!cacheKey) {
      cacheKey = defaultBuildResponseCacheKey(cacheKeyParameters);
    }
    return cacheKey;
  };
}

function getShouldCacheResult(
  shouldCacheResultDef: string,
): UseResponseCacheParameter['shouldCacheResult'] {
  return function shouldCacheResult({ result }) {
    // eslint-disable-next-line no-new-func
    return new Function(`return ${shouldCacheResultDef}`)();
  };
}

function getCacheForResponseCache(meshCache?: KeyValueCache): UseResponseCacheParameter['cache'] {
  if (!meshCache) {
    throw new Error(
      'Response Cache is enabled, but no cache is configured. Please provide a cache instance through the `cache` option.',
    );
  }
  return {
    get(responseId) {
      return meshCache.get(`response-cache:${responseId}`);
    },
    set(responseId, data, entities, ttl) {
      const ttlConfig = Number.isFinite(ttl) ? { ttl: ttl / 1000 } : undefined;
      const jobs: PromiseLike<void>[] = [];
      const job = meshCache.set(`response-cache:${responseId}`, data, ttlConfig);
      if (isPromise(job)) {
        jobs.push(job);
      }
      for (const { typename, id } of entities) {
        const entryId = `${typename}.${id}`;
        const job1 = meshCache.set(`response-cache:${entryId}:${responseId}`, {}, ttlConfig);
        const job2 = meshCache.set(`response-cache:${responseId}:${entryId}`, {}, ttlConfig);
        if (isPromise(job1)) {
          jobs.push(job1);
        }
        if (isPromise(job2)) {
          jobs.push(job2);
        }
      }
      if (jobs.length === 0) {
        return undefined;
      }
      if (jobs.length === 1) {
        return jobs[0] as Promise<void>;
      }
      return Promise.all(jobs).then(() => undefined);
    },
    invalidate(entitiesToRemove) {
      const responseIdsToCheck = new Set<string>();
      const entitiesToRemoveJobs: PromiseLike<any>[] = [];
      for (const { typename, id } of entitiesToRemove) {
        const entryId = `${typename}.${id}`;
        const job = handleMaybePromise(
          () => meshCache.getKeysByPrefix(`response-cache:${entryId}:`),
          cacheEntriesToDelete => {
            const jobs: PromiseLike<any>[] = [];
            for (const cacheEntryName of cacheEntriesToDelete) {
              const [, , responseId] = cacheEntryName.split(':');
              responseIdsToCheck.add(responseId);
              const job = meshCache.delete(cacheEntryName);
              if (isPromise(job)) {
                jobs.push(job);
              }
            }
            if (jobs.length === 0) {
              return undefined;
            }
            if (jobs.length === 1) {
              return jobs[0];
            }
            return Promise.all(jobs);
          },
        );
        if (isPromise(job)) {
          entitiesToRemoveJobs.push(job);
        }
      }
      let promiseAllJob: PromiseLike<any> | undefined;
      if (entitiesToRemoveJobs.length === 1) {
        promiseAllJob = entitiesToRemoveJobs[0];
      } else if (entitiesToRemoveJobs.length > 0) {
        promiseAllJob = Promise.all(entitiesToRemoveJobs);
      }
      return handleMaybePromise(
        () => promiseAllJob,
        () => {
          const responseIdsToCheckJobs: PromiseLike<any>[] = [];
          for (const responseId of responseIdsToCheck) {
            const job = handleMaybePromise(
              () => meshCache.getKeysByPrefix(`response-cache:${responseId}:`),
              cacheEntries => {
                if (cacheEntries.length !== 0) {
                  return meshCache.delete(`response-cache:${responseId}`);
                }
                return undefined;
              },
            );
            if (isPromise(job)) {
              responseIdsToCheckJobs.push(job);
            }
          }
          if (responseIdsToCheckJobs.length === 0) {
            return undefined;
          } else if (responseIdsToCheckJobs.length === 1) {
            return responseIdsToCheckJobs[0];
          }
          return Promise.all(responseIdsToCheckJobs);
        },
      );
    },
  };
}

export type ResponseCacheConfig = Omit<UseResponseCacheParameter, 'cache'> & {
  /**
   * The Mesh cache instance to use for storing the response cache.
   *
   * The cache should be provided from the Mesh context:
   * ```ts
   * defineConfig({
   *   plugins: ctx => [
   *     useMeshResponseCache({ ...ctx })
   *   ]
   * })
   * ```
   */
  cache: KeyValueCache;
};

/**
 * Response cache plugin for GraphQL Mesh / Gateway.
 *
 * `ttlPerCoordinate` accepts Spec Schema Coordinates (`Type`, `Type.field`) and Mesh selectors
 * with `*` (e.g. `Query.*`). Exact keys go to Yoga/Envelop; selectors are matched by Mesh.
 */
export default function useMeshResponseCache(
  options: ResponseCacheConfig | (YamlConfig.ResponseCacheConfig & { cache?: KeyValueCache }),
): GatewayPlugin {
  const ttlPerType: Record<string, number> = { ...(options as ResponseCacheConfig).ttlPerType };
  const ttlPerSchemaCoordinate: Record<string, number> = {
    ...(options as ResponseCacheConfig).ttlPerSchemaCoordinate,
  };

  const { ttlPerCoordinate } = options as YamlConfig.ResponseCacheConfig;
  if (ttlPerCoordinate) {
    for (const ttlConfig of ttlPerCoordinate) {
      ttlPerSchemaCoordinate[ttlConfig.coordinate] = ttlConfig.ttl;
    }
  }

  const { exact: exactTtlPerSchemaCoordinate, selectors: meshSchemaSelectors } =
    partitionTtlCoordinates(ttlPerSchemaCoordinate);

  // Stored TTL by the context
  // To be compared with the calculated one later in `onTtl`
  const ttlByContext = new WeakMap<any, number>();

  // Checks the TTL stored in the context
  // Takes the lowest value
  function checkTtl(context: GatewayContext, ttl: number) {
    const ttlForThisContext = ttlByContext.get(context);
    if (ttlForThisContext == null || ttl < ttlForThisContext) {
      ttlByContext.set(context, ttl);
    }
  }

  // @ts-expect-error - GatewayPlugin types
  const plugin: GatewayPlugin = useResponseCache({
    includeExtensionMetadata:
      options.includeExtensionMetadata != null
        ? options.includeExtensionMetadata
        : process.env.DEBUG === '1',
    session: 'sessionId' in options ? generateSessionIdFactory(options.sessionId) : () => null,
    enabled: 'if' in options ? generateEnabledFactory(options.if) : undefined,
    buildResponseCacheKey:
      'cacheKey' in options ? getBuildResponseCacheKey(options.cacheKey) : undefined,

    ...options,

    shouldCacheResult:
      typeof options.shouldCacheResult === 'string'
        ? getShouldCacheResult(options.shouldCacheResult)
        : options.shouldCacheResult,
    cache: getCacheForResponseCache(options.cache),
    ttlPerType,
    ttlPerSchemaCoordinate: exactTtlPerSchemaCoordinate,
    // Checks the TTL stored in the context
    // Compares it to the calculated one
    // Then it takes the lowest value
    onTtl({ ttl, context }) {
      const ttlForThisContext = ttlByContext.get(context);
      if (ttlForThisContext != null && ttlForThisContext < ttl) {
        return ttlForThisContext;
      }
      return ttl;
    },
  });

  const envelopOnExecute = plugin.onExecute;
  plugin.onExecute = function onExecuteWithMeshSelectors(payload) {
    if (meshSchemaSelectors.length > 0) {
      applyMeshSelectorTtls({
        schema: payload.args.schema,
        document: payload.args.document,
        selectors: meshSchemaSelectors,
        context: payload.args.contextValue as GatewayContext,
        checkTtl,
      });
    }
    return envelopOnExecute?.call(this, payload);
  };

  plugin.onFetch = function ({ executionRequest, context }) {
    // Only if it is a subgraph request
    if (executionRequest && context) {
      return function onFetchDone({ response }) {
        const cacheControlHeader = response.headers.get('cache-control');
        if (cacheControlHeader != null) {
          const parsedCacheControl = CacheControlParser.parse(cacheControlHeader);
          if (parsedCacheControl['max-age'] != null) {
            const maxAgeInSeconds = parsedCacheControl['max-age'];
            const maxAgeInMs = maxAgeInSeconds * 1000;
            checkTtl(context as GatewayContext, maxAgeInMs);
          }
          if (parsedCacheControl['s-maxage'] != null) {
            const sMaxAgeInSeconds = parsedCacheControl['s-maxage'];
            const sMaxAgeInMs = sMaxAgeInSeconds * 1000;
            checkTtl(context as GatewayContext, sMaxAgeInMs);
          }
        }
      };
    }
  };
  return plugin;
}
