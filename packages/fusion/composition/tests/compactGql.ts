/**
 * Scan a GraphQL string or block-string starting at `start` (must be `"`).
 * Returns the index just past the closing delimiter.
 */
function scanStringLiteral(s: string, start: number): number {
  if (s.startsWith('"""', start)) {
    let j = start + 3;
    while (j < s.length) {
      // Block strings only escape the delimiter as \"""
      if (s.startsWith('\\"""', j)) {
        j += 4;
        continue;
      }
      if (s.startsWith('"""', j)) {
        return j + 3;
      }
      j += 1;
    }
    return s.length;
  }
  let j = start + 1;
  while (j < s.length) {
    if (s[j] === '\\') {
      j += 2;
      continue;
    }
    if (s[j] === '"') {
      return j + 1;
    }
    j += 1;
  }
  return s.length;
}

/**
 * Collapse insignificant GraphQL print whitespace (GQL17 spaces inside `{}`).
 * Compact only outside string literals so values like `https: //host` stay intact.
 */
export function compactGql(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '"') {
      const j = scanStringLiteral(s, i);
      out += s.slice(i, j);
      i = j;
      continue;
    }
    let j = i;
    while (j < s.length && s[j] !== '"') j += 1;
    out += s
      .slice(i, j)
      .replace(/\s*([{}\[\](),:])\s*/g, '$1')
      .replace(/\s+/g, ' ');
    i = j;
  }
  // GQL17 multiline input objects omit commas; restore them for stable asserts.
  // Walk again so we never rewrite inside quoted strings (`"retry 2 times"`)
  // or block strings (`"""a" b "c"""`).
  let restored = '';
  i = 0;
  while (i < out.length) {
    if (out[i] === '"') {
      const j = scanStringLiteral(out, i);
      restored += out.slice(i, j);
      i = j;
      // After a closing quote / block-string, GQL17 may omit the comma before
      // the next field/key. Must run here (not via a global /"\s+/ replace) so
      // leading spaces, escaped quotes, and embedded quotes in block strings
      // stay intact.
      if (i < out.length) {
        const gap = out.slice(i).match(/^(\s+)(?=[A-Za-z_@])/);
        if (gap) {
          restored += ',';
          i += gap[1].length;
        }
      }
      continue;
    }
    let j = i;
    while (j < out.length && out[j] !== '"') j += 1;
    restored += out.slice(i, j).replace(/((?:true|false|null|\d+|\]))\s+(?=[A-Za-z_@])/g, '$1,');
    i = j;
  }
  return restored.trim();
}
