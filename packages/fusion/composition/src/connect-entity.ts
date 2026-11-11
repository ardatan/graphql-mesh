/**
 * Apollo Connectors entity helpers.
 *
 * When a Query field arg name differs from the entity `@key` field (e.g.
 * `getPetById(petId)` → `Pet.id`), `entity: true` is invalid — Connectors
 * require arg names to match key fields. Apollo's pattern for that case is a
 * **type-level** `@connect` using `$this.<keyField>`:
 * https://www.apollographql.com/docs/graphos/connectors/entities/patterns
 */

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** Replace `$args.<keyArg>` with `$this.<keyField>` in Connectors path/body/header exprs. */
export function rewriteArgsToThis(
  value: string,
  keyArg: string,
  keyField: string,
): string {
  if (!value || !keyArg) {
    return value;
  }
  // `$args.petId` and `{$args.petId}` (brace form is covered by the bare replace).
  return value.replaceAll(`$args.${keyArg}`, `$this.${keyField}`);
}

/**
 * Clone a field-level `@connect` into a type-level entity connector:
 * rewrite `$args.<keyArg>` → `$this.<keyField>`, drop `entity`.
 */
export function toTypeLevelEntityConnect(
  connectArgs: Record<string, any>,
  keyArg: string,
  keyField: string,
): Record<string, any> {
  const { entity: _entity, http, ...rest } = connectArgs;
  const nextHttp = http && typeof http === 'object' ? { ...http } : http;
  if (nextHttp && typeof nextHttp === 'object') {
    for (const method of HTTP_METHODS) {
      if (typeof nextHttp[method] === 'string') {
        nextHttp[method] = rewriteArgsToThis(nextHttp[method], keyArg, keyField);
      }
    }
    if (typeof nextHttp.queryParams === 'string') {
      nextHttp.queryParams = rewriteArgsToThis(nextHttp.queryParams, keyArg, keyField);
    }
    if (typeof nextHttp.body === 'string') {
      nextHttp.body = rewriteArgsToThis(nextHttp.body, keyArg, keyField);
    }
    if (Array.isArray(nextHttp.headers)) {
      nextHttp.headers = nextHttp.headers.map((h: any) =>
        h?.value != null
          ? { ...h, value: rewriteArgsToThis(String(h.value), keyArg, keyField) }
          : h,
      );
    }
  }
  return {
    ...rest,
    ...(nextHttp != null ? { http: nextHttp } : {}),
  };
}

/** True when type already has an equivalent type-level connect (same source + HTTP path). */
export function hasEquivalentTypeConnect(
  existing: Array<Record<string, any>> | undefined,
  candidate: Record<string, any>,
): boolean {
  if (!existing?.length) {
    return false;
  }
  const candPath = connectPrimaryPath(candidate);
  return existing.some(c => {
    if ((c.source || '') !== (candidate.source || '')) {
      return false;
    }
    return connectPrimaryPath(c) === candPath;
  });
}

function connectPrimaryPath(connectArgs: Record<string, any>): string {
  const http = connectArgs?.http;
  if (!http || typeof http !== 'object') {
    return '';
  }
  for (const method of HTTP_METHODS) {
    if (typeof http[method] === 'string') {
      return `${method}:${http[method]}`;
    }
  }
  return '';
}
