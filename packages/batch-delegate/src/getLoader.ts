import DataLoader from 'dataloader';
import { getNamedType, GraphQLList, print, type GraphQLSchema } from 'graphql';
import {
  delegateToSchema,
  getActualFieldNodes,
  type SubschemaConfig,
} from '@graphql-tools/delegate';
import { memoize1, memoize3, relocatedError } from '@graphql-tools/utils';
import { fakePromise } from '@whatwg-node/promise-helpers';
import { type BatchDelegateOptions } from './types.js';

const DEFAULT_ARGS_FROM_KEYS = (keys: ReadonlyArray<any>) => ({ ids: keys });

function createBatchFn<K = any>(options: BatchDelegateOptions) {
  const argsFromKeys = options.argsFromKeys ?? DEFAULT_ARGS_FROM_KEYS;
  const fieldName = options.fieldName ?? options.info.fieldName;
  const { valuesFromResults, lazyOptionsFn } = options;

  return function batchFn(keys: ReadonlyArray<K>) {
    return fakePromise()
      .then(() =>
        delegateToSchema({
          returnType: new GraphQLList(getNamedType(options.returnType || options.info.returnType)),
          onLocatedError: originalError => {
            if (originalError.path == null) {
              return originalError;
            }

            const [pathFieldName, pathNumber, ...rest] = originalError.path;

            if (pathFieldName !== fieldName) {
              return originalError;
            }
            const pathNumberType = typeof pathNumber;
            if (pathNumberType !== 'number') {
              return originalError;
            }

            return relocatedError(originalError, [fieldName, ...rest]);
          },
          args: argsFromKeys(keys),
          ...(lazyOptionsFn == null ? options : lazyOptionsFn(options, keys)),
        }),
      )
      .then(results => {
        const values =
          valuesFromResults == null
            ? results
            : results instanceof Error
              ? keys.map(() => results)
              : valuesFromResults(results, keys);

        if (!Array.isArray(values)) {
          return keys.map(() => values);
        }

        // DataLoader's batch function must resolve to a dense array whose
        // length matches the keys: its `isArrayLike` check requires
        // `hasOwnProperty(length - 1)`, so a sparse array (e.g. one whose
        // trailing slot was never assigned because the last key had no
        // matching row in the subschema result) makes it throw
        // "did not return a Promise of an Array". Normalise to a dense array
        // of `keys.length`, padding any missing entries with `null`.
        const dense = new Array(keys.length);
        for (let i = 0; i < keys.length; i++) {
          dense[i] = values[i] ?? null;
        }
        return dense;
      })
      .catch(error => keys.map(() => error));
  };
}

const getLoadersMap = memoize3(function getLoadersMap<K, V, C>(
  _rootValue: Record<string, any>,
  _context: Record<string, any>,
  _schema: GraphQLSchema | SubschemaConfig<any, any, any, any>,
) {
  return new Map<string, DataLoader<K, V, C>>();
});

const GLOBAL_CONTEXT = {};

const memoizedJsonStringify = memoize1(function jsonStringify(value: any) {
  return JSON.stringify(value);
});

const memoizedPrint = memoize1(print);

function defaultCacheKeyFn(key: any) {
  if (typeof key === 'object') {
    return memoizedJsonStringify(key);
  }
  return key;
}

export function getLoader<K = any, V = any, C = K>(
  options: BatchDelegateOptions<any>,
): DataLoader<K, V, C> {
  const {
    schema,
    context,
    info,
    fieldName = info.fieldName,
    dataLoaderOptions,
    fieldNodes = info.fieldNodes[0] && getActualFieldNodes(info.fieldNodes[0]),
    selectionSet = fieldNodes?.[0]?.selectionSet,
    returnType = info.returnType,
    argsFromKeys = DEFAULT_ARGS_FROM_KEYS,
    key,
  } = options;
  // we want to use the rootvalue because on streaming results it will be available
  // and will always change for the next value in the iterable. this makes sure
  // that the data loader does not use the same cache for each streaming value
  // but the rootvalue alone is not enough, servers like mercurius share a single
  // rootvalue across all requests so the context has to scope the loaders too
  const loaders = getLoadersMap<K, V, C>(
    info?.rootValue || GLOBAL_CONTEXT,
    context || GLOBAL_CONTEXT,
    schema,
  );

  let cacheKey = fieldName;

  if (returnType) {
    const namedType = getNamedType(returnType);
    cacheKey += '@' + namedType.name;
  }

  if (selectionSet != null) {
    cacheKey += memoizedPrint(selectionSet);
  }

  const fieldNode = fieldNodes?.[0];
  if (fieldNode?.arguments) {
    const args = argsFromKeys([key]);
    cacheKey += fieldNode.arguments
      .filter(arg => arg.name.value in args)
      .map(arg => memoizedPrint(arg))
      .join(',');
  }

  let loader = loaders.get(cacheKey);

  if (loader === undefined) {
    const batchFn = createBatchFn(options);
    loader = new DataLoader<K, V, C>(batchFn, {
      // Prevents the keys to be passed with the same structure
      cacheKeyFn: defaultCacheKeyFn,
      ...dataLoaderOptions,
    });
    loaders.set(cacheKey, loader);
  }

  return loader;
}
