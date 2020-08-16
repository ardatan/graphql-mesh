import { parse, DocumentNode } from 'graphql';
import { GraphQLOperation } from '@graphql-mesh/types';

export function ensureDocumentNode(document: GraphQLOperation): DocumentNode {
  return typeof document === 'string' ? parse(document) : document;
}
