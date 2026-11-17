import type { ParsedSqlMapping, SqlMappingEntry, SqlMappingValue } from './types.js';

/**
 * Parse `@sql__*` `args` / `selection` block strings.
 * Skips `# ...` comments to EOL. Supports nested `{ ... }` blocks and `$args` / `$this` / `$pseudo`.
 */
export function parseSqlMapping(source: string | null | undefined): ParsedSqlMapping {
  if (source == null || !String(source).trim()) {
    return { entries: [] };
  }
  const text = stripComments(String(source));
  const { entries, next } = parseBlock(text, 0, false);
  if (next < text.length && text.slice(next).trim()) {
    throw new Error(`Unexpected trailing content in SQL mapping: ${text.slice(next, next + 40)}`);
  }
  return { entries };
}

function stripComments(source: string): string {
  return source
    .split('\n')
    .map(line => {
      const idx = line.indexOf('#');
      if (idx === -1) return line;
      // Keep `#` inside quotes
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
): { entries: SqlMappingEntry[]; next: number } {
  const entries: SqlMappingEntry[] = [];
  let i = skipWs(text, start);
  while (i < text.length) {
    if (text[i] === '}') {
      if (!expectClosing) {
        throw new Error(`Unexpected "}" in SQL mapping at ${i}`);
      }
      return { entries, next: i + 1 };
    }
    if (expectClosing === false && text[i] === '{') {
      throw new Error(`Unexpected "{" in SQL mapping at ${i}`);
    }

    // Bare pseudo `$` (COUNT selection) or `$token`
    if (text[i] === '$' && !isIdentStart(text[i + 1] ?? '')) {
      // look ahead for ident after $
    }
    if (text[i] === '$') {
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
      // bare field pick (rare) — treat as identity column
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
      entries.push({ key: key.value, value: rhs.value });
      i = skipWs(text, rhs.next);
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
    const col = readIdent(text, i);
    entries.push({
      key: key.value,
      value: { kind: 'column', value: col.value },
    });
    i = skipWs(text, col.next);
  }
  if (expectClosing) {
    throw new Error('Unclosed "{" in SQL mapping');
  }
  return { entries, next: i };
}

function readPseudoOrPath(
  text: string,
  start: number,
): { raw: string; value: SqlMappingValue; next: number } {
  if (text[start] !== '$') {
    throw new Error(`Expected "$" at ${start}`);
  }
  // `$` alone
  if (start + 1 >= text.length || !isIdentStart(text[start + 1])) {
    return {
      raw: '$',
      value: { kind: 'pseudo', value: '$' },
      next: start + 1,
    };
  }
  let i = start + 1;
  const head = readIdent(text, i);
  i = head.next;
  if (head.value === 'args' || head.value === 'this') {
    const path: string[] = [];
    while (i < text.length && text[i] === '.') {
      i++;
      const seg = readIdent(text, i);
      path.push(seg.value);
      i = seg.next;
    }
    return {
      raw: `$${head.value}${path.length ? '.' + path.join('.') : ''}`,
      value: {
        kind: head.value === 'args' ? 'args' : 'this',
        value: path[0] ?? '',
        path,
      },
      next: i,
    };
  }
  // $cursor, $totalCount, ...
  return {
    raw: `$${head.value}`,
    value: { kind: 'pseudo', value: head.value },
    next: i,
  };
}

function readIdent(text: string, start: number): { value: string; next: number } {
  let i = skipWs(text, start);
  if (i >= text.length || !isIdentStart(text[i])) {
    throw new Error(`Expected identifier at ${i} near "${text.slice(i, i + 20)}"`);
  }
  const from = i;
  i++;
  while (i < text.length && isIdentCont(text[i])) i++;
  return { value: text.slice(from, i), next: i };
}

function readQuoted(text: string, start: number): { value: string; next: number } {
  const q = text[start];
  let i = start + 1;
  let out = '';
  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && i + 1 < text.length) {
      out += text[i + 1];
      i += 2;
      continue;
    }
    if (c === q) {
      return { value: out, next: i + 1 };
    }
    out += c;
    i++;
  }
  throw new Error('Unclosed string in SQL mapping');
}

function skipWs(text: string, start: number): number {
  let i = start;
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
}

function isIdentStart(c: string): boolean {
  return /[A-Za-z_]/.test(c);
}

function isIdentCont(c: string): boolean {
  return /[A-Za-z0-9_]/.test(c);
}

/** Flatten selection entries that map GraphQL field -> SQL column (ignore nested/pseudo). */
export function columnMapFromSelection(selection: ParsedSqlMapping): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (entries: SqlMappingEntry[]) => {
    for (const entry of entries) {
      if (entry.children) {
        walk(entry.children);
        continue;
      }
      if (entry.value?.kind === 'column') {
        map.set(entry.key, entry.value.value);
      }
    }
  };
  walk(selection.entries);
  return map;
}

/** Resolve `$args.path` / `$this.path` / literal against runtime. */
export function resolveMappingValue(
  value: SqlMappingValue | undefined,
  ctx: { args?: Record<string, any>; parent?: Record<string, any> },
): unknown {
  if (!value) return undefined;
  switch (value.kind) {
    case 'literal':
      return value.value;
    case 'args': {
      let cur: any = ctx.args;
      for (const seg of value.path || []) {
        if (cur == null) return undefined;
        cur = cur[seg];
      }
      return cur;
    }
    case 'this': {
      let cur: any = ctx.parent;
      for (const seg of value.path || []) {
        if (cur == null) return undefined;
        cur = cur[seg];
      }
      return cur;
    }
    case 'column':
      return value.value;
    case 'pseudo':
      return undefined;
    default:
      return undefined;
  }
}
