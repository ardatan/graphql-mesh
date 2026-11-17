import { TType } from '@creditkarma/thrift-server-core';
import type { TypeMap, TypeVal } from '@graphql-mesh/transport-thrift';

export type ThriftProtocol = 'binary' | 'compact' | 'json';

const WIRE_TYPE_TOKEN: Partial<Record<TType, string>> = {
  [TType.BOOL]: 'bool',
  [TType.BYTE]: 'byte',
  [TType.I16]: 'i16',
  [TType.I32]: 'i32',
  [TType.I64]: 'i64',
  [TType.DOUBLE]: 'double',
  [TType.STRING]: 'string',
  [TType.STRUCT]: 'struct',
  [TType.LIST]: 'list',
  [TType.SET]: 'set',
  [TType.MAP]: 'map',
  [TType.VOID]: 'void',
};

/** TJSONProtocol type tags used inside typed field wrappers. */
const TJSON_TYPE_TAG: Partial<Record<TType, string>> = {
  [TType.BOOL]: 'tf',
  [TType.BYTE]: 'i8',
  [TType.I16]: 'i16',
  [TType.I32]: 'i32',
  [TType.I64]: 'i64',
  [TType.DOUBLE]: 'dbl',
  [TType.STRING]: 'str',
  [TType.STRUCT]: 'rec',
  [TType.LIST]: 'lst',
  [TType.SET]: 'set',
  [TType.MAP]: 'map',
};

export function wireTypeToken(typeVal: TypeVal, topTypeMap: TypeMap): string {
  if (typeVal.type === 'ref') {
    const resolved = topTypeMap[typeVal.name];
    if (!resolved) {
      return 'struct';
    }
    return wireTypeToken(resolved, topTypeMap);
  }
  if (typeVal.type === TType.LIST) {
    const elem = wireTypeToken(typeVal.elementType, topTypeMap);
    return elem === 'struct' ? 'list' : `list<${elem}>`;
  }
  if (typeVal.type === TType.SET) {
    const elem = wireTypeToken(typeVal.elementType, topTypeMap);
    return `set<${elem}>`;
  }
  if (typeVal.type === TType.MAP) {
    return `map<${wireTypeToken(typeVal.keyType, topTypeMap)}, ${wireTypeToken(typeVal.valType, topTypeMap)}>`;
  }
  return WIRE_TYPE_TOKEN[typeVal.type] || 'struct';
}

function resolveTypeVal(typeVal: TypeVal, topTypeMap: TypeMap, stack: Set<string> = new Set()): TypeVal {
  if (typeVal.type === 'ref') {
    if (stack.has(typeVal.name)) {
      return { type: TType.STRUCT, name: typeVal.name, fields: {}, id: typeVal.id };
    }
    const resolved = topTypeMap[typeVal.name];
    if (!resolved) {
      // Unknown typedef/import — treat as i32 (common scalar typedef fallback).
      return { type: TType.I32, id: typeVal.id };
    }
    const next = new Set(stack);
    next.add(typeVal.name);
    return resolveTypeVal({ ...resolved, id: typeVal.id ?? resolved.id }, topTypeMap, next);
  }
  return typeVal;
}

function tjsonTypeTag(typeVal: TypeVal, topTypeMap: TypeMap): string {
  const resolved = resolveTypeVal(typeVal, topTypeMap);
  return TJSON_TYPE_TAG[resolved.type as TType] || 'rec';
}

function indent(level: number): string {
  return '  '.repeat(level);
}

/**
 * Compact `@thrift__method(args:)` — Thrift-id first.
 * Example:
 * ```
 * 1(struct): $args.request {
 *   1(i32): left
 *   2(i32): right
 * }
 * ```
 */
export function buildCompactArgs(
  fieldTypeMap: TypeMap,
  topTypeMap: TypeMap,
  argsPathPrefix = '$args',
): string {
  const lines: string[] = [];
  for (const [argName, typeVal] of Object.entries(fieldTypeMap)) {
    lines.push(...formatCompactArgField(typeVal, argName, topTypeMap, 0, `${argsPathPrefix}.${argName}`));
  }
  return lines.join('\n');
}

function formatCompactArgField(
  typeVal: TypeVal,
  graphqlName: string,
  topTypeMap: TypeMap,
  level: number,
  valueExpr: string,
  seenStructs: Set<string> = new Set(),
): string[] {
  const id = typeVal.id ?? 1;
  const resolved = resolveTypeVal(typeVal, topTypeMap);
  const token = wireTypeToken(typeVal, topTypeMap);
  const pad = indent(level);

  if (resolved.type === TType.STRUCT) {
    const structName = resolved.name || graphqlName;
    if (seenStructs.has(structName)) {
      // Recursive struct — emit shell only (avoid infinite expansion).
      return [`${pad}${id}(struct): ${level === 0 ? valueExpr : graphqlName}`];
    }
    const nextSeen = new Set(seenStructs);
    nextSeen.add(structName);
    const lines = [`${pad}${id}(struct): ${graphqlName.startsWith('$') ? graphqlName : valueExpr} {`];
    for (const [fieldName, fieldType] of Object.entries(resolved.fields)) {
      lines.push(
        ...formatCompactArgField(fieldType, fieldName, topTypeMap, level + 1, fieldName, nextSeen),
      );
    }
    lines.push(`${pad}}`);
    return lines;
  }

  if (resolved.type === TType.LIST && resolveTypeVal(resolved.elementType, topTypeMap).type === TType.STRUCT) {
    const elem = resolveTypeVal(resolved.elementType, topTypeMap) as Extract<
      TypeVal,
      { type: TType.STRUCT }
    >;
    const lines = [`${pad}${id}(list): ${graphqlName.startsWith('$') ? valueExpr : graphqlName} {`];
    for (const [fieldName, fieldType] of Object.entries(elem.fields)) {
      lines.push(...formatCompactArgField(fieldType, fieldName, topTypeMap, level + 1, fieldName));
    }
    lines.push(`${pad}}`);
    return lines;
  }

  // For root args use `$args.name`; nested struct fields use bare GraphQL field names.
  const rhs = level === 0 ? valueExpr : graphqlName;
  return [`${pad}${id}(${token}): ${rhs}`];
}

/**
 * Compact `@thrift__method(selection:)` — GraphQL-field first / scalar `$(wire)`.
 */
export function buildCompactSelection(
  returnTypeVal: TypeVal | undefined,
  topTypeMap: TypeMap,
): string {
  if (!returnTypeVal) {
    return '$(void)';
  }
  const resolved = resolveTypeVal(returnTypeVal, topTypeMap);
  if (resolved.type !== TType.STRUCT) {
    return `$(${wireTypeToken(returnTypeVal, topTypeMap)})`;
  }
  const lines: string[] = [];
  for (const [fieldName, fieldType] of Object.entries(resolved.fields)) {
    lines.push(...formatCompactSelectionField(fieldName, fieldType, topTypeMap, 0));
  }
  return lines.join('\n');
}

function formatCompactSelectionField(
  graphqlName: string,
  typeVal: TypeVal,
  topTypeMap: TypeMap,
  level: number,
  seenStructs: Set<string> = new Set(),
): string[] {
  const id = typeVal.id ?? 1;
  const resolved = resolveTypeVal(typeVal, topTypeMap);
  const token = wireTypeToken(typeVal, topTypeMap);
  const pad = indent(level);

  if (resolved.type === TType.STRUCT) {
    const structName = resolved.name || graphqlName;
    if (seenStructs.has(structName)) {
      return [`${pad}${graphqlName}: ${id}(struct)`];
    }
    const nextSeen = new Set(seenStructs);
    nextSeen.add(structName);
    const lines = [`${pad}${graphqlName}: ${id} {`];
    for (const [fieldName, fieldType] of Object.entries(resolved.fields)) {
      lines.push(
        ...formatCompactSelectionField(fieldName, fieldType, topTypeMap, level + 1, nextSeen),
      );
    }
    lines.push(`${pad}}`);
    return lines;
  }

  if (resolved.type === TType.LIST && resolveTypeVal(resolved.elementType, topTypeMap).type === TType.STRUCT) {
    const elem = resolveTypeVal(resolved.elementType, topTypeMap) as Extract<
      TypeVal,
      { type: TType.STRUCT }
    >;
    const lines = [`${pad}${graphqlName}: ${id}(list) {`];
    for (const [fieldName, fieldType] of Object.entries(elem.fields)) {
      lines.push(...formatCompactSelectionField(fieldName, fieldType, topTypeMap, level + 1));
    }
    lines.push(`${pad}}`);
    return lines;
  }

  return [`${pad}${graphqlName}: ${id}(${token})`];
}

export function buildThriftMethodDescription(opts: {
  serviceName?: string;
  methodName: string;
  fieldTypeMap: TypeMap;
  returnTypeVal?: TypeVal;
  topTypeMap: TypeMap;
  protocol: ThriftProtocol;
}): string {
  const fieldLines = Object.entries(opts.fieldTypeMap).map(([name, typeVal]) => {
    const id = typeVal.id ?? '?';
    return `  - ${id} = ${name} (${wireTypeToken(typeVal, opts.topTypeMap)})`;
  });
  const returnTok = opts.returnTypeVal
    ? wireTypeToken(opts.returnTypeVal, opts.topTypeMap)
    : 'void';
  return [
    `Thrift ${opts.protocol} RPC`,
    opts.serviceName ? `service: ${opts.serviceName}` : 'service: (single-service endpoint)',
    `method: ${opts.methodName}`,
    'args field ids:',
    ...(fieldLines.length ? fieldLines : ['  (none)']),
    `success wire type: ${returnTok} (result field id 0)`,
  ].join('\n');
}

/**
 * TJSON `@connect(http.body:)` — Apollo `$([…])` list literal with `$args` embeds.
 * Message: `[version, method, CALL=1, seqId, argsStruct]`.
 */
export function buildTJSONConnectBody(
  methodName: string,
  fieldTypeMap: TypeMap,
  topTypeMap: TypeMap,
): string {
  const argsFields = Object.entries(fieldTypeMap)
    .map(([argName, typeVal]) => {
      const id = String(typeVal.id ?? 1);
      const tagged = formatTJSONValueExpr(typeVal, `$args.${argName}`, topTypeMap, 3);
      return `${indent(3)}"${id}": ${tagged}`;
    })
    .join(',\n');

  return `$([
  1,
  "${methodName}",
  1,
  1,
  {
${argsFields}
  }
])`;
}

function formatTJSONValueExpr(
  typeVal: TypeVal,
  valueExpr: string,
  topTypeMap: TypeMap,
  level: number,
  seenStructs: Set<string> = new Set(),
): string {
  const resolved = resolveTypeVal(typeVal, topTypeMap);
  const tag = tjsonTypeTag(typeVal, topTypeMap);
  const pad = indent(level);
  const padInner = indent(level + 1);

  if (resolved.type === TType.STRUCT) {
    const structName = resolved.name || valueExpr;
    if (seenStructs.has(structName)) {
      return `{ "${tag}": ${valueExpr} }`;
    }
    const nextSeen = new Set(seenStructs);
    nextSeen.add(structName);
    const fields = Object.entries(resolved.fields)
      .map(([fieldName, fieldType]) => {
        const fid = String(fieldType.id ?? 1);
        const childExpr = `${valueExpr}.${fieldName}`;
        return `${padInner}"${fid}": ${formatTJSONValueExpr(fieldType, childExpr, topTypeMap, level + 1, nextSeen)}`;
      })
      .join(',\n');
    return `{\n${padInner}"${tag}": {\n${fields}\n${padInner}}\n${pad}}`;
  }

  if (resolved.type === TType.LIST || resolved.type === TType.SET) {
    // Homogeneous containers: emit type tag + value path; runtime must send TJSON `[type,count,…elems]`.
    // For scalar lists, wrap as `{ "lst"|"set": [elemTag, $valueExpr->size, ...$valueExpr] }` is not
    // portable in all Connectors parsers — keep a typed wrapper around the GraphQL list and document.
    const elemTag = tjsonTypeTag(resolved.elementType, topTypeMap);
    return `{ "${tag}": $([ "${elemTag}", ${valueExpr}->size, ...${valueExpr} ]) }`;
  }

  if (resolved.type === TType.MAP) {
    const keyTag = tjsonTypeTag(resolved.keyType, topTypeMap);
    const valTag = tjsonTypeTag(resolved.valType, topTypeMap);
    return `{ "${tag}": $([ "${keyTag}", "${valTag}", ${valueExpr}->size, ${valueExpr} ]) }`;
  }

  return `{ "${tag}": ${valueExpr} }`;
}

/**
 * TJSON `@connect(selection:)` — peel message envelope index 4, success field `"0"`.
 */
export function buildTJSONConnectSelection(
  returnTypeVal: TypeVal | undefined,
  topTypeMap: TypeMap,
): string {
  if (!returnTypeVal) {
    return '$->get(4)';
  }
  const resolved = resolveTypeVal(returnTypeVal, topTypeMap);
  if (resolved.type !== TType.STRUCT) {
    const tag = tjsonTypeTag(returnTypeVal, topTypeMap);
    return `$->get(4)->get("0")->get("${tag}")`;
  }
  const lines = Object.entries(resolved.fields).map(([fieldName, fieldType]) =>
    formatTJSONSelectionField(fieldName, fieldType, topTypeMap, `$->get(4)->get("0")->get("rec")`),
  );
  return lines.join('\n');
}

function formatTJSONSelectionField(
  graphqlName: string,
  typeVal: TypeVal,
  topTypeMap: TypeMap,
  parentPath: string,
): string {
  const id = String(typeVal.id ?? 1);
  const resolved = resolveTypeVal(typeVal, topTypeMap);
  const tag = tjsonTypeTag(typeVal, topTypeMap);
  const fieldPath = `${parentPath}->get("${id}")`;

  if (resolved.type === TType.STRUCT) {
    const nested = Object.entries(resolved.fields)
      .map(([childName, childType]) =>
        formatTJSONSelectionField(childName, childType, topTypeMap, `${fieldPath}->get("rec")`),
      )
      .join('\n  ');
    return `${graphqlName}: ${fieldPath}->get("rec") {\n  ${nested}\n}`;
  }

  if (resolved.type === TType.LIST || resolved.type === TType.SET) {
    // TJSON list/set: [elemType, count, ...elems] — skip prefix with ->slice(2)
    return `${graphqlName}: ${fieldPath}->get("${tag}")->slice(2)`;
  }

  if (resolved.type === TType.MAP) {
    return `${graphqlName}: ${fieldPath}->get("${tag}")->get(3)`;
  }

  return `${graphqlName}: ${fieldPath}->get("${tag}")`;
}

export function thriftJsonContentTypeHeaders(): Array<{ name: string; value: string }> {
  return [
    { name: 'Content-Type', value: 'application/vnd.apache.thrift.json' },
    { name: 'Accept', value: 'application/vnd.apache.thrift.json' },
  ];
}
