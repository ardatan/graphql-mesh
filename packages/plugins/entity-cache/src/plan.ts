// #9658: this adapter targets Node 20 and requires cryptographic fence/key identities.
// eslint-disable-next-line import/no-nodejs-modules
import { createHash } from 'node:crypto';
import {
  astFromValue,
  getArgumentValues,
  getVariableValues,
  isInputObjectType,
  isInputType,
  isListType,
  isNonNullType,
  isScalarType,
  isSpecifiedScalarType,
  Kind,
  print,
  printSchema,
  typeFromAST,
  visit,
  type DocumentNode,
  type FieldNode,
  type GraphQLInputType,
  type GraphQLSchema,
} from 'graphql';
import type { ExecutionRequest } from '@graphql-tools/utils';
import { cloneEntityValue } from './policy.js';
import type { EntityRule } from './types.js';

export const hash = (value: unknown): string =>
  createHash('sha256').update(stable(value)).digest('hex');
export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    // #9658: custom scalars may coerce to Date/classes. Their empty enumerable shape is not identity.
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
      throw new Error('unsupported entity cache key value');
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(',')}}`;
  }
  if (
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint' ||
    (typeof value === 'number' && !Number.isFinite(value))
  )
    throw new Error('unsupported entity cache key value');
  return JSON.stringify(value) ?? 'undefined';
}
const fingerprints = new WeakMap<GraphQLSchema, string>();

// #9658: custom scalar parseValue/serialize/parseLiteral hooks need not round-trip, even for strings.
function safeInput(type: GraphQLInputType, value: unknown): boolean {
  if (value == null) return true;
  if (isNonNullType(type)) return safeInput(type.ofType, value);
  if (isListType(type))
    return Array.isArray(value) && value.every(item => safeInput(type.ofType, item));
  if (isScalarType(type)) return isSpecifiedScalarType(type);
  if (isInputObjectType(type)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const fields = type.getFields();
    return Object.entries(value).every(
      ([key, item]) => fields[key] && safeInput(fields[key].type, item),
    );
  }
  return true; // enum input serialization preserves its internal value through the declared enum name
}

// #9658: normalize using the executing subgraph's defaults and variable coercion, not AST text alone.
export function planEntityBatch(
  request: ExecutionRequest,
  schema: GraphQLSchema,
  rule: EntityRule,
) {
  // #9658: a key-batch mapping alone cannot prove that pagination did not truncate identity groups.
  if (typeof rule.isComplete !== 'function') return null;
  const operations = request.document.definitions.filter(d => d.kind === Kind.OPERATION_DEFINITION);
  if (operations.length !== 1) return null;
  const operation = operations[0];
  if (
    operation.kind !== Kind.OPERATION_DEFINITION ||
    operation.operation !== 'query' ||
    operation.selectionSet.selections.length !== 1
  )
    return null;
  const field = operation.selectionSet.selections[0];
  if (field.kind !== Kind.FIELD || field.name.value !== rule.field || !field.selectionSet)
    return null;
  if (field.directives?.length || operation.directives?.length) return null;
  // Fragment support requires an explicit authorization walker; conservatively bypass here.
  if (request.document.definitions.length !== 1 || !rule.selection(field, schema)) return null;
  const scope = rule.scope(request);
  if (typeof scope !== 'string' || !scope || scope.length > 256) return null;
  const definition = schema.getQueryType()?.getFields()[rule.field];
  if (!definition) return null;
  // #9658: an invalid root argument must not become a hit for an earlier valid request.
  const names = field.arguments?.map(argument => argument.name.value) ?? [];
  if (
    new Set(names).size !== names.length ||
    names.some(name => !definition.args.some(argument => argument.name === name))
  )
    return null;
  const coerced = getVariableValues(
    schema,
    operation.variableDefinitions ?? [],
    request.variables ?? {},
  );
  if (coerced.errors) return null;
  const variables = coerced.coerced;
  let args: Record<string, unknown>;
  try {
    args = getArgumentValues(definition, field, variables);
  } catch {
    return null;
  }
  if (definition.args.some(arg => !safeInput(arg.type, args[arg.name]))) return null;
  const maxBatchSize = rule.maxBatchSize ?? 1000;
  if (!Number.isSafeInteger(maxBatchSize) || maxBatchSize <= 0) return null;
  const mapping = rule.batch(args);
  if (
    !mapping ||
    !mapping.keys.length ||
    mapping.keys.length > maxBatchSize ||
    !mapping.keys.every(k => typeof k === 'string' && k.length > 0 && k.length <= 256) ||
    // #9658: duplicate-key input may produce duplicate rows; preserve its original source semantics.
    new Set(mapping.keys).size !== mapping.keys.length
  )
    return null;
  const keys = [...new Set(mapping.keys)];
  // #9658: a full-key rewrite must preserve native arguments, including its original result cap.
  try {
    if (stable(mapping.withKeys(keys)) !== stable(args)) return null;
  } catch {
    return null;
  }
  const identityField = rule.identityField;
  const selectedIdentity =
    identityField &&
    field.selectionSet.selections.some(
      s => s.kind === Kind.FIELD && s.name.value === identityField && !s.alias,
    );
  if (
    identityField &&
    field.selectionSet.selections.some(
      s =>
        s.kind === Kind.FIELD && s.alias?.value === identityField && s.name.value !== identityField,
    )
  )
    return null;
  const injectedIdentity = identityField && !selectedIdentity ? identityField : null;
  let fingerprint = fingerprints.get(schema);
  if (!fingerprint) {
    fingerprint = hash(printSchema(schema));
    fingerprints.set(schema, fingerprint);
  }
  const used = new Set<string>();
  visit(
    { ...field, arguments: [] },
    {
      Variable(node) {
        used.add(node.name.value);
      },
    },
  );
  visit(
    {
      ...operation,
      selectionSet: { kind: Kind.SELECTION_SET, selections: [] },
      variableDefinitions: [],
    },
    {
      Variable(node) {
        used.add(node.name.value);
      },
    },
  );
  if (
    (operation.variableDefinitions ?? []).some(definition => {
      if (!used.has(definition.variable.name.value)) return false;
      const type = typeFromAST(schema, definition.type);
      return (
        !type || !isInputType(type) || !safeInput(type, variables[definition.variable.name.value])
      );
    })
  )
    return null;
  const selection = hash({
    schema: fingerprint,
    revision: rule.revision,
    field: rule.field,
    selection: print({ ...field, alias: undefined, arguments: [] }),
    operationDirectives: operation.directives,
    variables: Object.fromEntries([...used].sort().map(k => [k, variables[k]])),
    args: mapping.withKeys([]),
  });
  const partition = hash([rule.source, rule.entityType, scope]);
  const withKeys = (subset: string[]): ExecutionRequest => {
    const rewrittenArgs = mapping.withKeys(subset);
    const rewritten: FieldNode = {
      ...field,
      selectionSet: injectedIdentity
        ? {
            ...field.selectionSet!,
            selections: [
              ...field.selectionSet!.selections,
              { kind: Kind.FIELD, name: { kind: Kind.NAME, value: injectedIdentity } },
            ],
          }
        : field.selectionSet,
      arguments: definition.args
        .filter(a => rewrittenArgs[a.name] !== undefined)
        .map(a => ({
          kind: Kind.ARGUMENT,
          name: { kind: Kind.NAME, value: a.name },
          value: astFromValue(rewrittenArgs[a.name], a.type)!,
        })),
    };
    const remaining = new Set<string>();
    visit(rewritten, {
      Variable(node) {
        remaining.add(node.name.value);
      },
    });
    for (const directive of operation.directives ?? [])
      visit(directive, {
        Variable(node) {
          remaining.add(node.name.value);
        },
      });
    const document: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [
        {
          ...operation,
          variableDefinitions: operation.variableDefinitions?.filter(v =>
            remaining.has(v.variable.name.value),
          ),
          selectionSet: { kind: Kind.SELECTION_SET, selections: [rewritten] },
        },
      ],
    };
    // Retain raw selection inputs; re-coercing already coerced values can change enums and scalars.
    return { ...request, document, variables: request.variables };
  };
  const project = (row: unknown) => {
    const copy = cloneEntityValue(row);
    if (!injectedIdentity || !copy || typeof copy !== 'object' || Array.isArray(copy)) return copy;
    delete (copy as Record<string, unknown>)[injectedIdentity];
    return copy;
  };
  const isComplete = (rows: unknown[], requestedKeys?: string[]): boolean => {
    try {
      // A miss subset executes rewritten args; aggregate/original requests keep original args.
      const effectiveArgs = requestedKeys ? mapping.withKeys(requestedKeys) : args;
      return rule.isComplete!(rows, requestedKeys ?? keys, effectiveArgs) === true;
    } catch {
      return false;
    }
  };
  return {
    isComplete,
    keys,
    scope,
    partition,
    selection,
    responseKey: field.alias?.value ?? rule.field,
    withKeys,
    project,
    injectedIdentity,
  };
}
