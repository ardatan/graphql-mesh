export class TransformValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransformValidationError';
  }
}

/**
 * Rewrite Apollo Connectors `@connect` `$args.<name>` references after GraphQL
 * argument renames. Mesh stitching used `@source(name:)` for this; Connectors
 * bind args by the GraphQL argument name in path/body/query/headers expressions.
 */
export function rewriteConnectArgReferences(
  fieldDirectives: Record<string, any[]> | undefined,
  argRenameMap: Map<string, string>,
): Record<string, any[]> | undefined {
  if (!fieldDirectives?.connect?.length || argRenameMap.size === 0) {
    return fieldDirectives;
  }
  const rewriteExpr = (value: unknown): unknown => {
    if (typeof value !== 'string') {
      return value;
    }
    let out = value;
    for (const [from, to] of argRenameMap) {
      if (from === to) continue;
      out = out
        .replaceAll(`{$args.${from}}`, `{$args.${to}}`)
        .replaceAll(`$args.${from}`, `$args.${to}`);
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
