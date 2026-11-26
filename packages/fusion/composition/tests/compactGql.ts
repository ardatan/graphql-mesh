/**
 * Collapse insignificant GraphQL print whitespace (GQL17 spaces inside `{}`).
 * Compact only outside string literals so values like `https: //host` stay intact.
 */
export function compactGql(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '"') {
      let j = i + 1;
      while (j < s.length) {
        if (s[j] === '\\') {
          j += 2;
          continue;
        }
        if (s[j] === '"') {
          j += 1;
          break;
        }
        j += 1;
      }
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
  // Walk again so we never rewrite inside quoted strings (`"retry 2 times"`).
  let restored = '';
  i = 0;
  while (i < out.length) {
    if (out[i] === '"') {
      let j = i + 1;
      while (j < out.length) {
        if (out[j] === '\\') {
          j += 2;
          continue;
        }
        if (out[j] === '"') {
          j += 1;
          break;
        }
        j += 1;
      }
      restored += out.slice(i, j);
      i = j;
      // After a closing quote, GQL17 may omit the comma before the next field/key.
      // Must run here (not via a global /"\s+/ replace) so leading spaces and
      // escaped quotes inside the literal stay intact.
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
