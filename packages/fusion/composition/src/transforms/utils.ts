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
 * Rewrite Apollo Connectors `@connect` `$args.<name>` references after GraphQL
 * argument renames. Mesh stitching used `@meshSource(name:)` for this; Connectors
 * bind args by the GraphQL argument name in path/body/query/headers expressions.
 *
 * When `fieldRenameMap` is set, also rewrite selection aliases of the form
 * `newName: oldName` / leading `oldName` field picks so rename/prefix transforms
 * keep Connectors selection in sync with GraphQL field names.
 */
export function rewriteConnectArgReferences(
  fieldDirectives: Record<string, any[]> | undefined,
  argRenameMap: Map<string, string>,
  fieldRenameMap?: Map<string, string>,
): Record<string, any[]> | undefined {
  if (
    !fieldDirectives?.connect?.length ||
    (argRenameMap.size === 0 && (!fieldRenameMap || fieldRenameMap.size === 0))
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
  return {
    ...fieldDirectives,
    connect: fieldDirectives.connect.map((connectArgs: any) => ({
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
