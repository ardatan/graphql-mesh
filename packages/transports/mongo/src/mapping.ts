import type { MongoMappingEntry, MongoMappingValue, ParsedMongoMapping } from './types.js';

/**
 * Parse `@mongo__*` `query` / `set` / `selection` block strings.
 * Skips `# ...` comments to EOL. Supports nested `{ ... }` blocks and `$args` / `$this` / `$pseudo`.
 */
export function parseMongoMapping(source: string | null | undefined): ParsedMongoMapping {
  if (source == null || !String(source).trim()) {
    return { entries: [] };
  }
  const text = stripComments(String(source));
  const { entries, next } = parseBlock(text, 0, false);
  if (next < text.length && text.slice(next).trim()) {
    throw new Error(`Unexpected trailing content in Mongo mapping: ${text.slice(next, next + 40)}`);
  }
  return { entries };
}

export function resolveMappingValue(
  value: MongoMappingValue | undefined,
  ctx: { args?: Record<string, unknown>; parent?: unknown; literals?: Record<string, unknown> },
): unknown {
  if (!value) return undefined;
  switch (value.kind) {
    case 'literal':
      return value.value;
    case 'column':
      return value.value;
    case 'pseudo':
      return ctx.literals?.[value.value];
    case 'args': {
      return getPath(ctx.args, value.path || [value.value]);
    }
    case 'this': {
      return getPath(
        ctx.parent as Record<string, unknown> | undefined,
        value.path || [value.value],
      );
    }
    default:
      return undefined;
  }
}

export function columnMapFromSelection(parsed: ParsedMongoMapping): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of parsed.entries) {
    if (entry.children || entry.spread) continue;
    if (entry.value?.kind === 'column') {
      map.set(entry.key, entry.value.value);
    }
  }
  return map;
}

/** Build a Mongo projection `{ path: 1 }` from selection column mappings. */
export function projectionFromSelection(parsed: ParsedMongoMapping): Record<string, 0 | 1> {
  const projection: Record<string, 0 | 1> = {};
  collectProjection(parsed.entries, projection);
  return projection;
}

function collectProjection(entries: MongoMappingEntry[], out: Record<string, 0 | 1>) {
  for (const entry of entries) {
    if (entry.spread) continue;
    if (entry.children) {
      collectProjection(entry.children, out);
      continue;
    }
    if (entry.value?.kind === 'column') {
      out[entry.value.value] = 1;
    }
  }
  collapseOverlappingProjectionPaths(out);
}

/** Prefer parent path `address` over `address.street` — Mongo rejects both. */
function collapseOverlappingProjectionPaths(out: Record<string, 0 | 1>): void {
  const keys = Object.keys(out);
  for (const key of keys) {
    const dominated = keys.some(parent => parent !== key && key.startsWith(`${parent}.`));
    if (dominated) delete out[key];
  }
}

/**
 * Map a Mongo document to GraphQL fields via selection.
 * Nested blocks become nested objects; lists of subdocs pass through for now.
 */
export function mapDocumentToGraphql(
  doc: Record<string, unknown> | null | undefined,
  selection: ParsedMongoMapping,
): Record<string, unknown> | null {
  if (doc == null) return null;
  const out: Record<string, unknown> = {};
  for (const entry of selection.entries) {
    if (entry.spread) continue;
    if (entry.key === '$' || entry.value?.kind === 'pseudo') continue;
    if (entry.children) {
      out[entry.key] = mapDocumentToGraphql(doc, { entries: entry.children });
      continue;
    }
    if (entry.value?.kind === 'column') {
      out[entry.key] = coerceGraphqlValue(getPath(doc, entry.value.value.split('.')));
    }
  }
  return out;
}

function isScalarLeafObject(value: object): boolean {
  if (value instanceof Date) return true;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return true;
  if (typeof Uint8Array !== 'undefined' && value instanceof Uint8Array) return true;
  // Plain docs may store a `_bsontype` field — only trust BSON prototypes.
  const proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype || proto === null) {
    return false;
  }
  const bsontype = (value as { _bsontype?: string })._bsontype;
  if (typeof bsontype === 'string' && bsontype.length > 0) return true;
  const ctor = (value as { constructor?: { name?: string } }).constructor?.name;
  return (
    ctor === 'Decimal128' ||
    ctor === 'Long' ||
    ctor === 'Timestamp' ||
    ctor === 'MinKey' ||
    ctor === 'MaxKey'
  );
}

/** graphql-scalars ObjectID serialize expects a 24-char hex string, not a driver ObjectId. */
function coerceGraphqlValue(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map(coerceGraphqlValue);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  // ObjectId leaves (not document wrappers): hex-stringify.
  if (
    typeof (value as { toHexString?: () => string }).toHexString === 'function' &&
    !Object.prototype.hasOwnProperty.call(value, '_id')
  ) {
    const dataKeys = Object.keys(value).filter(
      k => typeof (value as Record<string, unknown>)[k] !== 'function',
    );
    const looksLikeObjectId =
      dataKeys.length === 0 ||
      dataKeys.every(k => ['id', 'buffer', '_bsontype', 'generationTime'].includes(k));
    if (looksLikeObjectId) {
      try {
        return (value as { toHexString: () => string }).toHexString();
      } catch {
        return value;
      }
    }
  }
  // Preserve Date / BSON scalars — Object.entries(Date) yields `{}`.
  if (isScalarLeafObject(value)) {
    return value;
  }
  // Documents: recurse fields. Keep embedded `_id` and alias `id` when absent so
  // recursive root-typed nodes resolve `id` without stripping Address._id.
  const doc = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    out[k] = coerceGraphqlValue(v);
  }
  if (
    Object.prototype.hasOwnProperty.call(doc, '_id') &&
    !Object.prototype.hasOwnProperty.call(doc, 'id')
  ) {
    out.id = out._id;
  }
  return out;
}

function stripComments(source: string): string {
  return source
    .split('\n')
    .map(line => {
      let inQuote: '"' | "'" | null = null;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQuote) {
          if (c === '\\') {
            i++;
            continue;
          }
          if (c === inQuote) inQuote = null;
          continue;
        }
        if (c === '"' || c === "'") {
          inQuote = c;
          continue;
        }
        if (c === '#') {
          return line.slice(0, i);
        }
      }
      return line;
    })
    .join('\n');
}

function parseBlock(
  text: string,
  start: number,
  expectClosing: boolean,
): { entries: MongoMappingEntry[]; next: number } {
  const entries: MongoMappingEntry[] = [];
  let i = skipWs(text, start);
  while (i < text.length) {
    if (text[i] === '}') {
      if (!expectClosing) {
        throw new Error(`Unexpected "}" in Mongo mapping at ${i}`);
      }
      return { entries, next: i + 1 };
    }

    if (text.startsWith('...', i)) {
      const afterDots = skipWs(text, i + 3);
      if (afterDots >= text.length || text[afterDots] !== '$') {
        throw new Error(`Expected "$" after "..." in Mongo mapping at ${i}`);
      }
      const rhs = readPseudoOrPath(text, afterDots);
      if (rhs.value.kind !== 'args' && rhs.value.kind !== 'this') {
        throw new Error(`Spread target must be $args / $this path, got ${rhs.raw}`);
      }
      entries.push({
        key: `...${rhs.raw}`,
        value: rhs.value,
        spread: true,
      });
      i = skipWs(text, rhs.next);
      continue;
    }

    if (text[i] === '$') {
      // Bare `$` (aggregate root) — no stage name.
      if (i + 1 >= text.length || !isIdentStart(text[i + 1]!)) {
        const pseudo = readPseudoOrPath(text, i);
        entries.push({
          key: pseudo.raw,
          value: pseudo.value,
        });
        i = skipWs(text, pseudo.next);
        continue;
      }
      const stageKey = readDottedPath(text, i + 1);
      const rawKey = `$${stageKey.value}`;
      let j = skipWs(text, stageKey.next);
      if (j < text.length && text[j] === ':') {
        j = skipWs(text, j + 1);
        if (j < text.length && text[j] === '{') {
          const nested = parseBlock(text, j + 1, true);
          entries.push({ key: rawKey, children: nested.entries });
          i = skipWs(text, nested.next);
          continue;
        }
        if (j < text.length && text[j] === '$') {
          const rhs = readPseudoOrPath(text, j);
          entries.push({ key: rawKey, value: rhs.value });
          i = skipWs(text, rhs.next);
          continue;
        }
        if (j < text.length && (text[j] === '"' || text[j] === "'")) {
          const lit = readQuoted(text, j);
          entries.push({ key: rawKey, value: { kind: 'literal', value: lit.value } });
          i = skipWs(text, lit.next);
          continue;
        }
        const col = readPathIdent(text, j);
        entries.push({ key: rawKey, value: { kind: 'column', value: col.value } });
        i = skipWs(text, col.next);
        continue;
      }
      // Bare `$` / `$args.x` / `$this.x` / `$pseudo` whole-value binder.
      const pseudo = readPseudoOrPath(text, i);
      entries.push({
        key: pseudo.raw,
        value: pseudo.value,
      });
      i = skipWs(text, pseudo.next);
      continue;
    }

    const key = readIdent(text, i);
    i = skipWs(text, key.next);
    if (i < text.length && text[i] === '{') {
      const nested = parseBlock(text, i + 1, true);
      entries.push({ key: key.value, children: nested.entries });
      i = skipWs(text, nested.next);
      continue;
    }
    if (i >= text.length || text[i] !== ':') {
      entries.push({
        key: key.value,
        value: { kind: 'column', value: key.value },
      });
      continue;
    }
    i = skipWs(text, i + 1);
    if (i < text.length && text[i] === '{') {
      const nested = parseBlock(text, i + 1, true);
      entries.push({ key: key.value, children: nested.entries });
      i = skipWs(text, nested.next);
      continue;
    }
    if (i < text.length && text[i] === '$') {
      const rhs = readPseudoOrPath(text, i);
      let j = skipWs(text, rhs.next);
      // Connectors-style `record: $record { id: _id }` — pseudo source + nested picks.
      if (j < text.length && text[j] === '{') {
        const nested = parseBlock(text, j + 1, true);
        entries.push({ key: key.value, value: rhs.value, children: nested.entries });
        i = skipWs(text, nested.next);
        continue;
      }
      entries.push({ key: key.value, value: rhs.value });
      i = j;
      continue;
    }
    if (i < text.length && (text[i] === '"' || text[i] === "'")) {
      const lit = readQuoted(text, i);
      entries.push({
        key: key.value,
        value: { kind: 'literal', value: lit.value },
      });
      i = skipWs(text, lit.next);
      continue;
    }
    const col = readPathIdent(text, i);
    entries.push({
      key: key.value,
      value: { kind: 'column', value: col.value },
    });
    i = skipWs(text, col.next);
  }
  if (expectClosing) {
    throw new Error('Unclosed "{" in Mongo mapping');
  }
  return { entries, next: i };
}

function readPseudoOrPath(
  text: string,
  start: number,
): { raw: string; value: MongoMappingValue; next: number } {
  if (text[start] !== '$') {
    throw new Error(`Expected "$" at ${start}`);
  }
  // bare `$`
  if (start + 1 >= text.length || !isIdentStart(text[start + 1] ?? '')) {
    return {
      raw: '$',
      value: { kind: 'pseudo', value: '$' },
      next: start + 1,
    };
  }
  const path = readDottedPath(text, start + 1);
  const raw = `$${path.value}`;
  const segments = path.value.split('.');
  const head = segments[0];
  if (head === 'args') {
    return {
      raw,
      value: {
        kind: 'args',
        value: segments.slice(1).join('.') || 'args',
        path: segments.slice(1),
      },
      next: path.next,
    };
  }
  if (head === 'this') {
    return {
      raw,
      value: {
        kind: 'this',
        value: segments.slice(1).join('.') || 'this',
        path: segments.slice(1),
      },
      next: path.next,
    };
  }
  return {
    raw,
    value: { kind: 'pseudo', value: path.value },
    next: path.next,
  };
}

function readIdent(text: string, start: number): { value: string; next: number } {
  if (!isIdentStart(text[start] ?? '')) {
    throw new Error(`Expected identifier at ${start}`);
  }
  let i = start + 1;
  while (i < text.length && isIdentPart(text[i]!)) i++;
  return { value: text.slice(start, i), next: i };
}

/** Ident or dotted mongo path (`address.street`). */
function readPathIdent(text: string, start: number): { value: string; next: number } {
  return readDottedPath(text, start);
}

function readDottedPath(text: string, start: number): { value: string; next: number } {
  const first = readIdent(text, start);
  let value = first.value;
  let i = first.next;
  while (i < text.length && text[i] === '.') {
    i++;
    const next = readIdent(text, i);
    value += `.${next.value}`;
    i = next.next;
  }
  return { value, next: i };
}

function readQuoted(text: string, start: number): { value: string; next: number } {
  const quote = text[start];
  let i = start + 1;
  let out = '';
  while (i < text.length) {
    const c = text[i]!;
    if (c === '\\') {
      out += text[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (c === quote) {
      return { value: out, next: i + 1 };
    }
    out += c;
    i++;
  }
  throw new Error('Unclosed string in Mongo mapping');
}

function skipWs(text: string, start: number): number {
  let i = start;
  while (i < text.length && /\s/.test(text[i]!)) i++;
  return i;
}

function isIdentStart(c: string): boolean {
  const code = c.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95; /* _ */
}

function isIdentPart(c: string): boolean {
  const code = c.charCodeAt(0);
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    (code >= 48 && code <= 57) ||
    code === 95
  );
}

function getPath(obj: Record<string, unknown> | undefined, path: string[]): unknown {
  let cur: unknown = obj;
  for (const seg of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}
