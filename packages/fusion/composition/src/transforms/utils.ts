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
  if (rootLookup.size) {
    const names = [...rootLookup.keys()].map(escapeRegExp).join('|');
    // Single lookup from the original name — JS replace does not rescan replacements,
    // but we still must not let the bare-path pass remap `$args.b` after `$args.a→b`.
    out = out.replace(
      new RegExp(`\\$(args|this)\\.(${names})(?![\\w])`, 'g'),
      (_m, scope: string, name: string) => `$${scope}.${rootLookup.get(name) ?? name}`,
    );
  }

  // Path binds after `):` — delimiters match parseMapping (`\s`, `}`, `{`, `#`, EOS),
  // including compact one-liners: `1(message): input { 2(int64): year 3(string): name }`.
  out = out.replace(
    /(\):\s*)([\w$]+(?:\.[\w$]+)*)(?=[\s{}#]|$)/g,
    (_m, pre: string, path: string, offset: number, whole: string) => {
      if (path.startsWith('$args') || path.startsWith('$this')) {
        // `$args` / `$this` already handled; remapping segments would double-rename.
        return `${pre}${path}`;
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

/** Net `{` − `}` count before `index` (string content; mapping dialect has no escapes). */
function braceDepthAt(source: string, index: number): number {
  let depth = 0;
  for (let i = 0; i < index; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') depth = Math.max(0, depth - 1);
  }
  return depth;
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
  if (!mapping || !fieldRenameMap.size) {
    return mapping;
  }
  const hasArgTypes = Boolean(options.argTypes?.size);
  if (!options.rootType && !hasArgTypes) {
    return mapping;
  }

  /** Type that owns relative binds at each brace depth. */
  const typeAtDepth: Array<GraphQLNamedType | null | undefined> = [];
  typeAtDepth[0] = options.rootType ?? null;

  return mapping.replace(
    /(\):\s*)([\w$]+(?:\.[\w$]+)*)(?=[\s{}#]|$)/g,
    (match, pre: string, path: string, offset: number, whole: string) => {
      if (path.startsWith('$args') || path.startsWith('$this')) {
        return `${pre}${path}`;
      }
      const depth = braceDepthAt(whole, offset);
      const afterPath = offset + match.length;
      let j = afterPath;
      while (j < whole.length && /\s/.test(whole[j])) j++;
      const entersBlock = whole[j] === '{';
      const segments = path.split('.');

      if (hasArgTypes && depth === 0) {
        const argName = segments[0];
        const rewritten = [argName];
        let cur: GraphQLNamedType | null | undefined = options.argTypes!.get(argName);
        for (let i = 1; i < segments.length; i++) {
          const stepped = renameFieldSegment(cur, segments[i], fieldRenameMap);
          rewritten.push(stepped.name);
          cur = stepped.type;
        }
        if (entersBlock) {
          typeAtDepth[depth + 1] = cur ?? null;
        }
        return `${pre}${rewritten.join('.')}`;
      }

      let cur: GraphQLNamedType | null | undefined = typeAtDepth[depth] ?? options.rootType;
      const rewritten: string[] = [];
      for (const seg of segments) {
        const stepped = renameFieldSegment(cur, seg, fieldRenameMap);
        rewritten.push(stepped.name);
        cur = stepped.type;
      }
      if (entersBlock) {
        typeAtDepth[depth + 1] = cur ?? null;
      }
      return `${pre}${rewritten.join('.')}`;
    },
  );
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
  if (protobufKey && (argRenameMap.size > 0 || (fieldRenameMap?.size ?? 0) > 0)) {
    // Arg renames update request arg roots (`$args.x` / top-level binds).
    // Field/input renames update nested args path segments and response `selection:`.
    // Do not apply field renames to argument roots (Query `release_year` arg ≠
    // `Movie.release_year` field under `fieldNames: camelCase`).
    const selectionMap = fieldRenameMap?.size ? fieldRenameMap : undefined;
    let protobufChanged = false;
    const rewritten = nextDirectives[protobufKey].map((rpcArgs: any) => {
      let args = rpcArgs?.args;
      let selection = rpcArgs?.selection;
      if (typeof args === 'string' && (argRenameMap.size || fieldRenameMap?.size)) {
        args = rewriteProtobufMappingBinds(args, argRenameMap, {
          nestedRenameMap: fieldRenameMap?.size ? fieldRenameMap : undefined,
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
