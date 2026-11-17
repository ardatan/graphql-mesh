import type { INamespace } from 'protobufjs';
import { walkToFindTypePath } from './utils.js';

/**
 * Emit typed protobuf mapping strings from protobufjs JSON namespace (loader-time only).
 */

export function emitEnumValues(
  rootJson: INamespace,
  pathWithName: string[],
  typeName: string,
): string {
  const typePath = walkToFindTypePath(rootJson, pathWithName, typeName.split('.'));
  let cur: any = rootJson;
  for (const p of typePath) {
    cur = cur?.nested?.[p];
  }
  if (!cur?.values) {
    return 'enum{}';
  }
  const parts = Object.entries(cur.values as Record<string, number>).map(
    ([name, num]) => `${name}=${num}`,
  );
  return `enum{${parts.join(',')}}`;
}

export function protoTypeToken(
  rootJson: INamespace,
  pathWithName: string[],
  field: { type?: string; rule?: string; keyType?: string },
): string {
  const base = field.type || 'string';
  let token: string;
  if (field.keyType) {
    token = `map<${scalarOrEnum(rootJson, pathWithName, field.keyType)},${scalarOrEnum(rootJson, pathWithName, base)}>`;
  } else if (isScalar(base)) {
    token = base === 'bytes' ? 'bytes' : normalizeScalar(base);
  } else {
    // enum or message
    const typePath = walkToFindTypePath(rootJson, pathWithName, base.split('.'));
    let cur: any = rootJson;
    for (const p of typePath) {
      cur = cur?.nested?.[p];
    }
    if (cur?.values) {
      token = emitEnumValues(rootJson, pathWithName, base);
    } else {
      token = 'message';
    }
  }
  if (field.rule === 'repeated') {
    return `repeated ${token}`;
  }
  return token;
}

function isScalar(t: string): boolean {
  return [
    'double',
    'float',
    'int32',
    'int64',
    'uint32',
    'uint64',
    'sint32',
    'sint64',
    'fixed32',
    'fixed64',
    'sfixed32',
    'sfixed64',
    'bool',
    'string',
    'bytes',
  ].includes(t);
}

function normalizeScalar(t: string): string {
  return t;
}

function scalarOrEnum(
  rootJson: INamespace,
  pathWithName: string[],
  t: string,
): string {
  if (isScalar(t)) return normalizeScalar(t);
  const typePath = walkToFindTypePath(rootJson, pathWithName, t.split('.'));
  let cur: any = rootJson;
  for (const p of typePath) {
    cur = cur?.nested?.[p];
  }
  if (cur?.values) return emitEnumValues(rootJson, pathWithName, t);
  return 'string';
}

export function emitFieldsMapping(
  rootJson: INamespace,
  pathWithName: string[],
  typeName: string,
  bindMode: 'relative' | 'prefix',
  bindPrefix = '',
  indent = '  ',
): string {
  const typePath = walkToFindTypePath(rootJson, pathWithName, typeName.split('.'));
  let cur: any = rootJson;
  for (const p of typePath) {
    cur = cur?.nested?.[p];
  }
  const fields = cur?.fields as
    | Record<string, { type?: string; id?: number; rule?: string; keyType?: string }>
    | undefined;
  if (!fields) return '';
  const lines: string[] = [];
  for (const [fieldName, field] of Object.entries(fields)) {
    const id = field.id ?? 0;
    const token = protoTypeToken(rootJson, pathWithName, field);
    const bind =
      bindMode === 'prefix' && bindPrefix
        ? `${bindPrefix}.${fieldName}`
        : fieldName;
    if (token === 'message' || token === 'repeated message') {
      const nestedType = field.type!;
      const nested = emitFieldsMapping(
        rootJson,
        pathWithName,
        nestedType,
        'relative',
        '',
        indent + '  ',
      );
      lines.push(`${indent}${id}(${token}): ${bind} {\n${nested}\n${indent}}`);
    } else {
      lines.push(`${indent}${id}(${token}): ${bind}`);
    }
  }
  return lines.join('\n');
}

/** Request: GraphQL args use `input` wrapping the request message fields. */
export function emitRequestBody(
  rootJson: INamespace,
  pathWithName: string[],
  requestType: string,
): string {
  const inner = emitFieldsMapping(
    rootJson,
    pathWithName,
    requestType,
    'prefix',
    'input',
    '  ',
  );
  // Request message fields are the top-level encode fields (ids of request type)
  return inner.trim();
}

export function emitResponseSelection(
  rootJson: INamespace,
  pathWithName: string[],
  responseType: string,
): string {
  return emitFieldsMapping(
    rootJson,
    pathWithName,
    responseType,
    'relative',
    '',
    '  ',
  ).trim();
}
