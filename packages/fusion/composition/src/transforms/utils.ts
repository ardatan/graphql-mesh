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

/**
 * Rewrite GraphQL bind path segments in a `@protobuf__rpc` args/selection mapping.
 * Handles `$args.x` / `$this.x` and bare paths after `):` (e.g. `2(int64): year`,
 * `1(message): input.movie {`).
 */
export function rewriteProtobufMappingBinds(
  mapping: string,
  renameMap: Map<string, string>,
): string {
  if (!mapping || !renameMap.size) {
    return mapping;
  }
  const entries = [...renameMap.entries()].filter(([from, to]) => from && to && from !== to);
  if (!entries.length) {
    return mapping;
  }
  // Longer names first so `year` does not eat `yearPublished`.
  entries.sort((a, b) => b[0].length - a[0].length);
  const lookup = new Map(entries);
  const names = entries.map(([from]) => escapeRegExp(from)).join('|');
  let out = mapping;
  out = out.replace(
    new RegExp(`\\$(args|this)\\.(${names})(?![\\w])`, 'g'),
    (_m, scope: string, name: string) => `$${scope}.${lookup.get(name) ?? name}`,
  );
  // Path binds after `):` — head + optional `.seg` segments.
  out = out.replace(
    /(\):\s*)([\w$]+(?:\.[\w$]+)*)(?=\s*[{]|\s*$|\s*[\n#])/gm,
    (_m, pre: string, path: string) => {
      const next = path
        .split('.')
        .map(seg => lookup.get(seg) ?? seg)
        .join('.');
      return `${pre}${next}`;
    },
  );
  return out;
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
    // Arg renames update request `args:`. Field/input renames update args path
    // segments and response `selection:` binds. Arg-only renames must not touch
    // selection (Query arg `year` ≠ Movie field `year`).
    const argsMap = new Map<string, string>([
      ...argRenameMap.entries(),
      ...(fieldRenameMap?.entries() ?? []),
    ]);
    const selectionMap = fieldRenameMap?.size ? fieldRenameMap : undefined;
    let protobufChanged = false;
    const rewritten = nextDirectives[protobufKey].map((rpcArgs: any) => {
      let args = rpcArgs?.args;
      let selection = rpcArgs?.selection;
      if (typeof args === 'string' && argsMap.size) {
        args = rewriteProtobufMappingBinds(args, argsMap);
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
