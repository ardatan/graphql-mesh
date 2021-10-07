import { DocumentNode, parse, print } from 'graphql';
import { globalLruCache } from './global-lru-cache';

const documentPrintCache = new WeakMap<DocumentNode, string>();

export function parseWithCache(sdl: string): DocumentNode {
  let document: DocumentNode = globalLruCache.get(sdl);
  if (!document) {
    document = parse(sdl);
    globalLruCache.set(sdl, document);
    documentPrintCache.set(document, sdl);
  }
  return document;
}

export function printWithCache(document: DocumentNode): string {
  let sdl: string = documentPrintCache.get(document);
  if (!sdl) {
    sdl = print(document);
    documentPrintCache.set(document, sdl);
    if (!globalLruCache.has(sdl)) {
      globalLruCache.set(sdl, document);
    }
  }
  return sdl;
}
