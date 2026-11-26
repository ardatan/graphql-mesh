export const KEY_DELIMITER = '__dot__';
export const EXPANSION_PREFIX = '__exp';

/** Must not contain KEY_DELIMITER as a substring. */
const ESCAPED_DELIMITER = '__DOTESC__';

/** Escape so a literal key containing KEY_DELIMITER stays distinct from a dotted path. */
export function encodeKeyPathSegments(segments: string[]): string {
  return segments
    .map(segment => segment.split(KEY_DELIMITER).join(ESCAPED_DELIMITER))
    .join(KEY_DELIMITER);
}

export function decodeKeyPath(encoded: string): string[] {
  return encoded
    .split(KEY_DELIMITER)
    .map(segment => segment.split(ESCAPED_DELIMITER).join(KEY_DELIMITER));
}

function isWordStart(ch: string | undefined): boolean {
  return ch != null && /[_A-Za-z]/.test(ch);
}

function isWordContinue(ch: string | undefined): boolean {
  return ch != null && /[_A-Za-z0-9.]/.test(ch);
}

/**
 * Rewrite `$key.path` tokens and extract `[[...]]` expansions while ignoring
 * content inside string literals and comments.
 */
export function preparseMergeArgsExpr(mergeArgsExpr: string): {
  mergeArgsExpr: string;
  expansionExpressions: Record<string, string>;
} {
  let rewritten = '';
  let i = 0;
  const length = mergeArgsExpr.length;

  while (i < length) {
    const ch = mergeArgsExpr[i]!;

    // Line comment
    if (ch === '#') {
      const start = i;
      i++;
      while (i < length && mergeArgsExpr[i] !== '\n') {
        i++;
      }
      rewritten += mergeArgsExpr.slice(start, i);
      continue;
    }

    // Block string """..."""
    if (ch === '"' && mergeArgsExpr.slice(i, i + 3) === '"""') {
      const start = i;
      i += 3;
      while (i < length) {
        if (mergeArgsExpr.slice(i, i + 3) === '"""') {
          i += 3;
          break;
        }
        i++;
      }
      rewritten += mergeArgsExpr.slice(start, i);
      continue;
    }

    // Regular string "..."
    if (ch === '"') {
      const start = i;
      i++;
      while (i < length) {
        if (mergeArgsExpr[i] === '\\') {
          i += 2;
          continue;
        }
        if (mergeArgsExpr[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      rewritten += mergeArgsExpr.slice(start, i);
      continue;
    }

    // Variable token $name.path — encode dots losslessly
    if (ch === '$' && isWordStart(mergeArgsExpr[i + 1])) {
      let j = i + 1;
      while (j < length && isWordContinue(mergeArgsExpr[j])) {
        j++;
      }
      const variable = mergeArgsExpr.slice(i, j);
      const withoutDollar = variable.slice(1);
      const segments = withoutDollar.split('.');
      rewritten += `$${encodeKeyPathSegments(segments)}`;
      i = j;
      continue;
    }

    rewritten += ch;
    i++;
  }

  const expansionExpressions = Object.create(null);
  const segments = splitExpansionBrackets(rewritten);

  if (segments.length === 1) {
    return { mergeArgsExpr: rewritten, expansionExpressions };
  }

  let finalMergeArgsExpr = segments[0]!;
  for (let seg = 1; seg < segments.length - 1; seg += 2) {
    const variableName = `${EXPANSION_PREFIX}${(seg - 1) / 2 + 1}`;
    expansionExpressions[variableName] = segments[seg]!;
    finalMergeArgsExpr += `$${variableName}${segments[seg + 1]}`;
  }

  return { mergeArgsExpr: finalMergeArgsExpr, expansionExpressions };
}

/** Split on `[[` / `]]` only outside strings and comments. */
function splitExpansionBrackets(expr: string): string[] {
  const parts: string[] = [''];
  let i = 0;
  const length = expr.length;
  let expectingClose = false;

  while (i < length) {
    const ch = expr[i]!;

    if (ch === '#') {
      const start = i;
      i++;
      while (i < length && expr[i] !== '\n') {
        i++;
      }
      parts[parts.length - 1] += expr.slice(start, i);
      continue;
    }

    if (ch === '"' && expr.slice(i, i + 3) === '"""') {
      const start = i;
      i += 3;
      while (i < length) {
        if (expr.slice(i, i + 3) === '"""') {
          i += 3;
          break;
        }
        i++;
      }
      parts[parts.length - 1] += expr.slice(start, i);
      continue;
    }

    if (ch === '"') {
      const start = i;
      i++;
      while (i < length) {
        if (expr[i] === '\\') {
          i += 2;
          continue;
        }
        if (expr[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      parts[parts.length - 1] += expr.slice(start, i);
      continue;
    }

    if (!expectingClose && ch === '[' && expr[i + 1] === '[') {
      parts.push('');
      expectingClose = true;
      i += 2;
      continue;
    }

    if (expectingClose && ch === ']' && expr[i + 1] === ']') {
      parts.push('');
      expectingClose = false;
      i += 2;
      continue;
    }

    parts[parts.length - 1] += ch;
    i++;
  }

  if (expectingClose || parts.length % 2 === 0) {
    throw new Error(`Each opening "[[" must be matched by a closing "]]" without nesting.`);
  }

  return parts;
}
