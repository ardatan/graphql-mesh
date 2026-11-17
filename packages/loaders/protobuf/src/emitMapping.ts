import type { INamespace } from 'protobufjs';
import { walkToFindTypePath } from './utils.js';

/**
 * Emit typed protobuf mapping strings from protobufjs JSON namespace (loader-time only).
 * Output is indented and may include `#` comments for humans/AI; the transport parser skips them.
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
  field: {
    type?: string;
    rule?: string;
    keyType?: string;
    optional?: boolean;
    options?: Record<string, unknown>;
  },
  isOneofMember = false,
): string {
  const base = field.type || 'string';
  let token: string;
  if (field.keyType) {
    const keyTok = scalarOrEnumOrMessage(rootJson, pathWithName, field.keyType, 'key');
    const valTok = scalarOrEnumOrMessage(rootJson, pathWithName, base, 'value');
    token = `map<${keyTok},${valTok}>`;
  } else if (isScalar(base)) {
    token = base === 'bytes' ? 'bytes' : normalizeScalar(base);
  } else {
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
  // Proto3 explicit presence: `optional` / proto3_optional / oneof members — decoder must not default.
  if (isExplicitOptionalField(field, isOneofMember) && token !== 'message') {
    return `optional ${token}`;
  }
  return token;
}

function isExplicitOptionalField(
  field: {
    optional?: boolean;
    options?: Record<string, unknown>;
    rule?: string;
  },
  isOneofMember = false,
): boolean {
  if (field.rule === 'repeated') return false;
  if (isOneofMember) return true;
  if (field.options?.proto3_optional === true) return true;
  return false;
}

/** Field names that belong to any `oneof` on the message (including synthetic proto3_optional oneofs). */
function collectOneofFieldNames(typeJson: {
  oneofs?: Record<string, { oneof?: string[] }>;
}): Set<string> {
  const names = new Set<string>();
  const oneofs = typeJson?.oneofs;
  if (!oneofs) return names;
  for (const oneof of Object.values(oneofs)) {
    for (const fieldName of oneof?.oneof ?? []) {
      names.add(fieldName);
    }
  }
  return names;
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

function scalarOrEnumOrMessage(
  rootJson: INamespace,
  pathWithName: string[],
  t: string,
  role: 'key' | 'value',
): string {
  if (isScalar(t)) return normalizeScalar(t);
  const typePath = walkToFindTypePath(rootJson, pathWithName, t.split('.'));
  let cur: any = rootJson;
  for (const p of typePath) {
    cur = cur?.nested?.[p];
  }
  if (cur?.values) return emitEnumValues(rootJson, pathWithName, t);
  if (role === 'key') {
    // Map keys must be integral/bool/string — message keys are invalid protobuf.
    throw new Error(
      `protobuf map key type "${t}" resolved to a message; map keys must be scalar or enum`,
    );
  }
  return 'message';
}

export function emitFieldsMapping(
  rootJson: INamespace,
  pathWithName: string[],
  typeName: string,
  bindMode: 'relative' | 'prefix',
  bindPrefix = '',
  indent = '  ',
  /**
   * Ancestor message type keys on the current emit stack. Used to emit cycle-aware
   * `message&` / `message&N` refs instead of empty stubs (which drop nested recursive data).
   */
  visited: string[] = [],
): string {
  const typePath = walkToFindTypePath(rootJson, pathWithName, typeName.split('.'));
  const typeKey = typePath.join('.');
  let cur: any = rootJson;
  for (const p of typePath) {
    cur = cur?.nested?.[p];
  }
  const fields = cur?.fields as
    | Record<
        string,
        {
          type?: string;
          id?: number;
          rule?: string;
          keyType?: string;
          optional?: boolean;
          options?: Record<string, unknown>;
        }
      >
    | undefined;
  if (!fields) return '';

  // Resolve nested types from the owning message scope (`typePath`), not the RPC path.
  const nestedScope = typePath;
  const oneofFields = collectOneofFieldNames(cur);

  visited.push(typeKey);
  try {
    const lines: string[] = [];
    for (const [fieldName, field] of Object.entries(fields)) {
      const id = field.id ?? 0;
      const token = protoTypeToken(rootJson, nestedScope, field, oneofFields.has(fieldName));
      const bind = bindMode === 'prefix' && bindPrefix ? `${bindPrefix}.${fieldName}` : fieldName;
      const isMessageToken =
        token === 'message' || token === 'repeated message' || /map<[^,]+,message>/.test(token);
      if (isMessageToken && field.type) {
        const nestedType = field.type;
        const nestedTypePath = walkToFindTypePath(rootJson, nestedScope, nestedType.split('.'));
        const nestedKey = nestedTypePath.join('.');
        const cycleIdx = visited.indexOf(nestedKey);
        if (cycleIdx >= 0) {
          // Cycle-aware ref: `&` / `&N` = N message levels up (0 = enclosing).
          // Parser resolves these to shared field lists so child.child… round-trips.
          // Full named-type defs (`@TypeName`) are deferred; ancestor-relative refs are enough
          // for self- and mutual recursion on the emit stack.
          const levelsUp = visited.length - 1 - cycleIdx;
          const refTok = levelsUp === 0 ? 'message&' : `message&${levelsUp}`;
          const tokenWithRef = token.replace(/\bmessage\b/, refTok);
          lines.push(`${indent}${id}(${tokenWithRef}): ${bind}`);
          continue;
        }
        const nested = emitFieldsMapping(
          rootJson,
          nestedScope,
          nestedType,
          'relative',
          '',
          indent + '  ',
          visited,
        );
        lines.push(`${indent}${id}(${token}): ${bind} {`);
        if (nested) {
          lines.push(nested);
        }
        lines.push(`${indent}}`);
      } else {
        lines.push(`${indent}${id}(${token}): ${bind}`);
      }
    }
    return lines.join('\n');
  } finally {
    visited.pop();
  }
}

/** Request: GraphQL args use `input` wrapping the request message fields. */
export function emitRequestBody(
  rootJson: INamespace,
  pathWithName: string[],
  requestType: string,
): string {
  const inner = emitFieldsMapping(rootJson, pathWithName, requestType, 'prefix', 'input', '  ');
  const header = [
    '# Encode GraphQL field arguments into the protobuf request message.',
    '# Each line is fieldId(protoType): graphqlPath (relative to this field args).',
  ].join('\n');
  if (!inner.trim()) {
    return `${header}\n`;
  }
  return `${header}\n${inner}\n`;
}

export function emitResponseSelection(
  rootJson: INamespace,
  pathWithName: string[],
  responseType: string,
): string {
  const inner = emitFieldsMapping(rootJson, pathWithName, responseType, 'relative', '', '  ');
  const header = [
    '# Decode the protobuf response message into GraphQL fields.',
    '# Each line is fieldId(protoType): graphqlFieldName.',
  ].join('\n');
  if (!inner.trim()) {
    return `${header}\n`;
  }
  return `${header}\n${inner}\n`;
}
