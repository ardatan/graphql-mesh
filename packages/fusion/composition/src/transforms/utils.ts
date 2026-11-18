import {
  getNamedType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  type GraphQLNamedType,
} from 'graphql';

export class TransformValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransformValidationError';
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Apply `fn` only to spans outside `'…'` / `"…"` (respects `\\` escapes). */
function rewriteOutsideQuotes(value: string, fn: (segment: string) => string): string {
  let out = '';
  let i = 0;
  let segmentStart = 0;
  while (i < value.length) {
    const c = value[i];
    if (c === '"' || c === "'") {
      out += fn(value.slice(segmentStart, i));
      const q = c;
      out += c;
      i++;
      while (i < value.length && value[i] !== q) {
        if (value[i] === '\\') {
          out += value[i++];
          if (i < value.length) out += value[i++];
          continue;
        }
        out += value[i++];
      }
      if (i < value.length) out += value[i++];
      segmentStart = i;
      continue;
    }
    i++;
  }
  out += fn(value.slice(segmentStart));
  return out;
}

/**
 * Remove top-level field picks / aliases from a Connectors `selection` string.
 * Used after filter/prune marks fields inaccessible so upstream JSON isn't over-fetched.
 */
export function stripFieldsFromConnectSelection(
  selection: string,
  removedFields: Set<string>,
): string {
  if (!selection || !removedFields.size) {
    return selection;
  }
  let out = selection;
  for (const name of removedFields) {
    const esc = escapeRegExp(name);
    // `name: <expr>` (no nested `{…}` on this line)
    out = out.replace(new RegExp(`(^|[\\n\\s])${esc}\\s*:[^\\n{]+`, 'g'), '$1');
    // `name { … }` one nesting level
    out = out.replace(new RegExp(`(^|[\\n\\s])${esc}\\s*\\{[^}]*\\}`, 'g'), '$1');
    // bare `name`
    out = out.replace(new RegExp(`(^|[\\n\\s])${esc}(?=[\\s\\n]|$)`, 'g'), '$1');
  }
  return out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * After hoist `path → newFieldName`, append a Connectors selection alias
 * (`newFieldName: a.b.c`) so the hoisted GraphQL field resolves from the
 * selected JSON without relying on Mesh `@hoist` at runtime.
 */
export function applyHoistAliasToConnectSelection(
  selection: string,
  pathFieldNames: string[],
  newFieldName: string,
): string {
  if (!selection || pathFieldNames.length === 0) {
    return selection;
  }
  const pathExpr = pathFieldNames.join('.');
  const aliasLine = `${newFieldName}: ${pathExpr}`;
  if (
    selection.includes(aliasLine) ||
    new RegExp(`(^|[\\n\\s])${escapeRegExp(newFieldName)}\\s*:`).test(selection)
  ) {
    return selection;
  }
  return `${selection.trim()}\n${aliasLine}`;
}

/**
 * After renaming a GraphQL output field, resolve from the new key first and
 * fall back to the original key so Connectors selections that still emit the
 * pre-rename JSON path keep working. Input fields are left untouched.
 */
export function withOriginalKeyFallback<T extends Record<string, any>>(
  nextField: T,
  fieldName: string,
  newFieldName: string,
): T {
  if (newFieldName === fieldName) {
    return nextField;
  }
  // Input fields cannot carry resolvers — rename the key only.
  if (!('args' in nextField) && !('resolve' in nextField)) {
    return nextField;
  }
  const originalResolve = nextField.resolve;
  return {
    ...nextField,
    resolve(source: any, args: any, context: any, info: any) {
      if (originalResolve) {
        return originalResolve(source, args, context, info);
      }
      if (source == null) {
        return null;
      }
      if (Object.prototype.hasOwnProperty.call(source, newFieldName)) {
        return source[newFieldName];
      }
      return source[fieldName];
    },
  };
}

export interface RewriteProtobufMappingBindsOptions {
  /**
   * When set, `$args` / top-level path heads use `renameMap` (arg renames), while
   * nested segments and binds inside `{ … }` use `nestedRenameMap` (field renames).
   * Selection rewrites omit this and apply `renameMap` to every segment.
   */
  nestedRenameMap?: Map<string, string>;
}

/**
 * Rewrite GraphQL bind path segments in a `@protobuf__rpc` args/selection mapping.
 * Handles `$args.x` / `$this.x` and bare paths after `):` (e.g. `2(int64): year`,
 * `1(message): input.movie {`).
 *
 * Each original segment is looked up once (no `a→b` then `b→c` chaining). Paths
 * already rewritten via `$args`/`$this` are not rewritten again by the bare-path pass.
 * Compact mappings ending before `}` are supported.
 */
export function rewriteProtobufMappingBinds(
  mapping: string,
  renameMap: Map<string, string>,
  options?: RewriteProtobufMappingBindsOptions,
): string {
  if (!mapping || (!renameMap.size && !options?.nestedRenameMap?.size)) {
    return mapping;
  }
  const rootLookup = toLookup(renameMap);
  const nestedLookup = options?.nestedRenameMap ? toLookup(options.nestedRenameMap) : rootLookup;
  const splitRootNested = Boolean(options?.nestedRenameMap);

  let out = mapping;
  // `$args.<name>` always uses rootLookup (arg renames in args mode; field renames
  // when rewriting selection without a nested map).
  if (rootLookup.size) {
    const names = [...rootLookup.keys()].map(escapeRegExp).join('|');
    // Single lookup from the original name — JS replace does not rescan replacements,
    // but we still must not let the bare-path pass remap `$args.b` after `$args.a→b`.
    out = out.replace(
      new RegExp(`\\$args\\.(${names})(?![\\w])`, 'g'),
      (_m, name: string) => `$args.${rootLookup.get(name) ?? name}`,
    );
  }
  // `$this.<name>`: parent/entity field names when a parent is supplied at runtime;
  // args fallback when it is not. In args mode (`nestedRenameMap` set), do not apply
  // the argument rename map here — the rename transform rewrites `$this` against the
  // owning type (field renames) or, for root fields, applies arg renames explicitly.
  // Selection mode (no nested map) still uses rootLookup for `$this` field renames.
  const thisLookup = splitRootNested ? nestedLookup : rootLookup;
  if (thisLookup.size) {
    const thisNames = [...thisLookup.keys()].map(escapeRegExp).join('|');
    out = out.replace(
      new RegExp(`\\$this\\.(${thisNames})(?![\\w])`, 'g'),
      (_m, name: string) => `$this.${thisLookup.get(name) ?? name}`,
    );
  }

  // Path binds after `):` — allow whitespace around `:`; delimiters match parseMapping
  // (`\s`, `}`, `{`, `#`, EOS), including compact one-liners.
  out = out.replace(
    /(\)\s*:\s*)([\w$]+(?:\.[\w$]+)*)(?=[\s{}#]|$)/g,
    (_m, pre: string, path: string, offset: number, whole: string) => {
      if (path.startsWith('$args') || path.startsWith('$this')) {
        // First segment is handled by the `$args/$this` pass above (avoid a→b→c chaining).
        // When splitRootNested, deeper segments use nestedRenameMap (input field renames),
        // e.g. `$args.input.release_year` → `$args.input.releaseYear`.
        if (!splitRootNested) {
          return `${pre}${path}`;
        }
        const scope = path.startsWith('$args') ? '$args' : '$this';
        const rest =
          path === scope
            ? []
            : path.startsWith(`${scope}.`)
              ? path.slice(scope.length + 1).split('.')
              : [];
        if (rest.length <= 1) {
          return `${pre}${path}`;
        }
        const rewritten = [scope, rest[0]];
        for (let i = 1; i < rest.length; i++) {
          rewritten.push(nestedLookup.get(rest[i]) ?? rest[i]);
        }
        return `${pre}${rewritten.join('.')}`;
      }
      const depth = braceDepthAt(whole, offset);
      const segments = path.split('.');
      const next = segments
        .map((seg, i) => {
          if (splitRootNested && depth === 0 && i === 0) {
            return rootLookup.get(seg) ?? seg;
          }
          if (splitRootNested && depth === 0 && i > 0) {
            return nestedLookup.get(seg) ?? seg;
          }
          if (splitRootNested && depth > 0) {
            return nestedLookup.get(seg) ?? seg;
          }
          return rootLookup.get(seg) ?? seg;
        })
        .join('.');
      return `${pre}${next}`;
    },
  );
  return out;
}

function toLookup(renameMap: Map<string, string>): Map<string, string> {
  const entries = [...renameMap.entries()]
    .filter(([from, to]) => from && to && from !== to)
    .sort((a, b) => b[0].length - a[0].length);
  return new Map(entries);
}

const THIS_DOT = '$this.';
const PIPE_ARGS_DOT = '|$args.';

/** `\w` or `$` — GraphQL-safe bind segment chars (same class as the old regex). */
function isProtobufBindIdentChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code === 95 || // _
    code === 36 // $
  );
}

/**
 * Read `ident(.ident)*` starting at `start`.
 * On failure, `end` is still advanced through the scanned invalid region so callers
 * stay O(n) over repeated `$this.$…` tokens (no one-char rescan).
 */
function readProtobufDottedIdentPath(source: string, start: number): { ok: boolean; end: number } {
  let i = start;
  if (i >= source.length || !isProtobufBindIdentChar(source.charCodeAt(i))) {
    return { ok: false, end: start };
  }
  while (i < source.length && isProtobufBindIdentChar(source.charCodeAt(i))) {
    i++;
  }
  while (source[i] === '.') {
    i++;
    if (i >= source.length || !isProtobufBindIdentChar(source.charCodeAt(i))) {
      return { ok: false, end: i };
    }
    while (i < source.length && isProtobufBindIdentChar(source.charCodeAt(i))) {
      i++;
    }
  }
  return { ok: true, end: i };
}

/**
 * Walk `$this.<path>` optionally followed by `|$args.<path>`, invoking `onBind` for each.
 * O(n) in `mapping.length` — no nested-quantifier regex.
 */
function mapProtobufThisDualBinds(
  mapping: string,
  onBind: (thisPath: string, argsPath: string | undefined) => string,
): string {
  let out = '';
  let i = 0;
  while (i < mapping.length) {
    const at = mapping.indexOf(THIS_DOT, i);
    if (at < 0) {
      out += mapping.slice(i);
      break;
    }
    out += mapping.slice(i, at);
    const thisPathStart = at + THIS_DOT.length;
    const thisPath = readProtobufDottedIdentPath(mapping, thisPathStart);
    if (!thisPath.ok) {
      // Skip the `$this.` prefix plus any already-scanned invalid region.
      const advanceTo = Math.max(at + 1, thisPath.end);
      out += mapping.slice(at, advanceTo);
      i = advanceTo;
      continue;
    }
    const thisPathText = mapping.slice(thisPathStart, thisPath.end);
    let argsPath: string | undefined;
    let end = thisPath.end;
    if (mapping.startsWith(PIPE_ARGS_DOT, thisPath.end)) {
      const argsPathStart = thisPath.end + PIPE_ARGS_DOT.length;
      const argsParsed = readProtobufDottedIdentPath(mapping, argsPathStart);
      if (argsParsed.ok) {
        argsPath = mapping.slice(argsPathStart, argsParsed.end);
        end = argsParsed.end;
      }
    }
    out += onBind(thisPathText, argsPath);
    i = end;
  }
  return out;
}

/**
 * Collapse dual `$this.<path>|$args.<path>` tokens to `$this.<path>` (entity conversion).
 * Linear scan — same dual-bind recognition as {@link rewriteProtobufThisBindsDual}.
 */
export function collapseProtobufDualThisArgsBinds(mapping: string): string {
  if (!mapping || !mapping.includes(THIS_DOT) || !mapping.includes(PIPE_ARGS_DOT)) {
    return mapping;
  }
  return mapProtobufThisDualBinds(mapping, thisPath => `${THIS_DOT}${thisPath}`);
}

/**
 * Rewrite `$this.<path>` so parent field renames and argument renames can diverge.
 * When the public parent path and args path differ, emit dual
 * `$this.<parentPath>|$args.<argsPath>` for runtime dual lookup.
 */
export function rewriteProtobufThisBindsDual(
  mapping: string,
  options: {
    parentRenames?: Map<string, string>;
    argRenames?: Map<string, string>;
    /** Walk nested `$this` segments against owning GraphQL types when set with `ownerType`. */
    fieldRenameMap?: Map<string, Map<string, string>>;
    ownerType?: GraphQLNamedType | null;
    /**
     * Argument name → GraphQL input/named type. When set with `fieldRenameMap`, nested
     * `$args.input.year` segments walk owning input types (e.g. MovieInput.year→publicationYear).
     */
    argTypes?: Map<string, GraphQLNamedType>;
  },
): string {
  if (!mapping) {
    return mapping;
  }
  const parentLookup = options.parentRenames?.size ? toLookup(options.parentRenames) : new Map();
  const argLookup = options.argRenames?.size ? toLookup(options.argRenames) : new Map();
  const typedWalk = Boolean(options.fieldRenameMap?.size && options.ownerType);
  const typedArgsWalk = Boolean(options.fieldRenameMap?.size && options.argTypes?.size);
  if (!parentLookup.size && !argLookup.size && !typedWalk && !typedArgsWalk) {
    return mapping;
  }
  return mapProtobufThisDualBinds(mapping, (thisPath, existingArgsPath) => {
    const thisSegs = thisPath.split('.');
    const argsBase = existingArgsPath ?? thisPath;
    const argsSegs = argsBase.split('.');
    let parentPath: string;
    if (typedWalk) {
      const rewritten: string[] = [];
      let cur: GraphQLNamedType | null | undefined = options.ownerType;
      for (const seg of thisSegs) {
        const stepped = renameFieldSegment(cur, seg, options.fieldRenameMap!);
        rewritten.push(stepped.name);
        cur = stepped.type;
      }
      parentPath = rewritten.join('.');
    } else {
      // Flat map: old→new on the first segment only (caller without type context).
      const parentFirst = parentLookup.get(thisSegs[0]) ?? thisSegs[0];
      parentPath = [parentFirst, ...thisSegs.slice(1)].join('.');
    }
    let argsPath: string;
    if (typedArgsWalk) {
      const rewritten: string[] = [];
      const argHead = argLookup.get(argsSegs[0]) ?? argsSegs[0];
      rewritten.push(argHead);
      // Prefer the public arg head — `argTypes` from applyProtobufFieldRenames is
      // built from the already-renamed field.args map.
      let cur: GraphQLNamedType | null | undefined = resolveArgType(
        options.argTypes,
        argHead,
        argsSegs[0],
        argLookup,
      );
      for (let i = 1; i < argsSegs.length; i++) {
        const stepped = renameFieldSegment(cur, argsSegs[i], options.fieldRenameMap!);
        rewritten.push(stepped.name);
        cur = stepped.type;
      }
      argsPath = rewritten.join('.');
    } else {
      const argFirst = argLookup.get(argsSegs[0]) ?? argsSegs[0];
      argsPath = [argFirst, ...argsSegs.slice(1)].join('.');
    }
    if (parentPath === argsPath) {
      return `${THIS_DOT}${parentPath}`;
    }
    return `${THIS_DOT}${parentPath}${PIPE_ARGS_DOT}${argsPath}`;
  });
}

/** Net `{` − `}` count before `index`; `#` comments are ignored through EOL (parser-compatible). */
function braceDepthAt(source: string, index: number): number {
  let depth = 0;
  for (let i = 0; i < index; i++) {
    const c = source[i];
    if (c === '#') {
      while (i < index && source[i] !== '\n') i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth = Math.max(0, depth - 1);
  }
  return depth;
}

/** True when `index` sits on a `# …` comment line (parser-compatible). */
function isInsideHashComment(source: string, index: number): boolean {
  for (let i = index - 1; i >= 0; i--) {
    const c = source[i];
    if (c === '\n') return false;
    if (c === '#') return true;
  }
  return false;
}

export interface RewriteProtobufMappingBindsTypeScopedOptions {
  /**
   * GraphQL type for relative binds at brace depth 0 (selection return type), or the
   * parent object type for field-level `args:` rewrites so `$this.<field>` nested
   * renames walk the parent field map. Arg types remain the fallback when omitted.
   */
  rootType?: GraphQLNamedType | null;
  /**
   * Request `args:` mode: depth-0 path heads are argument names (not field-renamed).
   * Values are the named GraphQL types of those arguments for descending into nested binds.
   * Also the fallback owner for `$this.<field>` when no parent `rootType` exists (root fields).
   */
  argTypes?: Map<string, GraphQLNamedType>;
  /**
   * Argument name renames (old→new). Applied to depth-0 arg heads and to nested relative
   * binds under a bare `1(message): $args { … }` block (the `$args` object owns arg names).
   */
  argRenameMap?: Map<string, string>;
  /**
   * When true, leave `$this.*` path text unchanged (dual-bind pass owns them), but still
   * record the block owner so nested relative binds rename correctly.
   */
  skipThisBinds?: boolean;
}

type NamedDefRange = {
  name: string;
  /** Index of content just inside the def's `{`. */
  bodyStart: number;
  /** Index of the closing `}` (exclusive for body content). */
  bodyEnd: number;
  /** Brace depth of binds inside the def body (usually 1). */
  bodyDepth: number;
};

/** Skip whitespace and `# …` comments (loader headers / notes between `@Name` defs). */
function skipWsAndHashComments(mapping: string, start: number): number {
  let i = start;
  while (i < mapping.length) {
    if (/\s/.test(mapping[i])) {
      i++;
      continue;
    }
    if (mapping[i] === '#') {
      while (i < mapping.length && mapping[i] !== '\n') i++;
      continue;
    }
    break;
  }
  return i;
}

/**
 * Leading `@Name { … }` ranges from loader-emitted hoisted message defs.
 * Nested `@` inside a body is ignored (defs only appear at the mapping head).
 * Skips `#` header comments before/between defs (emitRequestBody / emitResponseSelection).
 */
function parseNamedDefRanges(mapping: string): NamedDefRange[] {
  const ranges: NamedDefRange[] = [];
  let i = skipWsAndHashComments(mapping, 0);
  while (i < mapping.length && mapping[i] === '@') {
    i++;
    const nameStart = i;
    while (i < mapping.length && /[A-Za-z0-9_]/.test(mapping[i])) i++;
    const name = mapping.slice(nameStart, i);
    if (!name) break;
    i = skipWsAndHashComments(mapping, i);
    if (mapping[i] !== '{') break;
    i++;
    const bodyStart = i;
    let depth = 1;
    while (i < mapping.length && depth > 0) {
      const c = mapping[i];
      if (c === '#') {
        while (i < mapping.length && mapping[i] !== '\n') i++;
        continue;
      }
      if (c === '"' || c === "'") {
        const q = c;
        i++;
        while (i < mapping.length && mapping[i] !== q) {
          if (mapping[i] === '\\') i++;
          i++;
        }
        i++;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      if (depth > 0) i++;
    }
    const bodyEnd = i;
    if (mapping[i] === '}') i++;
    // Content inside `@Name { … }` sits at brace depth 1 relative to the mapping start
    // only when no outer braces enclose the def (defs are always at the mapping head).
    ranges.push({ name, bodyStart, bodyEnd, bodyDepth: braceDepthAt(mapping, bodyStart) });
    i = skipWsAndHashComments(mapping, i);
  }
  return ranges;
}

function namedDefAt(offset: number, ranges: NamedDefRange[]): NamedDefRange | undefined {
  for (const r of ranges) {
    if (offset >= r.bodyStart && offset < r.bodyEnd) {
      return r;
    }
  }
  return undefined;
}

/**
 * Walk a bind path from `base` (or argTypes at root) to the GraphQL type at the tip.
 * Used to learn each `@Name` owner from its `message@Name: path` reference site.
 */
function typeAtBindPath(
  path: string,
  base: GraphQLNamedType | null | undefined,
  options: RewriteProtobufMappingBindsTypeScopedOptions,
  fieldRenameMap: Map<string, Map<string, string>>,
  argRenameLookup: Map<string, string>,
  atMappingRoot: boolean,
): GraphQLNamedType | null | undefined {
  if (path.startsWith('$args')) {
    const rest =
      path === '$args'
        ? []
        : path.startsWith('$args.')
          ? path.slice('$args.'.length).split('.')
          : [];
    if (!rest.length) return undefined;
    let cur = resolveArgType(
      options.argTypes,
      argRenameLookup.get(rest[0]) ?? rest[0],
      rest[0],
      argRenameLookup,
    );
    for (let i = 1; i < rest.length; i++) {
      cur = renameFieldSegment(cur, rest[i], fieldRenameMap).type;
    }
    return cur;
  }
  if (path.startsWith('$this')) {
    const rest =
      path === '$this'
        ? []
        : path.startsWith('$this.')
          ? path.slice('$this.'.length).split('.')
          : [];
    let cur: GraphQLNamedType | null | undefined = options.rootType ?? base;
    for (const seg of rest) {
      cur = renameFieldSegment(cur, seg, fieldRenameMap).type;
    }
    return cur;
  }
  const left = path.includes('|') ? path.slice(0, path.indexOf('|')) : path;
  const segs = left.split('.');
  if (!segs.length || !segs[0]) return base;
  if (atMappingRoot && options.argTypes?.size) {
    const head = argRenameLookup.get(segs[0]) ?? segs[0];
    if (
      options.argTypes.has(head) ||
      options.argTypes.has(segs[0]) ||
      argRenameLookup.has(segs[0])
    ) {
      let cur = resolveArgType(options.argTypes, head, segs[0], argRenameLookup);
      for (let i = 1; i < segs.length; i++) {
        cur = renameFieldSegment(cur, segs[i], fieldRenameMap).type;
      }
      return cur;
    }
  }
  let cur: GraphQLNamedType | null | undefined = base;
  for (const seg of segs) {
    cur = renameFieldSegment(cur, seg, fieldRenameMap).type;
  }
  return cur;
}

/** `message@Name` in the type clause that ends at the `)` of a `): path` bind. */
function messageAtNameAtBind(source: string, closeParenOffset: number): string | undefined {
  let depth = 0;
  for (let j = closeParenOffset; j >= 0; j--) {
    const c = source[j];
    if (c === ')') depth++;
    else if (c === '(') {
      depth--;
      if (depth === 0) {
        const inside = source.slice(j + 1, closeParenOffset);
        return /message@([A-Za-z0-9_]+)/.exec(inside)?.[1];
      }
    }
  }
  return undefined;
}

/**
 * Map each hoisted `@Name` to the GraphQL type of the message it defines, inferred from
 * `message@Name: path` reference sites. Walks binds so refs inside inline `{ … }` blocks
 * resolve against that block's owner (e.g. `child { message@Leaf: leaf }` → Branch.leaf).
 */
function collectNamedDefOwners(
  mapping: string,
  ranges: NamedDefRange[],
  fieldRenameMap: Map<string, Map<string, string>>,
  options: RewriteProtobufMappingBindsTypeScopedOptions,
  argRenameLookup: Map<string, string>,
): Map<string, GraphQLNamedType> {
  const owners = new Map<string, GraphQLNamedType>();
  if (!ranges.length) return owners;
  const hasArgTypes = Boolean(options.argTypes?.size);
  const bindRe =
    /(\)\s*:\s*)(\$this(?:\.[\w$]+)*(?:\|\$args(?:\.[\w$]+)*)?|\$args(?:\.[\w$]+)*|[\w$]+(?:\.[\w$]+)*(?:\|[\w$]+(?:\.[\w$]+)*)?)(?=[\s{}#]|$)/g;
  let progressed = true;
  while (progressed) {
    progressed = false;
    const typeAtDepth: Array<GraphQLNamedType | null | undefined> = [];
    typeAtDepth[0] = options.rootType ?? null;
    const altArgTypeAtDepth: Array<GraphQLNamedType | null | undefined> = [];
    const argsRootAtDepth: Array<boolean | undefined> = [];
    let scannedTo = 0;
    bindRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = bindRe.exec(mapping))) {
      const path = m[2];
      const offset = m.index;
      if (isInsideHashComment(mapping, offset)) continue;
      clearOwnersClosedBetween(
        mapping,
        scannedTo,
        offset,
        typeAtDepth,
        argsRootAtDepth,
        altArgTypeAtDepth,
      );
      scannedTo = offset + m[0].length;

      const depth = braceDepthAt(mapping, offset);
      let j = offset + m[0].length;
      while (j < mapping.length) {
        if (/\s/.test(mapping[j])) {
          j++;
          continue;
        }
        if (mapping[j] === '#') {
          while (j < mapping.length && mapping[j] !== '\n') j++;
          continue;
        }
        break;
      }
      const entersBlock = mapping[j] === '{';

      const namedCtx = namedDefAt(offset, ranges);
      const defOwner = namedCtx ? owners.get(namedCtx.name) : undefined;
      // Inside a named def whose owner is not yet known, skip recording until a later pass.
      if (namedCtx && defOwner === undefined) {
        continue;
      }
      const ownersFallback = defOwner ?? options.rootType;
      const inheritFloor = namedCtx ? namedCtx.bodyDepth : 0;
      const pathOwners = resolveOwnersAtDepth(
        depth,
        typeAtDepth,
        altArgTypeAtDepth,
        ownersFallback,
        inheritFloor,
      );

      // Record owner for `message@Name` using the enclosing inline / named-def owner.
      const msgName = messageAtNameAtBind(mapping, offset);
      if (msgName && !owners.has(msgName)) {
        const tip = typeAtBindPath(
          path,
          pathOwners.cur,
          options,
          fieldRenameMap,
          argRenameLookup,
          !namedCtx && (depth === 0 || isArgsRootAtDepth(depth, argsRootAtDepth, typeAtDepth)),
        );
        if (tip) {
          owners.set(msgName, tip);
          progressed = true;
        }
      }

      if (!entersBlock) continue;

      // Same block-owner recording as the rewrite pass so nested refs see inline owners.
      if (path.startsWith('$this') && path.includes('|$args')) {
        const dualPipe = path.indexOf('|$args');
        const thisPath = path.slice(0, dualPipe);
        const argsPath = path.slice(dualPipe + 1);
        const thisRest =
          thisPath === '$this'
            ? []
            : thisPath.startsWith('$this.')
              ? thisPath.slice('$this.'.length).split('.')
              : [];
        const argsRest =
          argsPath === '$args'
            ? []
            : argsPath.startsWith('$args.')
              ? argsPath.slice('$args.'.length).split('.')
              : [];
        recordThisBlockOwners(
          depth,
          resolveThisPathOwner(
            thisRest,
            argsRest,
            options,
            fieldRenameMap,
            argRenameLookup,
            hasArgTypes,
          ),
          typeAtDepth,
          altArgTypeAtDepth,
          argsRootAtDepth,
        );
        continue;
      }
      if (path.startsWith('$args')) {
        if (!hasArgTypes && !argRenameLookup.size) continue;
        const rest =
          path === '$args'
            ? []
            : path.startsWith('$args.')
              ? path.slice('$args.'.length).split('.')
              : [];
        let cur: GraphQLNamedType | null | undefined;
        if (rest.length) {
          const argHead = argRenameLookup.get(rest[0]) ?? rest[0];
          cur = resolveArgType(options.argTypes, argHead, rest[0], argRenameLookup);
          for (let i = 1; i < rest.length; i++) {
            cur = renameFieldSegment(cur, rest[i], fieldRenameMap).type;
          }
        }
        typeAtDepth[depth + 1] = cur ?? null;
        altArgTypeAtDepth[depth + 1] = undefined;
        argsRootAtDepth[depth + 1] = rest.length === 0;
        continue;
      }
      if (path.startsWith('$this')) {
        const rest =
          path === '$this'
            ? []
            : path.startsWith('$this.')
              ? path.slice('$this.'.length).split('.')
              : [];
        recordThisBlockOwners(
          depth,
          resolveThisPathOwner(rest, rest, options, fieldRenameMap, argRenameLookup, hasArgTypes),
          typeAtDepth,
          altArgTypeAtDepth,
          argsRootAtDepth,
        );
        continue;
      }

      if (path.includes('|') && !path.includes('$')) {
        const pipe = path.indexOf('|');
        const left = rewriteSegments(
          path.slice(0, pipe).split('.'),
          pathOwners.cur,
          fieldRenameMap,
        );
        const right = rewriteSegments(
          path.slice(pipe + 1).split('.'),
          pathOwners.altCur != null ? pathOwners.altCur : pathOwners.cur,
          fieldRenameMap,
        );
        typeAtDepth[depth + 1] = left.type ?? null;
        altArgTypeAtDepth[depth + 1] = pathOwners.altCur != null ? (right.type ?? null) : undefined;
        argsRootAtDepth[depth + 1] = false;
        continue;
      }

      const segments = path.split('.');
      if (
        !namedCtx &&
        (hasArgTypes || argRenameLookup.size) &&
        (depth === 0 || isArgsRootAtDepth(depth, argsRootAtDepth, typeAtDepth))
      ) {
        const argName = segments[0];
        const publicArg = argRenameLookup.get(argName) ?? argName;
        let cur = resolveArgType(options.argTypes, publicArg, argName, argRenameLookup);
        for (let i = 1; i < segments.length; i++) {
          cur = renameFieldSegment(cur, segments[i], fieldRenameMap).type;
        }
        typeAtDepth[depth + 1] = cur ?? null;
        altArgTypeAtDepth[depth + 1] = undefined;
        argsRootAtDepth[depth + 1] = false;
        continue;
      }

      let cur = pathOwners.cur;
      let altCur = pathOwners.altCur;
      const walkAlt = altCur != null;
      for (const seg of segments) {
        cur = renameFieldSegment(cur, seg, fieldRenameMap).type;
        if (walkAlt) {
          altCur = renameFieldSegment(altCur, seg, fieldRenameMap).type;
        }
      }
      typeAtDepth[depth + 1] = cur ?? null;
      altArgTypeAtDepth[depth + 1] = walkAlt ? (altCur ?? null) : undefined;
      argsRootAtDepth[depth + 1] = false;
    }
  }
  return owners;
}

/**
 * Rewrite `@protobuf__rpc` binds using each segment’s owning GraphQL type.
 *
 * Unlike a flattened name→name map, `Review.year→publicationYear` does not rewrite
 * an unchanged `Movie.year` when both types are reachable from the same root.
 */
export function rewriteProtobufMappingBindsTypeScoped(
  mapping: string,
  fieldRenameMap: Map<string, Map<string, string>>,
  options: RewriteProtobufMappingBindsTypeScopedOptions,
): string {
  const hasArgTypes = Boolean(options.argTypes?.size);
  const argRenameLookup = options.argRenameMap?.size ? toLookup(options.argRenameMap) : new Map();
  if (
    !mapping ||
    (!fieldRenameMap.size && !argRenameLookup.size) ||
    (!options.rootType && !hasArgTypes && !argRenameLookup.size)
  ) {
    return mapping;
  }

  const namedDefRanges = parseNamedDefRanges(mapping);
  const namedDefOwners = collectNamedDefOwners(
    mapping,
    namedDefRanges,
    fieldRenameMap,
    options,
    argRenameLookup,
  );

  /** Type that owns relative binds at each brace depth (parent side when dual). */
  const typeAtDepth: Array<GraphQLNamedType | null | undefined> = [];
  typeAtDepth[0] = options.rootType ?? null;
  /**
   * Argument-side owner at a depth entered via `$this…` when parent and arg nested renames
   * can diverge. Relative binds emit `parentName|argName` when the two renames differ.
   */
  const altArgTypeAtDepth: Array<GraphQLNamedType | null | undefined> = [];
  /**
   * When true, relative binds at this depth are GraphQL argument names owned by bare `$args { }`.
   * Cleared with `typeAtDepth` when blocks close.
   */
  const argsRootAtDepth: Array<boolean | undefined> = [];
  /** End offset of the previous bind match — brace walk clears stale owners between binds. */
  let scannedTo = 0;

  // Dual `$this.x|$args.y` and relative `a|b` must match as one token so nested `{ … }`
  // records the child owner (otherwise `|` stops the path match).
  return mapping.replace(
    /(\)\s*:\s*)(\$this(?:\.[\w$]+)*(?:\|\$args(?:\.[\w$]+)*)?|\$args(?:\.[\w$]+)*|[\w$]+(?:\.[\w$]+)*(?:\|[\w$]+(?:\.[\w$]+)*)?)(?=[\s{}#]|$)/g,
    (match, pre: string, path: string, offset: number, whole: string) => {
      // `# 2(int64): ignored }` must not count as a bind — matching it advances scannedTo past
      // `#`, so a later brace walk would see the commented `}` as real and clear owners.
      if (isInsideHashComment(whole, offset)) {
        return match;
      }
      // Pop owners when blocks close so a later unbound `{ … }` does not keep a sibling's type.
      clearOwnersClosedBetween(
        whole,
        scannedTo,
        offset,
        typeAtDepth,
        argsRootAtDepth,
        altArgTypeAtDepth,
      );
      scannedTo = offset + match.length;

      const depth = braceDepthAt(whole, offset);
      const afterPath = offset + match.length;
      // Skip whitespace and `# …` comments so `1(message): input # doc\n{` still enters a block.
      let j = afterPath;
      while (j < whole.length) {
        if (/\s/.test(whole[j])) {
          j++;
          continue;
        }
        if (whole[j] === '#') {
          while (j < whole.length && whole[j] !== '\n') j++;
          continue;
        }
        break;
      }
      const entersBlock = whole[j] === '{';

      const namedCtx = namedDefAt(offset, namedDefRanges);
      const defOwner = namedCtx ? namedDefOwners.get(namedCtx.name) : undefined;
      const ownersFallback = defOwner ?? options.rootType;
      // Inside `@Name { … }`, do not inherit the outer mapping root through depth 0.
      const inheritFloor = namedCtx ? namedCtx.bodyDepth : 0;

      // Dual `$this…|$args…`: leave text for the dual-bind pass; still record the child owner
      // from the `$this` side (parent path) with `$args` as fallback when parent lacks the field.
      const dualPipe = path.indexOf('|$args');
      if (path.startsWith('$this') && dualPipe !== -1) {
        const thisPath = path.slice(0, dualPipe);
        const argsPath = path.slice(dualPipe + 1); // `$args…`
        const thisRest =
          thisPath === '$this'
            ? []
            : thisPath.startsWith('$this.')
              ? thisPath.slice('$this.'.length).split('.')
              : [];
        const argsRest =
          argsPath === '$args'
            ? []
            : argsPath.startsWith('$args.')
              ? argsPath.slice('$args.'.length).split('.')
              : [];
        const resolved = resolveThisPathOwner(
          thisRest,
          argsRest,
          options,
          fieldRenameMap,
          argRenameLookup,
          hasArgTypes,
        );
        if (entersBlock) {
          recordThisBlockOwners(depth, resolved, typeAtDepth, altArgTypeAtDepth, argsRootAtDepth);
        }
        return `${pre}${path}`;
      }

      // `$args.input { … }` / `$args.input.movie`: keep `$args` prefix; descend into
      // arg/input types so nested relative binds (e.g. `year`) rename against the owner.
      // Bare `$args { … }` marks the next depth as args-root so nested `year` uses arg renames.
      if (path.startsWith('$args')) {
        if (!hasArgTypes && !argRenameLookup.size) {
          return `${pre}${path}`;
        }
        const rest =
          path === '$args'
            ? []
            : path.startsWith('$args.')
              ? path.slice('$args.'.length).split('.')
              : [];
        const rewritten = ['$args'];
        let cur: GraphQLNamedType | null | undefined;
        if (rest.length) {
          const argHead = argRenameLookup.get(rest[0]) ?? rest[0];
          rewritten.push(argHead);
          // `argTypes` from applyProtobufFieldRenames is keyed by public arg names.
          cur = resolveArgType(options.argTypes, argHead, rest[0], argRenameLookup);
          for (let i = 1; i < rest.length; i++) {
            const stepped = renameFieldSegment(cur, rest[i], fieldRenameMap);
            rewritten.push(stepped.name);
            cur = stepped.type;
          }
        }
        if (entersBlock) {
          typeAtDepth[depth + 1] = cur ?? null;
          altArgTypeAtDepth[depth + 1] = undefined;
          argsRootAtDepth[depth + 1] = rest.length === 0;
        }
        return `${pre}${rewritten.join('.')}`;
      }

      // `$this.<field>` entity binds: parent owner (`rootType`) when the parent path exists;
      // argument type when the parent has no matching field (or no parent at all).
      // When both parent and arg owners exist, nested relative binds may emit dual names.
      if (path.startsWith('$this')) {
        const rest =
          path === '$this'
            ? []
            : path.startsWith('$this.')
              ? path.slice('$this.'.length).split('.')
              : [];
        const resolved = resolveThisPathOwner(
          rest,
          rest,
          options,
          fieldRenameMap,
          argRenameLookup,
          hasArgTypes,
        );
        const usedArgFallback = resolved.usedArgFallback;
        if (options.skipThisBinds) {
          // Leave `$this` path text for the dual-bind pass; record dual owners when needed.
          if (entersBlock) {
            recordThisBlockOwners(depth, resolved, typeAtDepth, altArgTypeAtDepth, argsRootAtDepth);
          }
          return `${pre}${path}`;
        }
        // Rewrite `$this` segments only when walking the parent field map (not arg fallback).
        if (usedArgFallback) {
          if (entersBlock) {
            recordThisBlockOwners(depth, resolved, typeAtDepth, altArgTypeAtDepth, argsRootAtDepth);
          }
          return `${pre}${path}`;
        }
        const rewritten = ['$this'];
        let cur: GraphQLNamedType | null | undefined = options.rootType;
        for (const seg of rest) {
          const stepped = renameFieldSegment(cur, seg, fieldRenameMap);
          rewritten.push(stepped.name);
          cur = stepped.type;
        }
        if (entersBlock) {
          recordThisBlockOwners(depth, resolved, typeAtDepth, altArgTypeAtDepth, argsRootAtDepth);
        }
        return `${pre}${rewritten.join('.')}`;
      }

      // Relative dual `parentYear|requestYear` from an earlier transform: rewrite each arm
      // against its recorded owner so consecutive field renames stay valid.
      if (path.includes('|') && !path.includes('$')) {
        const pipe = path.indexOf('|');
        const leftSegs = path.slice(0, pipe).split('.');
        const rightSegs = path.slice(pipe + 1).split('.');
        const owners = resolveOwnersAtDepth(
          depth,
          typeAtDepth,
          altArgTypeAtDepth,
          ownersFallback,
          inheritFloor,
        );
        const left = rewriteSegments(leftSegs, owners.cur, fieldRenameMap);
        const right = rewriteSegments(
          rightSegs,
          owners.altCur != null ? owners.altCur : owners.cur,
          fieldRenameMap,
        );
        let nextPath = left.path;
        if (right.path !== left.path) {
          nextPath = `${left.path}|${right.path}`;
        }
        if (entersBlock) {
          typeAtDepth[depth + 1] = left.type ?? null;
          altArgTypeAtDepth[depth + 1] = owners.altCur != null ? (right.type ?? null) : undefined;
          argsRootAtDepth[depth + 1] = false;
        }
        return `${pre}${nextPath}`;
      }

      const segments = path.split('.');

      // Depth-0 args mode, or nested relative binds under bare `$args { … }`
      // (including through unbound nested blocks that inherit the args-root marker).
      // Named-def bodies are always relative field maps — never arg-root.
      if (
        !namedCtx &&
        (hasArgTypes || argRenameLookup.size) &&
        (depth === 0 || isArgsRootAtDepth(depth, argsRootAtDepth, typeAtDepth))
      ) {
        const argName = segments[0];
        const publicArg = argRenameLookup.get(argName) ?? argName;
        const rewritten = [publicArg];
        let cur: GraphQLNamedType | null | undefined = resolveArgType(
          options.argTypes,
          publicArg,
          argName,
          argRenameLookup,
        );
        for (let i = 1; i < segments.length; i++) {
          const stepped = renameFieldSegment(cur, segments[i], fieldRenameMap);
          rewritten.push(stepped.name);
          cur = stepped.type;
        }
        if (entersBlock) {
          typeAtDepth[depth + 1] = cur ?? null;
          altArgTypeAtDepth[depth + 1] = undefined;
          argsRootAtDepth[depth + 1] = false;
        }
        return `${pre}${rewritten.join('.')}`;
      }

      // Unbound nested `{ … }` leaves typeAtDepth[depth] unset (undefined) — inherit the
      // enclosing owner. Explicit unknown owners are stored as `null` and must not inherit.
      // Hoisted `@Name` bodies use the GraphQL type of the referenced nested message.
      const owners = resolveOwnersAtDepth(
        depth,
        typeAtDepth,
        altArgTypeAtDepth,
        ownersFallback,
        inheritFloor,
      );
      let cur = owners.cur;
      let altCur = owners.altCur;
      const rewritten: string[] = [];
      const altRewritten: string[] = [];
      const walkAlt = altCur != null;
      for (const seg of segments) {
        const stepped = renameFieldSegment(cur, seg, fieldRenameMap);
        rewritten.push(stepped.name);
        cur = stepped.type;
        if (walkAlt) {
          const altStepped = renameFieldSegment(altCur, seg, fieldRenameMap);
          altRewritten.push(altStepped.name);
          altCur = altStepped.type;
        }
      }
      let nextPath = rewritten.join('.');
      if (walkAlt && altRewritten.length === rewritten.length) {
        const altPath = altRewritten.join('.');
        if (altPath !== nextPath) {
          nextPath = `${nextPath}|${altPath}`;
        }
      }
      if (entersBlock) {
        typeAtDepth[depth + 1] = cur ?? null;
        altArgTypeAtDepth[depth + 1] = walkAlt ? (altCur ?? null) : undefined;
        argsRootAtDepth[depth + 1] = false;
      }
      return `${pre}${nextPath}`;
    },
  );
}

function rewriteSegments(
  segments: string[],
  owner: GraphQLNamedType | null | undefined,
  fieldRenameMap: Map<string, Map<string, string>>,
): { path: string; type: GraphQLNamedType | null | undefined } {
  let cur = owner;
  const rewritten: string[] = [];
  for (const seg of segments) {
    const stepped = renameFieldSegment(cur, seg, fieldRenameMap);
    rewritten.push(stepped.name);
    cur = stepped.type;
  }
  return { path: rewritten.join('.'), type: cur };
}

function resolveOwnersAtDepth(
  depth: number,
  typeAtDepth: Array<GraphQLNamedType | null | undefined>,
  altArgTypeAtDepth: Array<GraphQLNamedType | null | undefined>,
  rootType: GraphQLNamedType | null | undefined,
  /** Lowest depth to inherit from (named-def bodies skip the outer mapping root). */
  inheritFloor = 0,
): {
  cur: GraphQLNamedType | null | undefined;
  altCur: GraphQLNamedType | null | undefined;
} {
  let cur: GraphQLNamedType | null | undefined = typeAtDepth[depth];
  let altCur: GraphQLNamedType | null | undefined = altArgTypeAtDepth[depth];
  if (cur === undefined) {
    for (let d = depth - 1; d >= inheritFloor; d--) {
      if (typeAtDepth[d] !== undefined) {
        cur = typeAtDepth[d];
        altCur = altArgTypeAtDepth[d];
        break;
      }
    }
  }
  if (cur === undefined) {
    cur = rootType;
  }
  return { cur, altCur };
}

/**
 * True when relative binds at `depth` are GraphQL argument names under bare `$args { }`.
 * Inherits through unbound nested blocks (`typeAtDepth` still unset). Explicit bound owners
 * (including unknown `null`) isolate and do not inherit the args-root marker.
 */
function isArgsRootAtDepth(
  depth: number,
  argsRootAtDepth: Array<boolean | undefined>,
  typeAtDepth: Array<GraphQLNamedType | null | undefined>,
): boolean {
  if (argsRootAtDepth[depth] === true) return true;
  // `false` is an active boundary only while a bound owner remains at this depth.
  // Cleared/closed slots leave the type owner unset — do not block sibling inheritance.
  if (argsRootAtDepth[depth] === false && typeAtDepth[depth] !== undefined) return false;
  // Unset at this depth: only inherit across unbound levels (type also unset).
  if (typeAtDepth[depth] !== undefined) return false;
  for (let d = depth - 1; d >= 0; d--) {
    if (argsRootAtDepth[d] === true) return true;
    if (typeAtDepth[d] !== undefined) {
      return argsRootAtDepth[d] === true;
    }
  }
  return false;
}

/**
 * Walk `[from, to)` and clear `typeAtDepth` entries when a `{…}` block closes, so the next
 * open (including an unbound `1(message): {`) does not reuse a sibling block's owner.
 * Explicit `null` owners are cleared on close the same way; inheritance only uses `undefined`.
 */
function clearOwnersClosedBetween(
  source: string,
  from: number,
  to: number,
  typeAtDepth: Array<GraphQLNamedType | null | undefined>,
  argsRootAtDepth?: Array<boolean | undefined>,
  altArgTypeAtDepth?: Array<GraphQLNamedType | null | undefined>,
): void {
  let depth = braceDepthAt(source, from);
  for (let i = from; i < to; i++) {
    const c = source[i];
    if (c === '#') {
      while (i < to && source[i] !== '\n') i++;
      continue;
    }
    if (c === '{') {
      depth++;
    } else if (c === '}') {
      typeAtDepth[depth] = undefined;
      // Unset (do not leave `false`) so the next unbound sibling can inherit args-root.
      if (argsRootAtDepth) {
        argsRootAtDepth[depth] = undefined;
      }
      if (altArgTypeAtDepth) {
        altArgTypeAtDepth[depth] = undefined;
      }
      for (let d = depth + 1; d < typeAtDepth.length; d++) {
        typeAtDepth[d] = undefined;
        if (argsRootAtDepth) {
          argsRootAtDepth[d] = undefined;
        }
        if (altArgTypeAtDepth) {
          altArgTypeAtDepth[d] = undefined;
        }
      }
      depth = Math.max(0, depth - 1);
    }
  }
}

type ThisPathOwners = {
  owner: GraphQLNamedType | null | undefined;
  /** Argument-side child type when parent path also exists (for dual nested renames). */
  altArgOwner?: GraphQLNamedType | null;
  usedArgFallback: boolean;
};

function recordThisBlockOwners(
  depth: number,
  resolved: ThisPathOwners,
  typeAtDepth: Array<GraphQLNamedType | null | undefined>,
  altArgTypeAtDepth: Array<GraphQLNamedType | null | undefined>,
  argsRootAtDepth: Array<boolean | undefined>,
): void {
  typeAtDepth[depth + 1] = resolved.owner ?? null;
  altArgTypeAtDepth[depth + 1] = resolved.altArgOwner;
  argsRootAtDepth[depth + 1] = false;
}

/**
 * Resolve owners for nested relative binds under a `$this…` path.
 * Prefer the parent (`rootType`) when every segment exists on that type; otherwise fall
 * back to the argument type. When the parent path exists *and* an arg type is available,
 * also return `altArgOwner` so nested renames can emit `parentYear|requestYear`.
 */
function resolveThisPathOwner(
  thisRest: string[],
  argsRest: string[],
  options: RewriteProtobufMappingBindsTypeScopedOptions,
  fieldRenameMap: Map<string, Map<string, string>>,
  argRenameLookup: Map<string, string>,
  hasArgTypes: boolean,
): ThisPathOwners {
  const argOwner =
    hasArgTypes && argsRest.length
      ? walkArgOwner(argsRest, options.argTypes, argRenameLookup, fieldRenameMap)
      : undefined;

  if (options.rootType) {
    if (thisRest.length === 0) {
      return {
        owner: options.rootType,
        altArgOwner: argOwner,
        usedArgFallback: false,
      };
    }
    let cur: GraphQLNamedType | null | undefined = options.rootType;
    let parentOk = true;
    for (const seg of thisRest) {
      if (!ownerHasField(cur, seg, fieldRenameMap)) {
        parentOk = false;
        break;
      }
      cur = renameFieldSegment(cur, seg, fieldRenameMap).type;
    }
    if (parentOk) {
      return {
        owner: cur,
        // Only dualize nested renames when the arg owner is a distinct type.
        altArgOwner: argOwner && argOwner !== cur ? argOwner : undefined,
        usedArgFallback: false,
      };
    }
  }
  if (argOwner !== undefined) {
    return { owner: argOwner, usedArgFallback: true };
  }
  return { owner: null, usedArgFallback: false };
}

function walkArgOwner(
  argsRest: string[],
  argTypes: Map<string, GraphQLNamedType> | undefined,
  argRenameLookup: Map<string, string>,
  fieldRenameMap: Map<string, Map<string, string>>,
): GraphQLNamedType | null | undefined {
  let cur: GraphQLNamedType | null | undefined = resolveArgType(
    argTypes,
    argRenameLookup.get(argsRest[0]) ?? argsRest[0],
    argsRest[0],
    argRenameLookup,
  );
  for (let i = 1; i < argsRest.length; i++) {
    cur = renameFieldSegment(cur, argsRest[i], fieldRenameMap).type;
  }
  return cur;
}

function ownerHasField(
  owner: GraphQLNamedType | null | undefined,
  oldName: string,
  fieldRenameMap: Map<string, Map<string, string>>,
): boolean {
  if (!owner || (!isObjectType(owner) && !isInterfaceType(owner) && !isInputObjectType(owner))) {
    return false;
  }
  const renames = fieldRenameMap.get(owner.name);
  const nextName = renames?.get(oldName) ?? oldName;
  const fields = owner.getFields();
  return Boolean(fields[nextName] ?? fields[oldName]);
}

/**
 * Resolve an argument's GraphQL type from `argTypes`.
 * When the map comes from the public (already-renamed) schema, look up the public
 * head first so chained `a→b`, `b→c` does not bind `$args.b` to `InputA`.
 */
function resolveArgType(
  argTypes: Map<string, GraphQLNamedType> | undefined,
  publicHead: string,
  originalHead: string,
  argRenameLookup: Map<string, string>,
): GraphQLNamedType | null | undefined {
  if (!argTypes?.size) {
    return undefined;
  }
  // Public-schema maps: keys are already-renamed arg names.
  if (argTypes.has(publicHead)) {
    return argTypes.get(publicHead);
  }
  if (argTypes.has(originalHead)) {
    return argTypes.get(originalHead);
  }
  // Inverse: if map still has a pre-rename key that renames to publicHead.
  for (const [from, to] of argRenameLookup) {
    if (to === publicHead && argTypes.has(from)) {
      return argTypes.get(from);
    }
  }
  return undefined;
}

function renameFieldSegment(
  owner: GraphQLNamedType | null | undefined,
  oldName: string,
  fieldRenameMap: Map<string, Map<string, string>>,
): { name: string; type: GraphQLNamedType | null } {
  if (!owner || (!isObjectType(owner) && !isInterfaceType(owner) && !isInputObjectType(owner))) {
    return { name: oldName, type: null };
  }
  const renames = fieldRenameMap.get(owner.name);
  const nextName = renames?.get(oldName) ?? oldName;
  const fields = owner.getFields();
  // Schema may already expose the public (renamed) field name.
  const field = fields[nextName] ?? fields[oldName];
  if (!field) {
    return { name: nextName, type: null };
  }
  return { name: nextName, type: getNamedType(field.type) };
}

function protobufRpcDirectiveKey(
  fieldDirectives: Record<string, any[]> | undefined,
): 'protobuf__rpc' | 'protobufRpc' | undefined {
  if (fieldDirectives?.protobuf__rpc?.length) {
    return 'protobuf__rpc';
  }
  if (fieldDirectives?.protobufRpc?.length) {
    return 'protobufRpc';
  }
  return undefined;
}

/**
 * Rewrite Federation `@connect`, Thrift `@thrift__rpc`, Mesh `@protobuf__rpc`,
 * and Mesh `@mongo__*` mappings after GraphQL renames. These skip Mesh `@source` /
 * `@meshSource`; transforms keep directive binds on the public GraphQL names instead.
 *
 * When `fieldRenameMap` is set, also rewrite selection aliases of the form
 * `newName: oldName` / leading `oldName` field picks so rename/prefix transforms
 * keep compact selection in sync with GraphQL field names.
 * Mongo (and SQL) also rewrite `$this.<field>` parent picks.
 *
 * When `typeRenameMap` is set, rewrite `__typename: "Old"` / `__typename: $("Old")`
 * in selections so prefix/rename/naming-convention keep polymorphic Connect arms valid.
 */
export function rewriteConnectArgReferences(
  fieldDirectives: Record<string, any[]> | undefined,
  argRenameMap: Map<string, string>,
  fieldRenameMap?: Map<string, string>,
  typeRenameMap?: Map<string, string>,
  /**
   * When false, skip all `@protobuf__rpc` rewrites here (caller uses type-scoped
   * `applyProtobufFieldRenames` instead). Avoids a second `$args` rename pass that
   * would chain `a→b` then `b→c`. Connect / thrift selection still uses the maps above.
   */
  protobufNestedFieldRenames: boolean = true,
): Record<string, any[]> | undefined {
  const protobufKey = protobufRpcDirectiveKey(fieldDirectives);
  const hasConnect = Boolean(fieldDirectives?.connect?.length);
  const hasThriftRpc = Boolean(fieldDirectives?.thrift__rpc?.length);
  const mongoDirectiveNames = Object.keys(fieldDirectives || {}).filter(
    name => name === 'mongo' || name.startsWith('mongo__'),
  );
  const hasMongo = mongoDirectiveNames.some(name => Boolean(fieldDirectives?.[name]?.length));
  if (
    (!hasConnect && !hasThriftRpc && !protobufKey && !hasMongo) ||
    (argRenameMap.size === 0 &&
      (!fieldRenameMap || fieldRenameMap.size === 0) &&
      (!typeRenameMap || typeRenameMap.size === 0))
  ) {
    return fieldDirectives;
  }
  const rewriteExpr = (value: unknown): unknown => {
    if (typeof value !== 'string') {
      return value;
    }
    let out = value;
    // Single-pass, whole-name matches so `id` does not rewrite `$args.identifier`
    // and `a→b` + `b→c` does not chain into `$args.c`. Skip quoted spans so
    // compact map lookups like `->get("$args.request")` keep the literal key.
    if (argRenameMap.size) {
      const names = [...argRenameMap.keys()].map(escapeRegExp).join('|');
      const re = new RegExp(`\\$args\\.(${names})(?![\\w])`, 'g');
      out = rewriteOutsideQuotes(out, segment =>
        segment.replace(re, (_m, name: string) => `$args.${argRenameMap.get(name) ?? name}`),
      );
    }
    // `fieldRenameMap` rewrites nested response-field picks in a selection
    // (`name` → `fullName`). Do not pass the connector field's own rename here —
    // that would rewrite response keys incorrectly (e.g. Query.user → person).
    if (fieldRenameMap?.size) {
      for (const [from, to] of fieldRenameMap) {
        if (from === to) continue;
        out = out
          .replace(new RegExp(`(^|[\\n\\s])${escapeRegExp(from)}(\\s*[:{])`, 'g'), `$1${to}$2`)
          .replace(new RegExp(`(^|[\\n\\s])${escapeRegExp(from)}(?=\\s|$)`, 'g'), `$1${to}`);
        // Quote-aware: do not rewrite `$this.x` inside string literals.
        out = rewriteOutsideQuotes(out, segment =>
          segment.replace(
            new RegExp(`\\$this\\.${escapeRegExp(from)}(?![\\w])`, 'g'),
            `$this.${to}`,
          ),
        );
      }
    }
    if (typeRenameMap?.size) {
      // One pass with a lookup: `FooBar→Foo` then `Foo→Bar` must not rewrite the
      // already-replaced `Foo` again. Longer names win the alternation first.
      const entries = [...typeRenameMap.entries()]
        .filter(([from, to]) => from && to && from !== to)
        .sort((a, b) => b[0].length - a[0].length);
      if (entries.length) {
        const lookup = new Map(entries);
        const names = entries.map(([from]) => escapeRegExp(from)).join('|');
        out = out
          .replace(
            new RegExp(`__typename:\\s*\\$\\("(${names})"\\)`, 'g'),
            (_m, name: string) => `__typename: $("${lookup.get(name) ?? name}")`,
          )
          .replace(
            new RegExp(`__typename:\\s*"(${names})"`, 'g'),
            (_m, name: string) => `__typename: "${lookup.get(name) ?? name}"`,
          );
      }
    }
    return out;
  };
  /** HTTP path templates: rewrite `$args` even when the literal path has `'` / `"` (e.g. `/O'Reilly/{$args.id}`). Quote-skipping is only for expression strings (`->get("$args.x")`). */
  const rewriteHttpPath = (value: string): string => {
    if (!argRenameMap.size) {
      return value;
    }
    const names = [...argRenameMap.keys()].map(escapeRegExp).join('|');
    const re = new RegExp(`\\$args\\.(${names})(?![\\w])`, 'g');
    return value.replace(re, (_m, name: string) => `$args.${argRenameMap.get(name) ?? name}`);
  };
  const rewriteHttp = (http: Record<string, any> | undefined) => {
    if (!http || typeof http !== 'object') {
      return http;
    }
    const next: Record<string, any> = { ...http };
    for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      if (typeof next[method] === 'string') {
        next[method] = rewriteHttpPath(next[method]);
      }
    }
    if (typeof next.body === 'string') {
      next.body = rewriteExpr(next.body);
    }
    if (typeof next.queryParams === 'string') {
      next.queryParams = rewriteExpr(next.queryParams);
    }
    if (Array.isArray(next.headers)) {
      next.headers = next.headers.map((header: any) => {
        if (!header || typeof header !== 'object') {
          return header;
        }
        return {
          ...header,
          value: rewriteExpr(header.value),
          from: rewriteExpr(header.from),
        };
      });
    }
    return next;
  };
  let nextDirectives = fieldDirectives!;
  if (hasConnect) {
    nextDirectives = {
      ...nextDirectives,
      connect: nextDirectives.connect.map((connectArgs: any) => ({
        ...connectArgs,
        http: rewriteHttp(connectArgs?.http),
        selection:
          typeof connectArgs?.selection === 'string'
            ? rewriteExpr(connectArgs.selection)
            : connectArgs?.selection,
        isSuccess:
          typeof connectArgs?.isSuccess === 'string'
            ? rewriteExpr(connectArgs.isSuccess)
            : connectArgs?.isSuccess,
        errors: connectArgs?.errors
          ? {
              ...connectArgs.errors,
              message: rewriteExpr(connectArgs.errors.message),
              extensions: rewriteExpr(connectArgs.errors.extensions),
            }
          : connectArgs?.errors,
      })),
    };
  }
  if (hasThriftRpc) {
    // Compact `@thrift__rpc(args/selection/throws:)` embed `$args.<name>` the same way.
    nextDirectives = {
      ...nextDirectives,
      thrift__rpc: nextDirectives.thrift__rpc.map((rpcArgs: any) => ({
        ...rpcArgs,
        args: typeof rpcArgs?.args === 'string' ? rewriteExpr(rpcArgs.args) : rpcArgs?.args,
        selection:
          typeof rpcArgs?.selection === 'string'
            ? rewriteExpr(rpcArgs.selection)
            : rpcArgs?.selection,
        throws: typeof rpcArgs?.throws === 'string' ? rewriteExpr(rpcArgs.throws) : rpcArgs?.throws,
      })),
    };
  }
  const protobufFieldMap =
    protobufNestedFieldRenames && fieldRenameMap?.size ? fieldRenameMap : undefined;
  if (
    protobufKey &&
    protobufNestedFieldRenames &&
    (argRenameMap.size > 0 || (protobufFieldMap?.size ?? 0) > 0)
  ) {
    // Arg renames update request arg roots (`$args.x` / top-level binds).
    // Field/input renames update nested args path segments and response `selection:`.
    // Do not apply field renames to argument roots (Query `release_year` arg ≠
    // `Movie.release_year` field under `fieldNames: camelCase`).
    // When `protobufNestedFieldRenames` is false, rename/naming-convention own a single
    // type-scoped pass via `applyProtobufFieldRenames` (no a→b then b→c chaining).
    const selectionMap = protobufFieldMap;
    let protobufChanged = false;
    const rewritten = nextDirectives[protobufKey].map((rpcArgs: any) => {
      let args = rpcArgs?.args;
      let selection = rpcArgs?.selection;
      if (typeof args === 'string' && (argRenameMap.size || protobufFieldMap?.size)) {
        // Always pass nestedRenameMap for args (empty when arg-only) so nested
        // input fields do not fall back to the argument rename map.
        args = rewriteProtobufMappingBinds(args, argRenameMap, {
          nestedRenameMap: protobufFieldMap?.size ? protobufFieldMap : new Map(),
        });
      }
      if (typeof selection === 'string' && selectionMap?.size) {
        selection = rewriteProtobufMappingBinds(selection, selectionMap);
      }
      if (args === rpcArgs?.args && selection === rpcArgs?.selection) {
        return rpcArgs;
      }
      protobufChanged = true;
      return { ...rpcArgs, args, selection };
    });
    if (protobufChanged) {
      nextDirectives = {
        ...nextDirectives,
        [protobufKey]: rewritten,
      };
    }
  }
  if (hasMongo) {
    // `@mongo__findOne(query/selection/…)` (and legacy `@mongo`) embed `$args` / `$this`.
    const mongoStringArgs = [
      'query',
      'selection',
      'sort',
      'filter', // legacy
      'where', // legacy
      'orderBy', // legacy
      'set',
      'pipeline',
      'limit',
      'skip',
      'first',
      'after',
      'page',
      'perPage',
    ] as const;
    for (const dirName of mongoDirectiveNames) {
      nextDirectives = {
        ...nextDirectives,
        [dirName]: nextDirectives[dirName].map((mongoArgs: any) => {
          const rewritten: Record<string, unknown> = { ...mongoArgs };
          for (const key of mongoStringArgs) {
            if (typeof mongoArgs?.[key] === 'string') {
              rewritten[key] = rewriteExpr(mongoArgs[key]);
            }
          }
          return rewritten;
        }),
      };
    }
  }
  return nextDirectives;
}
