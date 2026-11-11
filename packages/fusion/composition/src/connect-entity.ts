/**
 * Federation Connectors entity helpers (shared contract).
 *
 * Used by fusion composition (`entity: true` / type-level `$this.<key>`) and by
 * REST loaders (selection stubs like `supplier: { id: supplierId }`) so both
 * sides agree on key/FK naming and stub shape.
 *
 * When a Query field arg name differs from the entity `@key` field (e.g.
 * `getPetById(petId)` → `Pet.id`), `entity: true` is invalid — Connectors
 * require arg names to match key fields. Apollo's pattern for that case is a
 * **type-level** `@connect` using `$this.<keyField>`:
 * https://www.apollographql.com/docs/graphos/connectors/entities/patterns
 *
 * Entity stubs across connectors:
 * https://www.apollographql.com/docs/graphos/connectors/entities/across-subgraphs
 */

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** Replace `$args.<keyArg>` with `$this.<keyField>` in Connectors path/body/header exprs. */
export function rewriteArgsToThis(value: string, keyArg: string, keyField: string): string {
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

/**
 * From a GET path template, find the entity key field whose `$args.<key>` appears
 * and exists on the return type (e.g. `/customers/{$args.id}` + type field `id`).
 */
export function entityKeyFieldsFromHttpPath(
  path: string,
  typeFieldNames: Iterable<string>,
): string[] | undefined {
  if (!path) {
    return undefined;
  }
  const pathWithoutQuery = path.split('?')[0];
  const fieldSet = typeFieldNames instanceof Set ? typeFieldNames : new Set(typeFieldNames);
  for (const key of fieldSet) {
    // Accept Connectors (`$args.id` / `{$args.id}`) and Mesh OpenAPI (`{args.id}`) forms.
    if (
      pathWithoutQuery.includes(`{$args.${key}}`) ||
      pathWithoutQuery.includes(`$args.${key}`) ||
      pathWithoutQuery.includes(`{args.${key}}`)
    ) {
      return [key];
    }
  }
  return undefined;
}

/**
 * Candidate parent JSON/GraphQL field names for a foreign key next to `fieldName`
 * (e.g. `supplier` → `supplierId`, `supplier_id`, …).
 */
export function parentFkFieldCandidates(fieldName: string, keyField = 'id'): string[] {
  const candidates = [
    `${fieldName}Id`,
    `${fieldName}_id`,
    `${fieldName}ID`,
    `${fieldName}_${keyField}`,
  ];
  if (keyField !== 'id') {
    candidates.push(`${fieldName}${keyField[0].toUpperCase()}${keyField.slice(1)}`);
  }
  return candidates;
}

/**
 * Infer ` { id: supplierId }` style entity-ref map when the parent has a scalar FK
 * beside an entity-typed object field. Composite keys need an explicit link map.
 */
export function inferEntityRefFromParentFkNames(
  parentFieldNames: Iterable<string>,
  fieldName: string,
  keyFields: string[],
): Record<string, string> | undefined {
  if (keyFields.length !== 1) {
    return undefined;
  }
  const keyField = keyFields[0];
  const parentSet =
    parentFieldNames instanceof Set ? parentFieldNames : new Set(parentFieldNames);
  for (const fromField of parentFkFieldCandidates(fieldName, keyField)) {
    if (parentSet.has(fromField)) {
      return { [keyField]: fromField };
    }
  }
  return undefined;
}

/**
 * Connectors selection fragment for an entity stub:
 * `supplier: { __typename: $("Supplier") id: supplierId }`
 */
export function formatEntityStubSelection(
  fieldName: string,
  entityTypeName: string,
  entityRef: Record<string, string>,
): string {
  const parts = [
    `__typename: $(${JSON.stringify(entityTypeName)})`,
    ...Object.entries(entityRef).map(([keyField, fromField]) =>
      keyField === fromField ? keyField : `${keyField}: ${fromField}`,
    ),
  ];
  return `${fieldName}: { ${parts.join(' ')} }`;
}
