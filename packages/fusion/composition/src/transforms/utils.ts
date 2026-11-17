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
      // Type map is keyed by the pre-rename arg name when available.
      let cur: GraphQLNamedType | null | undefined =
        options.argTypes!.get(argsSegs[0]) ?? options.argTypes!.get(argHead);
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
   * GraphQL type for relative binds at brace depth 0 (selection return type).
   * Omit when rewriting request `args:` with `argTypes` instead.
   */
  rootType?: GraphQLNamedType | null;
  /**
   * Request `args:` mode: depth-0 path heads are argument names (not field-renamed).
   * Values are the named GraphQL types of those arguments for descending into nested binds.
   */
  argTypes?: Map<string, GraphQLNamedType>;
  /**
   * Argument name renames (old→new). Applied to depth-0 arg heads and to nested relative
   * binds under a bare `1(message): $args { … }` block (the `$args` object owns arg names).
   */
  argRenameMap?: Map<string, string>;
  /**
   * When true, leave `$this.*` binds unchanged (caller emits dual `$this|/$args` forms).
   */
  skipThisBinds?: boolean;
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

  /** Type that owns relative binds at each brace depth. */
  const typeAtDepth: Array<GraphQLNamedType | null | undefined> = [];
  typeAtDepth[0] = options.rootType ?? null;
  /**
   * When true, relative binds at this depth are GraphQL argument names owned by bare `$args { }`.
   * Cleared with `typeAtDepth` when blocks close.
   */
  const argsRootAtDepth: boolean[] = [];
  /** End offset of the previous bind match — brace walk clears stale owners between binds. */
  let scannedTo = 0;

  return mapping.replace(
    /(\)\s*:\s*)([\w$]+(?:\.[\w$]+)*)(?=[\s{}#]|$)/g,
    (match, pre: string, path: string, offset: number, whole: string) => {
      // `# 2(int64): ignored }` must not count as a bind — matching it advances scannedTo past
      // `#`, so a later brace walk would see the commented `}` as real and clear owners.
      if (isInsideHashComment(whole, offset)) {
        return match;
      }
      // Pop owners when blocks close so a later unbound `{ … }` does not keep a sibling's type.
      clearOwnersClosedBetween(whole, scannedTo, offset, typeAtDepth, argsRootAtDepth);
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
          cur = options.argTypes?.get(rest[0]) ?? options.argTypes?.get(argHead);
          for (let i = 1; i < rest.length; i++) {
            const stepped = renameFieldSegment(cur, rest[i], fieldRenameMap);
            rewritten.push(stepped.name);
            cur = stepped.type;
          }
        }
        if (entersBlock) {
          typeAtDepth[depth + 1] = cur ?? null;
          argsRootAtDepth[depth + 1] = rest.length === 0;
        }
        return `${pre}${rewritten.join('.')}`;
      }

      // `$this.<field>` entity binds: descend from rootType when entering a nested block.
      if (path.startsWith('$this')) {
        if (options.skipThisBinds) {
          return `${pre}${path}`;
        }
        const rest =
          path === '$this'
            ? []
            : path.startsWith('$this.')
              ? path.slice('$this.'.length).split('.')
              : [];
        const rewritten = ['$this'];
        let cur: GraphQLNamedType | null | undefined = options.rootType;
        for (const seg of rest) {
          const stepped = renameFieldSegment(cur, seg, fieldRenameMap);
          rewritten.push(stepped.name);
          cur = stepped.type;
        }
        if (entersBlock) {
          typeAtDepth[depth + 1] = cur ?? null;
          argsRootAtDepth[depth + 1] = false;
        }
        return `${pre}${rewritten.join('.')}`;
      }

      const segments = path.split('.');

      // Depth-0 args mode, or nested relative binds under bare `$args { … }`.
      if ((hasArgTypes || argRenameLookup.size) && (depth === 0 || argsRootAtDepth[depth])) {
        const argName = segments[0];
        const publicArg = argRenameLookup.get(argName) ?? argName;
        const rewritten = [publicArg];
        let cur: GraphQLNamedType | null | undefined =
          options.argTypes?.get(argName) ?? options.argTypes?.get(publicArg);
        for (let i = 1; i < segments.length; i++) {
          const stepped = renameFieldSegment(cur, segments[i], fieldRenameMap);
          rewritten.push(stepped.name);
          cur = stepped.type;
        }
        if (entersBlock) {
          typeAtDepth[depth + 1] = cur ?? null;
          argsRootAtDepth[depth + 1] = false;
        }
        return `${pre}${rewritten.join('.')}`;
      }

      // Unbound nested `{ … }` leaves typeAtDepth[depth] unset (undefined) — inherit the
      // enclosing owner. Explicit unknown owners are stored as `null` and must not inherit.
      let cur: GraphQLNamedType | null | undefined = typeAtDepth[depth];
      if (cur === undefined) {
        for (let d = depth - 1; d >= 0; d--) {
          if (typeAtDepth[d] !== undefined) {
            cur = typeAtDepth[d];
            break;
          }
        }
      }
      if (cur === undefined) {
        cur = options.rootType;
      }
      const rewritten: string[] = [];
      for (const seg of segments) {
        const stepped = renameFieldSegment(cur, seg, fieldRenameMap);
        rewritten.push(stepped.name);
        cur = stepped.type;
      }
      if (entersBlock) {
        typeAtDepth[depth + 1] = cur ?? null;
        argsRootAtDepth[depth + 1] = false;
      }
      return `${pre}${rewritten.join('.')}`;
    },
  );
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
  argsRootAtDepth?: boolean[],
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
      if (argsRootAtDepth) {
        argsRootAtDepth[depth] = false;
      }
      for (let d = depth + 1; d < typeAtDepth.length; d++) {
        typeAtDepth[d] = undefined;
        if (argsRootAtDepth) {
          argsRootAtDepth[d] = false;
        }
      }
      depth = Math.max(0, depth - 1);
    }
  }
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
 * Rewrite Federation Connectors `@connect` and Mesh `@protobuf__rpc` mappings after
 * GraphQL renames. Connectors and protobuf RPC skip Mesh `@source` / `@meshSource`;
 * transforms keep directive binds on the public GraphQL names instead.
 *
 * When `fieldRenameMap` is set, also rewrite selection aliases of the form
 * `newName: oldName` / leading `oldName` field picks so rename/prefix transforms
 * keep Connectors selection in sync with GraphQL field names — and rewrite bare
 * path segments in `@protobuf__rpc(args|selection)`.
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
   * When false, skip applying `fieldRenameMap` to `@protobuf__rpc` binds (caller uses
   * type-scoped `applyProtobufFieldRenames` instead). Connect selection still uses the flat map.
   */
  protobufNestedFieldRenames: boolean = true,
): Record<string, any[]> | undefined {
  const protobufKey = protobufRpcDirectiveKey(fieldDirectives);
  const hasConnect = !!fieldDirectives?.connect?.length;
  if (
    (!hasConnect && !protobufKey) ||
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
    // and `a→b` + `b→c` does not chain into `$args.c`.
    if (argRenameMap.size) {
      const names = [...argRenameMap.keys()].map(escapeRegExp).join('|');
      out = out.replace(
        new RegExp(`\\$args\\.(${names})(?![\\w])`, 'g'),
        (_m, name: string) => `$args.${argRenameMap.get(name) ?? name}`,
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
  const rewriteHttp = (http: Record<string, any> | undefined) => {
    if (!http || typeof http !== 'object') {
      return http;
    }
    const next: Record<string, any> = { ...http };
    for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      if (typeof next[method] === 'string') {
        next[method] = rewriteExpr(next[method]);
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
  const protobufFieldMap =
    protobufNestedFieldRenames && fieldRenameMap?.size ? fieldRenameMap : undefined;
  if (protobufKey && (argRenameMap.size > 0 || (protobufFieldMap?.size ?? 0) > 0)) {
    // Arg renames update request arg roots (`$args.x` / top-level binds).
    // Field/input renames update nested args path segments and response `selection:`.
    // Do not apply field renames to argument roots (Query `release_year` arg ≠
    // `Movie.release_year` field under `fieldNames: camelCase`).
    // When `protobufNestedFieldRenames` is false, nested/selection field renames are
    // applied type-scoped elsewhere (naming-convention / rename transforms).
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
  return nextDirectives;
}
