import { Kind, visit, type ConstValueNode, type DocumentNode, type StringValueNode } from 'graphql';

/** Prefer GraphQL `"""` when the string has newlines or embedded `"`. */
export function stringValuePrefersBlock(value: string): boolean {
  return value.includes('\n') || value.includes('\r') || value.includes('"');
}

/**
 * After parse/print round-trips, StringValue nodes lose `block: true`. Remark
 * multiline / quote-heavy strings so the lean SG stays readable.
 */
export function preferBlockStringsInDocument(document: DocumentNode): DocumentNode {
  return visit(document, {
    StringValue(node: StringValueNode): StringValueNode {
      if (node.block || !stringValuePrefersBlock(node.value)) {
        return node;
      }
      return { ...node, block: true };
    },
  });
}

/**
 * Like `astFromValueUntyped`, but marks string values that contain newlines or
 * embedded `"` as GraphQL block strings (`"""…"""`) so `print` stays readable
 * inside `@join__directive(args: { … })` (thrift `args`/`selection`, connect
 * `body`/`selection`, sql mappings, …).
 */
export function astFromValuePreferBlockStrings(value: unknown): ConstValueNode | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'boolean') {
    return { kind: Kind.BOOLEAN, value };
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const asInt = Number.isInteger(value);
    return {
      kind: asInt ? Kind.INT : Kind.FLOAT,
      value: String(value),
    };
  }
  if (typeof value === 'string') {
    return { kind: Kind.STRING, value, block: stringValuePrefersBlock(value) };
  }
  if (Array.isArray(value)) {
    return {
      kind: Kind.LIST,
      values: value
        .map(item => astFromValuePreferBlockStrings(item))
        .filter((v): v is ConstValueNode => v != null),
    };
  }
  if (typeof value === 'object') {
    return {
      kind: Kind.OBJECT,
      fields: Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
        const childNode = astFromValuePreferBlockStrings(child);
        if (childNode == null) {
          return [];
        }
        return [
          {
            kind: Kind.OBJECT_FIELD as const,
            name: { kind: Kind.NAME as const, value: key },
            value: childNode,
          },
        ];
      }),
    };
  }
  return null;
}
