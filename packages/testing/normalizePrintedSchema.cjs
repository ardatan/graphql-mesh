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
 * @param {string} sdl
 * @returns {string}
 */
function normalizePrintedSchema(sdl) {
  if (typeof sdl !== 'string' || sdl.length === 0) {
    return sdl;
  }

  let out = '';
  let i = 0;
  const n = sdl.length;

  const collapseWs = (text, { stripCommas }) => {
    let local = '';
    let k = 0;
    const m = text.length;
    while (k < m) {
      if (/\s/.test(text[k])) {
        let j = k + 1;
        while (j < m && /\s/.test(text[j])) j += 1;
        const prev = local.length ? local[local.length - 1] : '';
        const next = j < m ? text[j] : '';
        // Keep a space before `@directive` (next==='@'); drop space after `@`.
        // Inside block strings (stripCommas=false) keep spaces around commas —
        // description prose like `letters, numerals` must stay readable/stable.
        const skipAround =
          !prev ||
          !next ||
          '{([@'.includes(prev) ||
          (stripCommas ? '})],'.includes(next) : '})]'.includes(next)) ||
          prev === ':' ||
          next === ':' ||
          (stripCommas && (prev === ',' || next === ','));
        if (!skipAround) local += ' ';
        k = j;
        continue;
      }
      if (stripCommas && text[k] === ',') {
        k += 1;
        continue;
      }
      local += text[k];
      k += 1;
    }
    return local;
  };

  while (i < n) {
    // Block string """...""" — normalize interior whitespace only.
    // graphql-js 17 prints empty descriptions as """"""; v16 omits them.
    if (sdl.startsWith('"""', i)) {
      let j = i + 3;
      while (j + 2 < n && !sdl.startsWith('"""', j)) {
        j += 1;
      }
      const inner = collapseWs(sdl.slice(i + 3, j), { stripCommas: false }).trim();
      const end = Math.min(j + 3, n);
      if (inner.length > 0) {
        out += '"""' + inner + '"""';
      }
      i = end;
      continue;
    }

    // Regular string "..." — keep verbatim (URLs, enum wire names, etc.).
    if (sdl[i] === '"') {
      let j = i + 1;
      while (j < n) {
        if (sdl[j] === '\\' && j + 1 < n) {
          j += 2;
          continue;
        }
        if (sdl[j] === '"') {
          j += 1;
          break;
        }
        j += 1;
      }
      out += sdl.slice(i, j);
      i = j;
      continue;
    }

    if (/\s/.test(sdl[i])) {
      let j = i + 1;
      while (j < n && /\s/.test(sdl[j])) j += 1;
      const prev = out.length ? out[out.length - 1] : '';
      const next = j < n ? sdl[j] : '';
      // Keep a space before `@directive` (next==='@'); drop space after `@`.
      const skipAround =
        !prev ||
        !next ||
        '{([@'.includes(prev) ||
        '})],'.includes(next) ||
        prev === ':' ||
        next === ':' ||
        prev === ',' ||
        next === ',';
      if (!skipAround) out += ' ';
      i = j;
      continue;
    }

    if (sdl[i] === ',') {
      i += 1;
      continue;
    }

    out += sdl[i];
    i += 1;
  }

  // Re-insert readable newlines before top-level definitions so inline
  // snapshots stay reviewable while remaining version-stable.
  let pretty = out.trim();
  // Dropping empty `""""""` descriptions can leave doubled spaces.
  pretty = pretty.replace(/ {2,}/g, ' ');
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
