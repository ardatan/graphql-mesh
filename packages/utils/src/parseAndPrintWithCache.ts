import { DocumentNode, parse, print } from 'graphql';
import { globalLruCache } from './global-lru-cache';

export function parseWithCache(sdl: string): DocumentNode {
  const sdlKey = `sdl_${sdl.trim()}`;
  let document: DocumentNode = globalLruCache.get(sdlKey);
  if (!document) {
    document = parse(sdl, { noLocation: true });
    globalLruCache.set(sdlKey, document);
    const stringifedDocumentJson = JSON.stringify(document);
    const documentJsonKey = `documentJson_${stringifedDocumentJson}`;
    globalLruCache.set(documentJsonKey, sdl);
  }
  return document;
}

export function printWithCache(document: DocumentNode): string {
  const stringifedDocumentJson = JSON.stringify(document);
  let sdl: string = globalLruCache.get(stringifedDocumentJson);
  if (!sdl) {
    sdl = print(document).trim();
    const documentJsonKey = `documentJson_${stringifedDocumentJson}`;
    globalLruCache.set(documentJsonKey, sdl);
    const sdlKey = `sdl_${sdl}`;
    if (!globalLruCache.has(sdlKey)) {
      globalLruCache.set(sdlKey, document);
    }
  }
  return sdl;
}

export function gql([sdl]: [string]) {
  return parseWithCache(sdl);
}
