import type { JSONSchemaObject } from 'json-machete';
import { splitTopLevelEntries } from './addExecutionLogicToComposer.js';
import type { JSONSchemaOperationConfig, SchemaFieldsMode } from './types.js';
import { getOperationMetadata } from './utils.js';

/** Nested selection: `null` = leaf (do not constrain nested object props). */
export type SelectionFieldTree = Map<string, SelectionFieldTree | null>;

/**
 * Parse a Connectors-style field selection into a name tree.
 * Returns `null` when the selection means “emit everything” (`$`, expressions-only, empty).
 */
export function parseSelectionFieldTree(selection: string): SelectionFieldTree | null {
  const trimmed = selection.trim();
  if (!trimmed || trimmed === '$' || trimmed === '$root') {
    return null;
  }
  // Whole-value / root expressions are not field lists.
  if (trimmed.startsWith('$') && !/^[A-Za-z_]/.test(trimmed)) {
    return null;
  }
  const tree: SelectionFieldTree = new Map();
  let parsedAny = false;
  for (const entry of splitTopLevelEntries(trimmed)) {
    const parsed = parseSelectionEntry(entry);
    if (!parsed) {
      continue;
    }
    parsedAny = true;
    const existing = tree.get(parsed.name);
    if (parsed.nested == null) {
      if (existing === undefined) {
        tree.set(parsed.name, null);
      }
      continue;
    }
    const nestedTree = parseSelectionFieldTree(parsed.nested);
    if (!nestedTree) {
      tree.set(parsed.name, null);
      continue;
    }
    if (existing instanceof Map) {
      for (const [k, v] of nestedTree) {
        if (!existing.has(k)) {
          existing.set(k, v);
        } else if (v instanceof Map && existing.get(k) instanceof Map) {
          mergeTrees(existing.get(k) as SelectionFieldTree, v);
        } else if (v instanceof Map) {
          existing.set(k, v);
        }
      }
    } else {
      tree.set(parsed.name, nestedTree);
    }
  }
  return parsedAny && tree.size > 0 ? tree : null;
}

function mergeTrees(target: SelectionFieldTree, source: SelectionFieldTree): void {
  for (const [k, v] of source) {
    if (!target.has(k)) {
      target.set(k, v);
    } else if (v instanceof Map && target.get(k) instanceof Map) {
      mergeTrees(target.get(k) as SelectionFieldTree, v);
    } else if (v instanceof Map) {
      target.set(k, v);
    }
  }
}

function parseSelectionEntry(
  entry: string,
): { name: string; nested: string | null } | null {
  const t = entry.trim();
  if (!t || t.startsWith('__typename')) {
    return null;
  }
  const brace = t.match(/^([A-Za-z_][\w]*)\s*\{([\s\S]*)\}\s*$/);
  if (brace) {
    return { name: brace[1], nested: brace[2] };
  }
  const colon = t.match(/^([A-Za-z_][\w]*)\s*:\s*([\s\S]+)$/);
  if (colon) {
    const rhs = colon[2].trim();
    const rhsBrace = rhs.match(/^([A-Za-z_][\w]*)\s*\{([\s\S]*)\}\s*$/);
    if (rhsBrace) {
      return { name: rhsBrace[1], nested: rhsBrace[2] };
    }
    if (/^[A-Za-z_][\w]*$/.test(rhs)) {
      return { name: rhs, nested: null };
    }
    // `field: $expr` — GraphQL / JSON field is the LHS.
    return { name: colon[1], nested: null };
  }
  if (/^[A-Za-z_][\w]*$/.test(t)) {
    return { name: t, nested: null };
  }
  return null;
}

function shouldPruneOperationToSelection(
  operation: JSONSchemaOperationConfig,
  loaderSchemaFields?: SchemaFieldsMode,
): boolean {
  const mode = ('schemaFields' in operation ? operation.schemaFields : undefined) ?? loaderSchemaFields;
  if (mode === 'all') {
    return false;
  }
  if (mode === 'selection') {
    return true;
  }
  // Default: auto when a concrete field selection is present.
  const selection =
    'selection' in operation && typeof operation.selection === 'string'
      ? operation.selection
      : undefined;
  if (!selection?.trim()) {
    return false;
  }
  return parseSelectionFieldTree(selection) != null;
}

/**
 * Restrict object `properties` on the dereferenced operations schema so GraphQL
 * emit never creates fields/types outside each operation's `selection`.
 *
 * Shared `$ref` targets accumulate a **union** of allowed properties across ops.
 * Schema nodes never reached by a pruned selection are left intact but unused
 * by the composer (no GraphQL types emitted for them).
 */
export function pruneJsonSchemaBySelection(
  schema: JSONSchemaObject,
  operations: JSONSchemaOperationConfig[],
  loaderSchemaFields?: SchemaFieldsMode,
): void {
  const allowedProps = new WeakMap<object, Set<string>>();

  for (const operation of operations) {
    if (!shouldPruneOperationToSelection(operation, loaderSchemaFields)) {
      continue;
    }
    const selection =
      'selection' in operation && typeof operation.selection === 'string'
        ? operation.selection
        : '';
    const tree = parseSelectionFieldTree(selection);
    if (!tree) {
      continue;
    }
    const { operationType, fieldName } = getOperationMetadata(operation);
    const root = schema.properties?.[operationType] as JSONSchemaObject | undefined;
    const fieldSchema = root?.properties?.[fieldName] as JSONSchemaObject | undefined;
    if (!fieldSchema) {
      continue;
    }
    collectAllowedProperties(fieldSchema, tree, allowedProps);
  }

  applyAllowedProperties(schema, allowedProps, new WeakSet());
}

function unwrapSchemaNode(schema: JSONSchemaObject): JSONSchemaObject {
  let node = schema;
  // Collapse trivial wrappers so property maps match composer behavior.
  for (let i = 0; i < 5; i++) {
    if (node.items && typeof node.items === 'object' && !Array.isArray(node.items) && !node.properties) {
      node = node.items as JSONSchemaObject;
      continue;
    }
    if (Array.isArray(node.anyOf) && node.anyOf.length === 1) {
      node = node.anyOf[0] as JSONSchemaObject;
      continue;
    }
    if (Array.isArray(node.oneOf) && node.oneOf.length === 1) {
      node = node.oneOf[0] as JSONSchemaObject;
      continue;
    }
    break;
  }
  return node;
}

function collectAllowedProperties(
  schema: JSONSchemaObject,
  tree: SelectionFieldTree | null,
  allowedProps: WeakMap<object, Set<string>>,
): void {
  if (tree == null) {
    // Leaf in selection: do not constrain nested properties.
    return;
  }
  const node = unwrapSchemaNode(schema);
  if (node.items && typeof node.items === 'object' && !Array.isArray(node.items)) {
    collectAllowedProperties(node.items as JSONSchemaObject, tree, allowedProps);
  }
  if (Array.isArray(node.anyOf)) {
    for (const branch of node.anyOf) {
      if (branch && typeof branch === 'object') {
        collectAllowedProperties(branch as JSONSchemaObject, tree, allowedProps);
      }
    }
  }
  if (Array.isArray(node.oneOf)) {
    for (const branch of node.oneOf) {
      if (branch && typeof branch === 'object') {
        collectAllowedProperties(branch as JSONSchemaObject, tree, allowedProps);
      }
    }
  }
  if (!node.properties || typeof node.properties !== 'object') {
    return;
  }
  let set = allowedProps.get(node);
  if (!set) {
    set = new Set();
    allowedProps.set(node, set);
  }
  for (const [fieldName, nested] of tree) {
    set.add(fieldName);
    const prop = node.properties[fieldName] as JSONSchemaObject | undefined;
    if (prop && nested) {
      collectAllowedProperties(prop, nested, allowedProps);
    } else if (prop && nested === null) {
      collectAllowedProperties(prop, null, allowedProps);
    }
  }
}

function applyAllowedProperties(
  schema: unknown,
  allowedProps: WeakMap<object, Set<string>>,
  seen: WeakSet<object>,
): void {
  if (!schema || typeof schema !== 'object' || seen.has(schema as object)) {
    return;
  }
  seen.add(schema as object);
  const node = schema as JSONSchemaObject;
  const allowed = allowedProps.get(node);
  if (allowed && node.properties && typeof node.properties === 'object') {
    for (const key of Object.keys(node.properties)) {
      if (!allowed.has(key)) {
        delete node.properties[key];
      }
    }
    // Keep `required` in sync — composer makeFieldNonNull walks required names
    // and getField() throws if a required prop was pruned away (e.g. FHIR
    // Patient.resourceType).
    if (Array.isArray(node.required)) {
      node.required = node.required.filter(name => allowed.has(String(name)));
    }
  }
  if (node.properties) {
    for (const value of Object.values(node.properties)) {
      applyAllowedProperties(value, allowedProps, seen);
    }
  }
  if (node.items) {
    applyAllowedProperties(node.items, allowedProps, seen);
  }
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    const list = node[key];
    if (Array.isArray(list)) {
      for (const item of list) {
        applyAllowedProperties(item, allowedProps, seen);
      }
    }
  }
}
