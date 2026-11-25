/**
 * Canonicalize printed GraphQL SDL for version-stable Jest snapshots.
 *
 * graphql-js 16 vs 17 (and printSchemaWithDirectives) disagree on cosmetics:
 * spaces inside `{ }`, newlines vs commas between input-object fields, and
 * indentation inside `@connect` block-string args. GraphQL treats commas as
 * optional punctuation outside strings — strip those and collapse
 * insignificant whitespace. Inside block strings, only whitespace is
 * collapsed (commas stay — JSON / selection payloads may need them).
 *
 * Hot path: openapi `schemas.test.ts` prints multi-MB SDLs. Use charCodeAt +
 * chunk pushes (not per-char `+=`) so serialization stays under CI budgets.
 *
 * @param {string} sdl
 * @returns {string}
 */
function normalizePrintedSchema(sdl) {
  if (typeof sdl !== 'string' || sdl.length === 0) {
    return sdl;
  }

  const n = sdl.length;
  /** @type {string[]} */
  const parts = [];
  let i = 0;

  const isWs = c => c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12;

  const collapseWs = (text, stripCommas) => {
    const m = text.length;
    /** @type {string[]} */
    const local = [];
    let k = 0;
    let last = '';
    while (k < m) {
      const code = text.charCodeAt(k);
      if (isWs(code)) {
        let j = k + 1;
        while (j < m && isWs(text.charCodeAt(j))) j += 1;
        const next = j < m ? text[j] : '';
        const skipAround =
          !last ||
          !next ||
          last === '{' ||
          last === '(' ||
          last === '[' ||
          last === '@' ||
          next === '}' ||
          next === ')' ||
          next === ']' ||
          (stripCommas && next === ',') ||
          last === ':' ||
          next === ':' ||
          (stripCommas && (last === ',' || next === ','));
        if (!skipAround) {
          local.push(' ');
          last = ' ';
        }
        k = j;
        continue;
      }
      if (stripCommas && text[k] === ',') {
        k += 1;
        continue;
      }
      local.push(text[k]);
      last = text[k];
      k += 1;
    }
    return local.join('');
  };

  let lastOut = '';

  while (i < n) {
    // Block string """..."""
    if (sdl.charCodeAt(i) === 34 && sdl.charCodeAt(i + 1) === 34 && sdl.charCodeAt(i + 2) === 34) {
      let j = i + 3;
      while (j + 2 < n) {
        if (
          sdl.charCodeAt(j) === 34 &&
          sdl.charCodeAt(j + 1) === 34 &&
          sdl.charCodeAt(j + 2) === 34
        ) {
          break;
        }
        j += 1;
      }
      const inner = collapseWs(sdl.slice(i + 3, j), false).trim();
      const end = Math.min(j + 3, n);
      if (inner.length > 0) {
        const chunk = '"""' + inner + '"""';
        parts.push(chunk);
        lastOut = '"';
      }
      i = end;
      continue;
    }

    // Regular string "..."
    if (sdl.charCodeAt(i) === 34) {
      let j = i + 1;
      while (j < n) {
        const c = sdl.charCodeAt(j);
        if (c === 92 && j + 1 < n) {
          j += 2;
          continue;
        }
        if (c === 34) {
          j += 1;
          break;
        }
        j += 1;
      }
      parts.push(sdl.slice(i, j));
      lastOut = '"';
      i = j;
      continue;
    }

    const code = sdl.charCodeAt(i);
    if (isWs(code)) {
      let j = i + 1;
      while (j < n && isWs(sdl.charCodeAt(j))) j += 1;
      const next = j < n ? sdl[j] : '';
      const skipAround =
        !lastOut ||
        !next ||
        lastOut === ' ' ||
        lastOut === '{' ||
        lastOut === '(' ||
        lastOut === '[' ||
        lastOut === '@' ||
        next === '}' ||
        next === ')' ||
        next === ']' ||
        next === ',' ||
        lastOut === ':' ||
        next === ':' ||
        lastOut === ',' ||
        next === ',';
      if (!skipAround) {
        parts.push(' ');
        lastOut = ' ';
      }
      i = j;
      continue;
    }

    if (sdl[i] === ',') {
      i += 1;
      continue;
    }

    // Push a run of non-special chars for throughput.
    let j = i + 1;
    while (j < n) {
      const c = sdl.charCodeAt(j);
      if (c === 34 || c === 44 || isWs(c)) break;
      j += 1;
    }
    const run = sdl.slice(i, j);
    parts.push(run);
    lastOut = run[run.length - 1];
    i = j;
  }

  let pretty = parts.join('').trim();
  pretty = pretty.replace(
    /\}(?=(?:schema|type|interface|union|enum|input|scalar|extend|directive)\b)/g,
    '}\n',
  );
  pretty = pretty.replace(
    / (?=(?:type|interface|union|enum|input|scalar|extend|directive)\b)/g,
    '\n',
  );
  return pretty + '\n';
}

function looksLikePrintedSchema(val) {
  if (typeof val !== 'string') return false;
  return /^\s*"?(?:schema|type|interface|union|enum|input|scalar|extend|directive)\b/m.test(val);
}

module.exports = {
  normalizePrintedSchema,
  looksLikePrintedSchema,
};
