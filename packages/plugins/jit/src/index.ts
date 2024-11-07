import type { DocumentNode, ExecutionArgs } from 'graphql';
import { compileQuery, isCompiledQuery, type CompiledQuery } from 'graphql-jit';
import { getDocumentString, type Plugin } from '@envelop/core';
import { createLruCache } from '@graphql-mesh/utils';

function createExecuteFnWithJit() {
  const compiledQueryByDocument = new WeakMap<DocumentNode, CompiledQuery>();
  const compiledQueryByDocumentStr = createLruCache<CompiledQuery>();
  return function executeWithJit(args: ExecutionArgs) {
    let compiledQuery = compiledQueryByDocument.get(args.document);
    if (compiledQuery == null) {
      const documentStr = getDocumentString(args.document);
      compiledQuery = compiledQueryByDocumentStr.get(documentStr);
      if (compiledQuery == null) {
        const compilationResult = compileQuery(args.schema, args.document, args.operationName, {
          disableLeafSerialization: true,
        });
        if (isCompiledQuery(compilationResult)) {
          compiledQuery = compilationResult;
          compiledQueryByDocument.set(args.document, compiledQuery);
          compiledQueryByDocumentStr.set(documentStr, compiledQuery);
        } else {
          return compilationResult;
        }
      }
    }
    if (compiledQuery.subscribe) {
      return compiledQuery.subscribe(args.rootValue, args.contextValue, args.variableValues);
    }
    return compiledQuery.query(args.rootValue, args.contextValue, args.variableValues);
  };
}

export function useJIT<PluginContext extends Record<string, any> = {}>(): Plugin<PluginContext> {
  const executeFnWithJit = createExecuteFnWithJit();
  return {
    onExecute({ setExecuteFn }) {
      setExecuteFn(executeFnWithJit);
    },
    onSubscribe({ setSubscribeFn }) {
      setSubscribeFn(executeFnWithJit);
    },
  };
}
