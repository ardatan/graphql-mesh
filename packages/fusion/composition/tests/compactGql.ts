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
  return (
    out
      // GQL17 multiline input objects omit commas; restore them for stable asserts.
      .replace(/((?:"(?:\\.|[^"\\])*"|true|false|null|\d+|\]))\s+(?=[A-Za-z_@])/g, '$1,')
      .trim()
  );
}
