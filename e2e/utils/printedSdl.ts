/**
 * Helpers for asserting against Mesh Compose SDL under GraphQL 16 + 17.
 *
 * GraphQL 17 pretty-prints directive/connect `args: { ... }` across lines.
 * A first-line-only match (`[^\n]*`) misses `entity: true`, `$args.*`, etc.
 */

/** End of a field block: next sibling field (with or without args), next type, or `}`. */
const FIELD_BLOCK_END = /(?=\n\s{2}\w+(?:\(|:)|\n\s*type |\n\})/;

/**
 * Match a field definition including multi-line `@join__directive` / `@connect`
 * args. `fieldStart` must match through the return type name (e.g.
 * `/getPetById\([\s\S]*?\):\s*Pet/`).
 */
export function matchPrintedFieldBlock(sdl: string, fieldStart: RegExp): string {
  const source = fieldStart.source;
  const flags = fieldStart.flags.includes('g')
    ? fieldStart.flags.replace('g', '')
    : fieldStart.flags;
  const re = new RegExp(`${source}[\\s\\S]*?${FIELD_BLOCK_END.source}`, flags);
  return sdl.match(re)?.[0] || '';
}
