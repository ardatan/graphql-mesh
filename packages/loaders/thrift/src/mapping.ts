import { TType } from '@creditkarma/thrift-server-core';
import type { TypeMap, TypeVal } from '@graphql-mesh/transport-thrift';

/** Loader emit switch: thrift transport is always binary; `json` emits `@connect`. */
export type ThriftProtocol = 'binary' | 'json';

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
  [TType.ENUM]: 'i32',
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
  [TType.ENUM]: 'i32',
};

export function wireTypeToken(typeVal: TypeVal, topTypeMap: TypeMap): string {
  if (typeVal.type === 'ref') {
    const resolved = topTypeMap[typeVal.name];
    if (!resolved) {
      // Align with resolveTypeVal: unresolved ref (enum/typedef) -> i32.
      return 'i32';
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
  return WIRE_TYPE_TOKEN[typeVal.type] || 'i32';
}

function resolveTypeVal(
  typeVal: TypeVal,
  topTypeMap: TypeMap,
  stack: Set<string> = new Set(),
): TypeVal {
  if (typeVal.type === 'ref') {
    if (stack.has(typeVal.name)) {
      return { type: TType.STRUCT, name: typeVal.name, fields: {}, id: typeVal.id };
    }
    const resolved = topTypeMap[typeVal.name];
    if (!resolved) {
      // Unknown typedef/import/enum — treat as i32 (common scalar typedef fallback).
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
  return TJSON_TYPE_TAG[resolved.type as TType] || 'i32';
}

function indent(level: number): string {
  return '  '.repeat(level);
}

/**
 * Compact `@thrift__rpc(args:)` — Thrift-id first.
 */
export function buildCompactArgs(
  fieldTypeMap: TypeMap,
  topTypeMap: TypeMap,
  argsPathPrefix = '$args',
): string {
  const lines: string[] = [];
  for (const [argName, typeVal] of Object.entries(fieldTypeMap)) {
    lines.push(
      ...formatCompactArgField(typeVal, argName, topTypeMap, 0, `${argsPathPrefix}.${argName}`),
    );
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
  const rhs = level === 0 ? valueExpr : graphqlName.startsWith('$') ? graphqlName : valueExpr;

  if (resolved.type === TType.STRUCT) {
    const structName = resolved.name || graphqlName;
    // Compact args have no named type table — a cycle would serialize as an empty
    // struct and silently drop nested data. Fail at generate instead.
    if (seenStructs.has(structName)) {
      throw new Error(
        `Thrift struct "${structName}" is recursive in RPC arguments; compact @thrift__rpc args cannot expand cycles without truncating. Restructure the IDL (bounded / non-recursive inputs) or hand-author a depth-limited mapping.`,
      );
    }
    const nextSeen = new Set(seenStructs);
    nextSeen.add(structName);
    const lines = [`${pad}${id}(struct): ${rhs} {`];
    for (const [fieldName, fieldType] of Object.entries(resolved.fields)) {
      lines.push(
        ...formatCompactArgField(fieldType, fieldName, topTypeMap, level + 1, fieldName, nextSeen),
      );
    }
    lines.push(`${pad}}`);
    return lines;
  }

  if (
    (resolved.type === TType.LIST || resolved.type === TType.SET) &&
    resolveTypeVal(resolved.elementType, topTypeMap).type === TType.STRUCT
  ) {
    const elem = resolveTypeVal(resolved.elementType, topTypeMap) as Extract<
      TypeVal,
      { type: TType.STRUCT }
    >;
    const elemName = elem.name || 'Anon';
    const wire = resolved.type === TType.SET ? 'set' : 'list';
    if (seenStructs.has(elemName)) {
      throw new Error(
        `Thrift struct "${elemName}" is recursive in RPC ${wire} arguments; compact @thrift__rpc args cannot expand cycles without truncating. Restructure the IDL (bounded / non-recursive inputs) or hand-author a depth-limited mapping.`,
      );
    }
    const nextSeen = new Set(seenStructs);
    nextSeen.add(elemName);
    const lines = [`${pad}${id}(${wire}): ${rhs} {`];
    for (const [fieldName, fieldType] of Object.entries(elem.fields)) {
      lines.push(
        ...formatCompactArgField(fieldType, fieldName, topTypeMap, level + 1, fieldName, nextSeen),
      );
    }
    lines.push(`${pad}}`);
    return lines;
  }

  return [`${pad}${id}(${token}): ${level === 0 ? valueExpr : graphqlName}`];
}

/**
 * Compact `@thrift__rpc(selection:)` — GraphQL-field first / scalar `$(wire)`.
 */
export function buildCompactSelection(
  returnTypeVal: TypeVal | undefined,
  topTypeMap: TypeMap,
): string {
  if (!returnTypeVal) {
    return '$(void)';
  }
  const resolved = resolveTypeVal(returnTypeVal, topTypeMap);
  // Top-level list/set of structs: emit element field mappings (not bare `$(list)`).
  if (resolved.type === TType.LIST || resolved.type === TType.SET) {
    const elem = resolveTypeVal(
      (resolved as Extract<TypeVal, { type: TType.LIST | TType.SET }>).elementType,
      topTypeMap,
    );
    if (elem.type === TType.STRUCT) {
      const lines: string[] = [];
      for (const [fieldName, fieldType] of Object.entries(elem.fields)) {
        lines.push(...formatCompactSelectionField(fieldName, fieldType, topTypeMap, 0));
      }
      return lines.join('\n');
    }
    return `$(${wireTypeToken(returnTypeVal, topTypeMap)})`;
  }
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

  if (
    (resolved.type === TType.LIST || resolved.type === TType.SET) &&
    resolveTypeVal(resolved.elementType, topTypeMap).type === TType.STRUCT
  ) {
    const elem = resolveTypeVal(resolved.elementType, topTypeMap) as Extract<
      TypeVal,
      { type: TType.STRUCT }
    >;
    const elemName = elem.name || 'Anon';
    const wire = resolved.type === TType.SET ? 'set' : 'list';
    const lines = [`${pad}${graphqlName}: ${id}(${wire}) {`];
    if (seenStructs.has(elemName)) {
      // Cycle: retain element field metadata as leaves (ids + wire tokens).
      for (const [fieldName, fieldType] of Object.entries(elem.fields)) {
        const fid = fieldType.id ?? 1;
        const tok = wireTypeToken(fieldType, topTypeMap);
        lines.push(`${indent(level + 1)}${fieldName}: ${fid}(${tok})`);
      }
    } else {
      const nextSeen = new Set(seenStructs);
      nextSeen.add(elemName);
      for (const [fieldName, fieldType] of Object.entries(elem.fields)) {
        lines.push(
          ...formatCompactSelectionField(fieldName, fieldType, topTypeMap, level + 1, nextSeen),
        );
      }
    }
    lines.push(`${pad}}`);
    return lines;
  }

  return [`${pad}${graphqlName}: ${id}(${token})`];
}

/**
 * TJSON REPLY(=2) and success field "0" present.
 * Declared IDL throws arrive as REPLY with a non-0 field id — require "0".
 * Uses `ne(null)` (Apollo-public); avoid `has` (future/non-public in Connectors).
 */
export const TJSON_IS_SUCCESS = '$->get(2)->eq(2)->and($->get(4)->get("0")->ne(null))';

/** Void CALL without declared throws (or union-modeled throws): only require REPLY. */
export const TJSON_IS_SUCCESS_VOID = '$->get(2)->eq(2)';

/**
 * Void CALL with IDL `throws` when `ignoreExceptions: true` (errors path, no union).
 * Declared throws arrive as REPLY with a non-empty result struct (no field `"0"`).
 * Require REPLY + empty result so those are not silent null.
 */
export const TJSON_IS_SUCCESS_VOID_WITH_THROWS = '$->get(2)->eq(2)->and($->get(4)->size->eq(0))';

/**
 * TApplicationException ("1".str) or declared-throw struct ("1".rec."1".str).
 * Prefer `joinNotNull` over `??` — Hive gateway connectors are picky about `??` in errors.
 */
export const TJSON_ERRORS = {
  message:
    '$([$->get(4)->get("1")->get("str"), $->get(4)->get("1")->get("rec")->get("1")->get("str")])->joinNotNull("")',
};

/** Thrift MessageType: CALL=1, ONEWAY=4. */
export function thriftMessageTypeCode(messageType: 'CALL' | 'ONEWAY' = 'CALL'): number {
  return messageType === 'ONEWAY' ? 4 : 1;
}

/**
 * TJSON `@connect(http.body:)` — Apollo `$([…])` list literal with `$args` embeds.
 */
export function buildTJSONConnectBody(
  methodName: string,
  fieldTypeMap: TypeMap,
  topTypeMap: TypeMap,
  messageType: 'CALL' | 'ONEWAY' = 'CALL',
): string {
  const argsFields = Object.entries(fieldTypeMap)
    .map(([argName, typeVal]) => {
      const id = String(typeVal.id ?? 1);
      // level 2 → 4-space indent under the envelope object `{ … }`.
      const tagged = formatTJSONValueExpr(typeVal, `$args.${argName}`, topTypeMap, 2);
      return `${indent(2)}"${id}": ${tagged}`;
    })
    .join(',\n');
  const msgType = thriftMessageTypeCode(messageType);

  // Keep the TJSON call envelope header compact (`version, name, type, seqId`);
  // only expand the args object — stacking `1, "add", 1, 1` one-per-line is noise.
  return `$([1, "${methodName}", ${msgType}, 1, {
${argsFields}
}])`;
}

/**
 * Compact `@thrift__rpc(throws:)` — one block per IDL throw:
 * `TypeName: <resultFieldId> { field: id(wire) }`
 */
export function buildCompactThrows(
  throws: Array<{ id: number; name: string; typeName: string }>,
  topTypeMap: TypeMap,
): string {
  const blocks: string[] = [];
  for (const t of throws) {
    const typeVal = topTypeMap[t.typeName];
    const body =
      typeVal && typeVal.type === TType.STRUCT
        ? buildCompactSelection(typeVal, topTypeMap)
        : 'message: 1(string)';
    blocks.push(
      `${t.typeName}: ${t.id} {\n${body
        .split('\n')
        .map(l => (l ? `  ${l}` : l))
        .join('\n')}\n}`,
    );
  }
  return blocks.join('\n');
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
      throw new Error(
        `Thrift struct "${structName}" is recursive in RPC arguments; TJSON @connect body cannot expand cycles without truncating. Restructure the IDL (bounded / non-recursive inputs) or hand-author a depth-limited mapping.`,
      );
    }
    const nextSeen = new Set(seenStructs);
    nextSeen.add(structName);
    // Field ids nest under `"rec": { … }` — one indent past `padInner`.
    const padFields = indent(level + 2);
    const fields = Object.entries(resolved.fields)
      .map(([fieldName, fieldType]) => {
        const fid = String(fieldType.id ?? 1);
        const childExpr = `${valueExpr}.${fieldName}`;
        return `${padFields}"${fid}": ${formatTJSONValueExpr(fieldType, childExpr, topTypeMap, level + 2, nextSeen)}`;
      })
      .join(',\n');
    return `{\n${padInner}"${tag}": {\n${fields}\n${padInner}}\n${pad}}`;
  }

  if (resolved.type === TType.LIST || resolved.type === TType.SET) {
    const elemTag = tjsonTypeTag(resolved.elementType, topTypeMap);
    const elemResolved = resolveTypeVal(resolved.elementType, topTypeMap);
    if (elemResolved.type === TType.STRUCT) {
      // TJSON list header carries "rec"; each element is the id-keyed field object.
      const fieldsObj = formatTJSONStructFieldsObject(
        resolved.elementType,
        '@',
        topTypeMap,
        level + 1,
        seenStructs,
      );
      return `{ "${tag}": $([ "${elemTag}", ${valueExpr}->size, ...${valueExpr}->map(@->${fieldsObj}) ]) }`;
    }
    // Scalar list/set: Mesh `$()` accepts `...$path` spreads.
    // Bool elements must be TJSON integers 0/1 (same as scalar `tf`).
    if (elemResolved.type === TType.BOOL) {
      return `{ "${tag}": $([ "${elemTag}", ${valueExpr}->size, ...${valueExpr}->map(@->match([true, 1], [false, 0], [@, 0])) ]) }`;
    }
    return `{ "${tag}": $([ "${elemTag}", ${valueExpr}->size, ...${valueExpr} ]) }`;
  }

  if (resolved.type === TType.MAP) {
    const keyTag = tjsonTypeTag(resolved.keyType, topTypeMap);
    const valTag = tjsonTypeTag(resolved.valType, topTypeMap);
    const valResolved = resolveTypeVal(resolved.valType, topTypeMap);
    // TJSON map payload is a JSON object (thrift JS / common readers). Bool values
    // must be integers 0/1, but public Connectors cannot rewrite object map values
    // (no shipped `mapValues` / fromEntries on Router). Fail at generate rather than
    // emit true/false tokens Apache readers reject. List/set bool elements use
    // `->map(@->match(...))` above.
    if (valResolved.type === TType.BOOL) {
      throw new Error(
        `Thrift map with bool values cannot be emitted as TJSON @connect body: Connectors have no public Router-safe way to rewrite object map values to 0/1. Prefer list/set of bool, change the IDL, or hand-author the @connect body.`,
      );
    }
    return `{ "${tag}": $([ "${keyTag}", "${valTag}", ${valueExpr}->size, ${valueExpr} ]) }`;
  }

  // TJSON bool is integer 0/1 (reference readers use ReadI32 / readJSONInteger).
  // Apollo-compatible `match` - works on Hive Mesh eval and Router Connectors.
  if (resolved.type === TType.BOOL) {
    return `{ "${tag}": ${valueExpr}->match([true, 1], [false, 0], [@, 0]) }`;
  }

  return `{ "${tag}": ${valueExpr} }`;
}

/** Inner TJSON struct object `{ "1": { "i32": ... }, ... }` (no outer `rec` wrapper). */
function formatTJSONStructFieldsObject(
  typeVal: TypeVal,
  valueExpr: string,
  topTypeMap: TypeMap,
  level: number,
  seenStructs: Set<string> = new Set(),
): string {
  const resolved = resolveTypeVal(typeVal, topTypeMap);
  if (resolved.type !== TType.STRUCT) {
    return formatTJSONValueExpr(typeVal, valueExpr, topTypeMap, level, seenStructs);
  }
  const structName = resolved.name || valueExpr;
  const pad = indent(level);
  const padInner = indent(level + 1);
  if (seenStructs.has(structName)) {
    throw new Error(
      `Thrift struct "${structName}" is recursive in RPC arguments; TJSON @connect body cannot expand cycles without truncating. Restructure the IDL (bounded / non-recursive inputs) or hand-author a depth-limited mapping.`,
    );
  }
  const nextSeen = new Set(seenStructs);
  nextSeen.add(structName);
  const fields = Object.entries(resolved.fields)
    .map(([fieldName, fieldType]) => {
      const fid = String(fieldType.id ?? 1);
      const childExpr = valueExpr === '@' ? `@.${fieldName}` : `${valueExpr}.${fieldName}`;
      return `${padInner}"${fid}": ${formatTJSONValueExpr(fieldType, childExpr, topTypeMap, level + 1, nextSeen)}`;
    })
    .join(',\n');
  return `{\n${fields}\n${pad}}`;
}

/**
 * TJSON `@connect(selection:)` — peel message envelope index 4, success field `"0"`.
 */
export function buildTJSONConnectSelection(
  returnTypeVal: TypeVal | undefined,
  topTypeMap: TypeMap,
): string {
  if (!returnTypeVal || returnTypeVal.type === TType.VOID) {
    // Void/ONEWAY — no success payload; connectors coerce to GraphQL Void/null.
    return 'null';
  }
  const resolved = resolveTypeVal(returnTypeVal, topTypeMap);
  if (resolved.type === TType.VOID) {
    return 'null';
  }
  if (resolved.type === TType.LIST || resolved.type === TType.SET) {
    const tag = tjsonTypeTag(returnTypeVal, topTypeMap);
    const elemResolved = resolveTypeVal(
      (resolved as Extract<TypeVal, { type: TType.LIST | TType.SET }>).elementType,
      topTypeMap,
    );
    const base = `$->get(4)->get("0")->get("${tag}")->slice(2)`;
    if (elemResolved.type === TType.STRUCT) {
      const nested = Object.entries(elemResolved.fields)
        .map(([fieldName, fieldType]) =>
          formatTJSONSelectionField(fieldName, fieldType, topTypeMap, '$'),
        )
        .join('\n  ');
      return `${base} {\n  ${nested}\n}`;
    }
    return base;
  }
  if (resolved.type === TType.MAP) {
    const tag = tjsonTypeTag(returnTypeVal, topTypeMap);
    return `$->get(4)->get("0")->get("${tag}")->get(3)`;
  }
  if (resolved.type !== TType.STRUCT) {
    const tag = tjsonTypeTag(returnTypeVal, topTypeMap);
    return `$->get(4)->get("0")->get("${tag}")`;
  }
  const lines = Object.entries(resolved.fields).map(([fieldName, fieldType]) =>
    formatTJSONSelectionField(fieldName, fieldType, topTypeMap, `$->get(4)->get("0")->get("rec")`),
  );
  return lines.join('\n');
}

/**
 * TJSON selection for `ignoreExceptions: false` unions — success under `value`,
 * plus declared throw struct fields projected from their result field ids.
 */
export function buildTJSONUnionConnectSelection(
  returnTypeVal: TypeVal | undefined,
  throws: Array<{ id: number; name: string; typeName: string }>,
  topTypeMap: TypeMap,
): string {
  const resolvedReturn = returnTypeVal ? resolveTypeVal(returnTypeVal, topTypeMap) : undefined;
  const lines: string[] = [];
  if (!resolvedReturn || resolvedReturn.type === TType.VOID) {
    // Void success member is `ok: Boolean!` (not `value: Void!`).
    lines.push('ok: true');
  } else if (resolvedReturn.type === TType.STRUCT) {
    // Struct success must be a sub-selection under `value`, not multiline
    // `value: a: path\nb: path` (invalid JSONSelection).
    const nested = Object.entries(resolvedReturn.fields)
      .map(([n, t]) => formatTJSONSelectionField(n, t, topTypeMap, '$'))
      .join('\n  ');
    lines.push(`value: $->get(4)->get("0")->get("rec") {\n  ${nested}\n}`);
  } else {
    lines.push(`value: ${buildTJSONConnectSelection(returnTypeVal, topTypeMap)}`);
  }
  for (const t of throws) {
    const typeVal = topTypeMap[t.typeName];
    const fid = String(t.id);
    const parent = `$->get(4)->get("${fid}")->get("rec")`;
    if (typeVal && typeVal.type === TType.STRUCT) {
      for (const [fieldName, fieldType] of Object.entries(typeVal.fields)) {
        lines.push(formatTJSONSelectionField(fieldName, fieldType, topTypeMap, parent));
      }
    } else {
      lines.push(`message: ${parent}->get("1")->get("str")`);
    }
  }
  return lines.join('\n');
}

function formatTJSONSelectionField(
  graphqlName: string,
  typeVal: TypeVal,
  topTypeMap: TypeMap,
  parentPath: string,
  seenStructs: Set<string> = new Set(),
): string {
  const id = String(typeVal.id ?? 1);
  const resolved = resolveTypeVal(typeVal, topTypeMap);
  const tag = tjsonTypeTag(typeVal, topTypeMap);
  const fieldPath = `${parentPath}->get("${id}")`;

  if (resolved.type === TType.STRUCT) {
    const structName = resolved.name || graphqlName;
    if (seenStructs.has(structName)) {
      return `${graphqlName}: ${fieldPath}->get("rec")`;
    }
    const nextSeen = new Set(seenStructs);
    nextSeen.add(structName);
    // Inside a Connectors sub-selection, `$` is the parent value — use relative paths.
    const nested = Object.entries(resolved.fields)
      .map(([childName, childType]) =>
        formatTJSONSelectionField(childName, childType, topTypeMap, '$', nextSeen),
      )
      .join('\n  ');
    return `${graphqlName}: ${fieldPath}->get("rec") {\n  ${nested}\n}`;
  }

  if (resolved.type === TType.LIST || resolved.type === TType.SET) {
    const elemResolved = resolveTypeVal(resolved.elementType, topTypeMap);
    const listPath = `${fieldPath}->get("${tag}")->slice(2)`;
    if (elemResolved.type === TType.STRUCT) {
      const elemName = elemResolved.name || graphqlName;
      if (seenStructs.has(elemName)) {
        // Cycle: keep element field projections as leaves (no further nesting).
        const nested = Object.entries(elemResolved.fields)
          .map(([childName, childType]) => {
            const cid = String(childType.id ?? 1);
            const ctag = tjsonTypeTag(childType, topTypeMap);
            return `  ${childName}: $->get("${cid}")->get("${ctag}")`;
          })
          .join('\n');
        return `${graphqlName}: ${listPath} {\n${nested}\n}`;
      }
      const nextSeen = new Set(seenStructs);
      nextSeen.add(elemName);
      const nested = Object.entries(elemResolved.fields)
        .map(([childName, childType]) =>
          formatTJSONSelectionField(childName, childType, topTypeMap, '$', nextSeen),
        )
        .join('\n  ');
      return `${graphqlName}: ${listPath} {\n  ${nested}\n}`;
    }
    return `${graphqlName}: ${listPath}`;
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
