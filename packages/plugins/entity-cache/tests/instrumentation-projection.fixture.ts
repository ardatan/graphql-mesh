import {
  getNamedType,
  isObjectType,
  Kind,
  print,
  type FieldNode,
  type GraphQLSchema,
  type SelectionSetNode,
} from 'graphql';
import type { EntityProjection } from '../src/types.js';

type Shape = { source: string; target: string; child?: Shape[] };
// #9658: these exact instrumentation aliases select canonical fields, not private metadata.
const target = (field: FieldNode) =>
  (field.alias?.value === '__responseCacheTypeName' && field.name.value === '__typename') ||
  (field.alias?.value === '__responseCacheId' && field.name.value === 'documentId')
    ? field.name.value
    : (field.alias?.value ?? field.name.value);

/** #9658: keep schema fingerprint, field sufficiency, arguments/directives and caller aliases intact. */
export function instrumentationProjection(
  field: FieldNode,
  schema: GraphQLSchema,
): EntityProjection | null {
  const definition = schema.getQueryType()?.getFields()[field.name.value];
  if (!definition || !field.selectionSet) return null;
  const build = (
    set: SelectionSetNode,
    type: ReturnType<typeof getNamedType>,
  ): { set: SelectionSetNode; shape: Shape[] } | null => {
    if (!isObjectType(type)) return null;
    const fields: FieldNode[] = [],
      shape: Shape[] = [];
    const responses = new Set<string>(),
      canonical = new Map<string, string>();
    for (const node of set.selections) {
      if (node.kind !== Kind.FIELD) return null;
      const source = node.alias?.value ?? node.name.value,
        name = target(node);
      if (responses.has(source)) return null;
      responses.add(source);
      const def = type.getFields()[node.name.value];
      if (!def && node.name.value !== '__typename') return null;
      const child =
        node.selectionSet && def ? build(node.selectionSet, getNamedType(def.type)) : undefined;
      if (node.selectionSet && !child) return null;
      const normalized: FieldNode = {
        ...node,
        alias: name === node.name.value ? undefined : node.alias,
        arguments:
          node.arguments &&
          [...node.arguments].sort((a, b) => a.name.value.localeCompare(b.name.value)),
        ...(child ? { selectionSet: child.set } : {}),
      };
      const signature = print(normalized),
        existing = canonical.get(name);
      // Multiple equivalent instrumentation selections are safe; conflicting aliases bypass.
      if (existing && existing !== signature) return null;
      if (!existing) {
        canonical.set(name, signature);
        fields.push(normalized);
      }
      shape.push({ source, target: name, ...(child ? { child: child.shape } : {}) });
    }
    fields.sort((a, b) => print(a).localeCompare(print(b)));
    return { set: { ...set, selections: fields }, shape };
  };
  const value = build(field.selectionSet, getNamedType(definition.type));
  if (!value) return null;
  const map = (row: unknown, shape: Shape[], encode: boolean): unknown => {
    if (row == null) return row;
    if (Array.isArray(row)) return row.map(item => map(item, shape, encode));
    if (typeof row !== 'object') throw new Error('invalid canonical entity projection');
    const input = row as Record<string, unknown>,
      output: Record<string, unknown> = {};
    for (const field of shape) {
      const from = encode ? field.source : field.target,
        to = encode ? field.target : field.source;
      if (!Object.prototype.hasOwnProperty.call(input, from)) continue; // conditional fields stay absent
      const result = field.child ? map(input[from], field.child, encode) : input[from];
      if (
        Object.prototype.hasOwnProperty.call(output, to) &&
        JSON.stringify(output[to]) !== JSON.stringify(result)
      )
        throw new Error('conflicting canonical instrumentation values');
      Object.defineProperty(output, to, {
        value: result,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return output;
  };
  return {
    key: print({ ...field, alias: undefined, arguments: [], selectionSet: value.set }),
    encode: row => map(row, value.shape, true),
    decode: row => map(row, value.shape, false),
  };
}
