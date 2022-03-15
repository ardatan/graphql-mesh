import { memoize1 } from '@graphql-tools/utils';
import { DocumentNode, parse, print } from 'graphql';
import { createLruCache } from './global-lru-cache';

const parseCache = createLruCache(1000, 3600);
const printCache = createLruCache(1000, 3600);

export function parseWithCache(sdl: string): DocumentNode {
  const trimmedSdl = sdl.trim();
  let document: DocumentNode = parseCache.get(trimmedSdl);
  if (!document) {
    document = parse(trimmedSdl, { noLocation: true });
    parseCache.set(trimmedSdl, document);
    printCache.set(JSON.stringify(document), trimmedSdl);
  }
  return document;
}

export const printWithCache = memoize1(function printWithCache(document: DocumentNode): string {
  const stringifedDocumentJson = JSON.stringify(document);
  let sdl: string = printCache.get(stringifedDocumentJson);
  if (!sdl) {
    sdl = print(document).trim();
    printCache.set(stringifedDocumentJson, sdl);
    parseCache.set(sdl, document);
  }
  return sdl;
});

export function gql([sdl]: [string]) {
  return parseWithCache(sdl);
}
