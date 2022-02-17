import { parseWithCache, printWithCache } from './parseAndPrintWithCache';
import { GraphQLOperation } from '@graphql-mesh/types';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';

export function getDocumentNodeAndSDL<TData = any, TVariables = any>(
  documentOrSDL: GraphQLOperation<TData, TVariables>
): {
  document: TypedDocumentNode<TData, TVariables>;
  sdl: string;
} {
  const sdl = typeof documentOrSDL === 'string' ? documentOrSDL : printWithCache(documentOrSDL);
  return {
    document: parseWithCache(sdl),
    sdl,
  };
}
