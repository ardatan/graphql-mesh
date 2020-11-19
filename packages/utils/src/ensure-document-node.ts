import { parse } from 'graphql';
import { GraphQLOperation } from '@graphql-mesh/types';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';

export function ensureDocumentNode<TData = any, TVariables = any>(
  document: GraphQLOperation<TData, TVariables>
): TypedDocumentNode<TData, TVariables> {
  return typeof document === 'string' ? parse(document) : document;
}
