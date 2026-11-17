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

/**
 * Rewrite `$args.<name>` (and related) references after GraphQL argument renames
 * for Federation `@connect`, Thrift `@thrift__rpc`, and Mesh `@sql__*`.
 * Mesh stitching used `@meshSource(name:)` for this; Connectors / thrift / SQL
 * mapping bind args by the GraphQL argument name inside path/body/`args`/`selection`
 * strings.
 *
 * When `fieldRenameMap` is set, also rewrite selection aliases of the form
 * `newName: oldName` / leading `oldName` field picks so rename/prefix transforms
 * keep Connectors (and thrift / SQL) selection in sync with GraphQL field names.
 * SQL also rewrites `$this.<field>` parent picks.
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
  const hasConnect = Boolean(fieldDirectives?.connect?.length);
  const hasThriftRpc = Boolean(fieldDirectives?.thrift__rpc?.length);
  const sqlDirectiveNames = ['sql__query', 'sql__mutation', 'sql__relation'] as const;
  const hasSql = sqlDirectiveNames.some(name => Boolean(fieldDirectives?.[name]?.length));
  if (
    (!hasConnect && !hasThriftRpc && !hasSql) ||
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
          .replace(new RegExp(`(^|[\\n\\s])${escapeRegExp(from)}(?=\\s|$)`, 'g'), `$1${to}`)
          .replace(new RegExp(`\\$this\\.${escapeRegExp(from)}(?![\\w])`, 'g'), `$this.${to}`);
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
  const next: Record<string, any[]> = { ...fieldDirectives };
  if (hasConnect) {
    next.connect = fieldDirectives!.connect.map((connectArgs: any) => ({
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
    }));
  }
  if (hasThriftRpc) {
    // Compact `@thrift__rpc(args/selection/throws:)` embed `$args.<name>` the same way.
    next.thrift__rpc = fieldDirectives!.thrift__rpc.map((rpcArgs: any) => ({
      ...rpcArgs,
      args: typeof rpcArgs?.args === 'string' ? rewriteExpr(rpcArgs.args) : rpcArgs?.args,
      selection:
        typeof rpcArgs?.selection === 'string'
          ? rewriteExpr(rpcArgs.selection)
          : rpcArgs?.selection,
      throws: typeof rpcArgs?.throws === 'string' ? rewriteExpr(rpcArgs.throws) : rpcArgs?.throws,
    }));
  }
  for (const name of sqlDirectiveNames) {
    if (!fieldDirectives?.[name]?.length) continue;
    // `@sql__*(args/selection:)` embed `$args.<name>` / `$this.<field>` the same way.
    next[name] = fieldDirectives[name].map((sqlArgs: any) => ({
      ...sqlArgs,
      args: typeof sqlArgs?.args === 'string' ? rewriteExpr(sqlArgs.args) : sqlArgs?.args,
      selection:
        typeof sqlArgs?.selection === 'string'
          ? rewriteExpr(sqlArgs.selection)
          : sqlArgs?.selection,
    }));
  }
  return next;
}
