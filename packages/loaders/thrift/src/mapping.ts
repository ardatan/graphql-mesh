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
  // ENUM without a name↔i32 table falls back to plain i32 (legacy / untyped).
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

/**
 * Compact `@thrift__rpc` GraphQL-name → wire-i32 match (same shape as `@connect` / TJSON).
 * `[@, 0]` keeps unknown names from writing garbage.
 */
export function formatEnumNameToWireMatch(values: Record<string, number>): string {
  const arms = Object.entries(values).map(([name, n]) => `["${name}", ${n}]`);
  return `->match(${arms.join(', ')}, [@, 0])`;
}

/** Compact selection wire-i32 → GraphQL-name match. */
export function formatEnumWireToNameMatch(values: Record<string, number>): string {
  const arms = Object.entries(values).map(([name, n]) => `[${n}, "${name}"]`);
  return `->match(${arms.join(', ')}, [@, @])`;
}

export function wireTypeToken(typeVal: TypeVal, topTypeMap: TypeMap): string {
  if (typeVal.type === 'ref') {
    const resolved = topTypeMap[typeVal.name];
    if (!resolved) {
      // Align with resolveTypeVal: unresolved ref (enum/typedef) -> i32.
      return 'i32';
    }
    return wireTypeToken(resolved, topTypeMap);
  }
  // Enums are i32 on the wire; name↔i32 lives in `->match` on the value / selection.
  if (typeVal.type === TType.ENUM) {
    return 'i32';
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

/** True when a type tree contains a STRUCT that needs field-id expansion in compact mapping. */
function containsStruct(
  typeVal: TypeVal,
  topTypeMap: TypeMap,
  stack: Set<string> = new Set(),
): boolean {
  const resolved = resolveTypeVal(typeVal, topTypeMap, stack);
  if (resolved.type === TType.STRUCT) return true;
  if (resolved.type === TType.LIST || resolved.type === TType.SET) {
    return containsStruct(resolved.elementType, topTypeMap, stack);
  }
  if (resolved.type === TType.MAP) {
    return (
      containsStruct(resolved.keyType, topTypeMap, stack) ||
      containsStruct(resolved.valType, topTypeMap, stack)
    );
  }
  return false;
}

/** True when a type tree contains a named ENUM that needs i32 `->match` on the wire. */
function containsEnum(
  typeVal: TypeVal,
  topTypeMap: TypeMap,
  stack: Set<string> = new Set(),
): boolean {
  const resolved = resolveTypeVal(typeVal, topTypeMap, stack);
  if (resolved.type === TType.ENUM && resolved.values && Object.keys(resolved.values).length) {
    return true;
  }
  if (resolved.type === TType.LIST || resolved.type === TType.SET) {
    return containsEnum(resolved.elementType, topTypeMap, stack);
  }
  if (resolved.type === TType.MAP) {
    return (
      containsEnum(resolved.keyType, topTypeMap, stack) ||
      containsEnum(resolved.valType, topTypeMap, stack)
    );
  }
  return false;
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

  if (resolved.type === TType.LIST || resolved.type === TType.SET) {
    const elem = resolveTypeVal(resolved.elementType, topTypeMap);
    const wire = resolved.type === TType.SET ? 'set' : 'list';
    if (elem.type === TType.ENUM && elem.values && Object.keys(elem.values).length) {
      const base = level === 0 ? valueExpr : graphqlName;
      return [`${pad}${id}(${wire}): ${base}->map(@${formatEnumNameToWireMatch(elem.values)})`];
    }
    if (elem.type === TType.STRUCT) {
      const elemName = elem.name || 'Anon';
      if (seenStructs.has(elemName)) {
        throw new Error(
          `Thrift struct "${elemName}" is recursive in RPC ${wire} arguments; compact @thrift__rpc args cannot expand cycles without truncating. Restructure the IDL (bounded / non-recursive inputs) or hand-author a depth-limited mapping.`,
        );
      }
      const nextSeen = new Set(seenStructs);
      nextSeen.add(elemName);
      // Bare `list` / `set` token — element fields follow in the block.
      const lines = [`${pad}${id}(${wire}): ${rhs} {`];
      for (const [fieldName, fieldType] of Object.entries(elem.fields)) {
        lines.push(
          ...formatCompactArgField(
            fieldType,
            fieldName,
            topTypeMap,
            level + 1,
            fieldName,
            nextSeen,
          ),
        );
      }
      lines.push(`${pad}}`);
      return lines;
    }
    // list/set of map — expand struct values; scalar/enum map values keep the full token
    // (`list<map<string, i32>>`) so binary regenerate does not drop the method.
    if (elem.type === TType.MAP) {
      const val = resolveTypeVal(elem.valType, topTypeMap);
      if (val.type === TType.STRUCT) {
        const valName = val.name || 'Anon';
        if (seenStructs.has(valName)) {
          throw new Error(
            `Thrift struct "${valName}" is recursive in RPC ${wire}<map> arguments; compact @thrift__rpc args cannot expand cycles without truncating. Restructure the IDL (bounded / non-recursive inputs) or hand-author a depth-limited mapping.`,
          );
        }
        const nextSeen = new Set(seenStructs);
        nextSeen.add(valName);
        const lines = [`${pad}${id}(${token}): ${rhs} {`];
        for (const [fieldName, fieldType] of Object.entries(val.fields)) {
          lines.push(
            ...formatCompactArgField(
              fieldType,
              fieldName,
              topTypeMap,
              level + 1,
              fieldName,
              nextSeen,
            ),
          );
        }
        lines.push(`${pad}}`);
        return lines;
      }
      // `list<map<string, list<Item>>>` would emit `list<map<string, list>>` and drop
      // Item field ids — fail until nested descriptors are preserved.
      if (containsStruct(elem.valType, topTypeMap) || containsStruct(elem.keyType, topTypeMap)) {
        throw new Error(
          `Thrift ${wire}<map> arguments with composite map values cannot be emitted as compact @thrift__rpc args without losing nested descriptors. Prefer a struct wrapper, hand-author the mapping, or simplify the IDL.`,
        );
      }
      return [`${pad}${id}(${token}): ${level === 0 ? valueExpr : graphqlName}`];
    }
    if (elem.type === TType.LIST || elem.type === TType.SET) {
      // Nested scalar containers (e.g. list<list<i32>>) keep the full wire token.
      // Nested enum containers would emit bare i32 tokens and drop name↔i32 match.
      if (containsStruct(elem, topTypeMap)) {
        throw new Error(
          `Thrift nested ${wire} arguments with struct elements cannot be emitted as compact @thrift__rpc args without losing nested descriptors. Prefer a struct wrapper, hand-author the mapping, or simplify the IDL.`,
        );
      }
      if (containsEnum(elem, topTypeMap)) {
        throw new Error(
          `Thrift nested ${wire} arguments with enum elements cannot be emitted as compact @thrift__rpc args without losing name↔i32 ->match. Prefer a struct wrapper, hand-author the mapping, or simplify the IDL.`,
        );
      }
      return [`${pad}${id}(${token}): ${level === 0 ? valueExpr : graphqlName}`];
    }
  }

  // map<*, struct> — expand value-struct field ids like list/set-of-struct.
  if (resolved.type === TType.MAP) {
    const val = resolveTypeVal(resolved.valType, topTypeMap);
    if (val.type === TType.STRUCT) {
      const valName = val.name || 'Anon';
      if (seenStructs.has(valName)) {
        throw new Error(
          `Thrift struct "${valName}" is recursive in RPC map arguments; compact @thrift__rpc args cannot expand cycles without truncating. Restructure the IDL (bounded / non-recursive inputs) or hand-author a depth-limited mapping.`,
        );
      }
      const nextSeen = new Set(seenStructs);
      nextSeen.add(valName);
      const lines = [`${pad}${id}(${token}): ${rhs} {`];
      for (const [fieldName, fieldType] of Object.entries(val.fields)) {
        lines.push(
          ...formatCompactArgField(
            fieldType,
            fieldName,
            topTypeMap,
            level + 1,
            fieldName,
            nextSeen,
          ),
        );
      }
      lines.push(`${pad}}`);
      return lines;
    }
    // map<*, list<Item>> etc. would emit bare `list` without field ids — fail loud.
    if (containsStruct(val, topTypeMap)) {
      throw new Error(
        `Thrift map arguments with nested struct containers cannot be emitted as compact @thrift__rpc args without losing nested descriptors. Prefer a struct wrapper, hand-author the mapping, or simplify the IDL.`,
      );
    }
  }

  if (resolved.type === TType.ENUM && resolved.values && Object.keys(resolved.values).length) {
    const base = level === 0 ? valueExpr : graphqlName;
    return [`${pad}${id}(i32): ${base}${formatEnumNameToWireMatch(resolved.values)}`];
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
    if (elem.type === TType.ENUM && elem.values && Object.keys(elem.values).length) {
      return `$(list)->map(@${formatEnumWireToNameMatch(elem.values)})`;
    }
    // Nested list/set of structs would fall through to a scalar token and leak field-id Maps.
    if ((elem.type === TType.LIST || elem.type === TType.SET) && containsStruct(elem, topTypeMap)) {
      throw new Error(
        `Thrift nested list/set of structs in RPC selection cannot be emitted as compact @thrift__rpc selection without losing field projections. Prefer a struct wrapper, hand-author the mapping, or simplify the IDL.`,
      );
    }
    if ((elem.type === TType.LIST || elem.type === TType.SET) && containsEnum(elem, topTypeMap)) {
      throw new Error(
        `Thrift nested list/set of enums in RPC selection cannot be emitted as compact @thrift__rpc selection without losing name↔i32 ->match. Prefer a struct wrapper, hand-author the mapping, or simplify the IDL.`,
      );
    }
    // list<map<string, list<Item>>> → wireTypeToken drops Item descriptors.
    if (elem.type === TType.MAP && containsStruct(elem, topTypeMap)) {
      const val = resolveTypeVal(elem.valType, topTypeMap);
      if (val.type !== TType.STRUCT) {
        throw new Error(
          `Thrift list/set of maps with composite map values in RPC selection cannot be emitted as compact @thrift__rpc selection without losing nested descriptors. Prefer a struct wrapper, hand-author the mapping, or simplify the IDL.`,
        );
      }
    }
    return `$(${wireTypeToken(returnTypeVal, topTypeMap)})`;
  }
  if (resolved.type === TType.ENUM && resolved.values && Object.keys(resolved.values).length) {
    return `$(i32)${formatEnumWireToNameMatch(resolved.values)}`;
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

  if (resolved.type === TType.LIST || resolved.type === TType.SET) {
    const elem = resolveTypeVal(resolved.elementType, topTypeMap);
    const wire = resolved.type === TType.SET ? 'set' : 'list';
    if (elem.type === TType.ENUM && elem.values && Object.keys(elem.values).length) {
      return [
        `${pad}${graphqlName}: ${id}(${wire})->map(@${formatEnumWireToNameMatch(elem.values)})`,
      ];
    }
    if (elem.type === TType.STRUCT) {
      const elemName = elem.name || 'Anon';
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
    // Nested containers with structs (e.g. list<list<Item>>, list<map<k, list<Item>>>).
    if (containsStruct(resolved.elementType, topTypeMap)) {
      throw new Error(
        `Thrift nested ${wire} of structs in RPC selection cannot be emitted as compact @thrift__rpc selection without losing field projections. Prefer a struct wrapper, hand-author the mapping, or simplify the IDL.`,
      );
    }
    if (containsEnum(resolved.elementType, topTypeMap)) {
      throw new Error(
        `Thrift nested ${wire} of enums in RPC selection cannot be emitted as compact @thrift__rpc selection without losing name↔i32 ->match. Prefer a struct wrapper, hand-author the mapping, or simplify the IDL.`,
      );
    }
  }

  if (resolved.type === TType.MAP && containsStruct(resolved, topTypeMap)) {
    const val = resolveTypeVal(resolved.valType, topTypeMap);
    if (val.type !== TType.STRUCT) {
      throw new Error(
        `Thrift map with composite values in RPC selection cannot be emitted as compact @thrift__rpc selection without losing nested descriptors. Prefer a struct wrapper, hand-author the mapping, or simplify the IDL.`,
      );
    }
  }

  if (resolved.type === TType.ENUM && resolved.values && Object.keys(resolved.values).length) {
    return [`${pad}${graphqlName}: ${id}(i32)${formatEnumWireToNameMatch(resolved.values)}`];
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
    // TJSON list/set wire is `[type, size, elem1, elem2, …]`. Apollo LitArray has
    // no element spread, and public Connectors have no `concat` / flatten to build
    // that header+elements array on Router. Fail at generate (same policy as
    // map<*, bool>). Hand-author `@connect` body on Hive (Mesh accepts
    // `$([type, size])->concat($args.list)`), or use binary / change the IDL.
    throw new Error(
      `Thrift list/set arguments cannot be emitted as TJSON @connect body: Connectors LitArray has no element spread and no public Router-safe concat/flatten to build [type, size, …elements]. Prefer scalar/struct args, change the IDL, use binary protocol, or hand-author the @connect body (Hive Mesh supports ->concat).`,
    );
  }

  if (resolved.type === TType.MAP) {
    const keyTag = tjsonTypeTag(resolved.keyType, topTypeMap);
    const valTag = tjsonTypeTag(resolved.valType, topTypeMap);
    const valResolved = resolveTypeVal(resolved.valType, topTypeMap);
    // TJSON map payload is a JSON object (thrift JS / common readers). Bool values
    // must be integers 0/1, and struct/list/set/map values need per-entry TJSON
    // conversion — public Connectors cannot rewrite object map values (no shipped
    // `mapValues` / fromEntries on Router). Fail at generate rather than emit a
    // GraphQL-shaped payload Apache readers reject.
    if (valResolved.type === TType.BOOL) {
      throw new Error(
        `Thrift map with bool values cannot be emitted as TJSON @connect body: Connectors have no public Router-safe way to rewrite object map values to 0/1. Prefer scalar bool args, change the IDL, or hand-author the @connect body.`,
      );
    }
    if (
      valResolved.type === TType.STRUCT ||
      valResolved.type === TType.LIST ||
      valResolved.type === TType.SET ||
      valResolved.type === TType.MAP
    ) {
      throw new Error(
        `Thrift map with composite values cannot be emitted as TJSON @connect body: Connectors have no public Router-safe way to convert each map value to TJSON. Prefer scalar map values, change the IDL, use binary protocol, or hand-author the @connect body.`,
      );
    }
    return `{ "${tag}": $([ "${keyTag}", "${valTag}", ${valueExpr}->size, ${valueExpr} ]) }`;
  }

  // TJSON bool is integer 0/1 (reference readers use ReadI32 / readJSONInteger).
  // Apollo-compatible `match` - works on Hive Mesh eval and Router Connectors.
  if (resolved.type === TType.BOOL) {
    return `{ "${tag}": ${valueExpr}->match([true, 1], [false, 0], [@, 0]) }`;
  }

  // Thrift enums are i32 on the wire; GraphQL may carry the member name after SDL print.
  if (resolved.type === TType.ENUM && resolved.values && Object.keys(resolved.values).length) {
    const arms = Object.entries(resolved.values)
      .map(([name, n]) => `["${name}", ${n}]`)
      .join(', ');
    return `{ "${tag}": ${valueExpr}->match(${arms}, [@, ${valueExpr}]) }`;
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
 * JSON-mode GraphQL enums use member names — map wire i32 → name in TJSON selection.
 * `mapOverList` wraps with `->map(...)` for list/set element projections.
 */
function tjsonEnumWireToNameSuffix(
  resolved: Extract<TypeVal, { type: TType.ENUM }>,
  mapOverList: boolean,
): string | undefined {
  if (!resolved.values || !Object.keys(resolved.values).length) {
    return undefined;
  }
  const arms = Object.entries(resolved.values)
    .map(([name, n]) => `[${n}, "${name}"]`)
    .join(', ');
  return mapOverList ? `->map(@->match(${arms}, [@, @]))` : `->match(${arms}, [@, @])`;
}

/**
 * list/set success selection as a pure expression (safe inside `match` arms).
 * Struct elements use `->map(@->{ … })` instead of trailing NamedSelection braces.
 */
function buildTJSONListSetSelectionExpr(returnTypeVal: TypeVal, topTypeMap: TypeMap): string {
  const resolved = resolveTypeVal(returnTypeVal, topTypeMap);
  if (resolved.type !== TType.LIST && resolved.type !== TType.SET) {
    throw new Error('buildTJSONListSetSelectionExpr requires LIST or SET');
  }
  const tag = tjsonTypeTag(returnTypeVal, topTypeMap);
  const elemResolved = resolveTypeVal(resolved.elementType, topTypeMap);
  const base = `$->get(4)->get("0")->get("${tag}")->slice(2)`;
  if (elemResolved.type === TType.STRUCT) {
    // TJSON list/set of structs: ["rec", n, { "1":… }, …] — elements are bare
    // field maps (no per-element `rec` wrapper). Project from `@` directly.
    // Seed seenStructs with the element type so `list<Node>` + `Node.children:
    // list<Node>` hits the bounded leaf projection instead of overflowing.
    const elemName = elemResolved.name || 'Anon';
    const nextSeen = new Set<string>([elemName]);
    const nested = Object.entries(elemResolved.fields)
      .map(([fieldName, fieldType]) =>
        formatTJSONLitProperty(fieldName, fieldType, topTypeMap, '@', nextSeen),
      )
      .join(',\n    ');
    return `${base}->map(@->{\n    ${nested}\n  })`;
  }
  if (elemResolved.type === TType.ENUM) {
    const suffix = tjsonEnumWireToNameSuffix(elemResolved, true);
    if (suffix) {
      return `${base}${suffix}`;
    }
  }
  return base;
}

/**
 * TJSON `@connect(selection:)` — peel message envelope index 4, success field `"0"`.
 */
export function buildTJSONConnectSelection(
  returnTypeVal: TypeVal | undefined,
  topTypeMap: TypeMap,
): string {
  if (!returnTypeVal || returnTypeVal.type === TType.VOID) {
    // Void/ONEWAY — `$(null)` literal (bare `null` is a field path in Hive/NamedSelection).
    return '$(null)';
  }
  const resolved = resolveTypeVal(returnTypeVal, topTypeMap);
  if (resolved.type === TType.VOID) {
    return '$(null)';
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
    if (elemResolved.type === TType.ENUM) {
      const suffix = tjsonEnumWireToNameSuffix(elemResolved, true);
      if (suffix) {
        return `${base}${suffix}`;
      }
    }
    return base;
  }
  if (resolved.type === TType.MAP) {
    const tag = tjsonTypeTag(returnTypeVal, topTypeMap);
    return `$->get(4)->get("0")->get("${tag}")->get(3)`;
  }
  if (resolved.type === TType.ENUM) {
    const suffix = tjsonEnumWireToNameSuffix(resolved, false);
    if (suffix) {
      const tag = tjsonTypeTag(returnTypeVal, topTypeMap);
      return `$->get(4)->get("0")->get("${tag}")${suffix}`;
    }
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
 *
 * Emitted as a single `$({ … })` literal so Hive/Mesh does not treat the TJSON
 * message array as a GraphQL list and map NamedSelection per element. Bool
 * literals use `$(true)` (bare `true` is a field path).
 */
export function buildTJSONUnionConnectSelection(
  returnTypeVal: TypeVal | undefined,
  throws: Array<{ id: number; name: string; typeName: string }>,
  topTypeMap: TypeMap,
): string {
  const resolvedReturn = returnTypeVal ? resolveTypeVal(returnTypeVal, topTypeMap) : undefined;
  const props: string[] = [];
  // One LitObject key per GraphQL name. Success + exception sources that share
  // names (`value`, `ok`, `message`, …) are gated then coalesced with `??` so a
  // later inactive projection cannot overwrite an active one with null/empty.
  const fieldExprs = new Map<string, string[]>();
  const pushField = (graphqlName: string, expr: string) => {
    const list = fieldExprs.get(graphqlName) || [];
    list.push(expr);
    fieldExprs.set(graphqlName, list);
  };
  const gateOnThrow = (fid: string, expr: string): string =>
    `$->get(4)->get("${fid}")->ne(null)->match([true, ${expr}], [@, null])`;
  // Inactive success must yield null (not false / empty object) so `??` can fall through.
  const gateOnField0 = (expr: string): string =>
    `$->get(4)->get("0")->ne(null)->match([true, ${expr}], [@, null])`;
  const gateOnVoidSuccess = (expr: string): string =>
    `$->get(4)->size->eq(0)->match([true, ${expr}], [@, null])`;

  if (!resolvedReturn || resolvedReturn.type === TType.VOID) {
    // Void success member is `ok: Boolean!` (not `value: Void!`).
    pushField('ok', gateOnVoidSuccess('true'));
  } else if (resolvedReturn.type === TType.STRUCT) {
    // Stamp field-0 presence so resolveType does not treat an empty `{}` value
    // projection (exception reply: no "0") as success.
    props.push('field0: $->get(4)->get("0")->ne(null)');
    const nested = Object.entries(resolvedReturn.fields)
      .map(([n, t]) => formatTJSONLitProperty(n, t, topTypeMap, '$->get(4)->get("0")->get("rec")'))
      .join(',\n    ');
    pushField('value', gateOnField0(`$({\n    ${nested}\n  })`));
  } else if (resolvedReturn.type === TType.LIST || resolvedReturn.type === TType.SET) {
    // Match arms go through evalPath — trailing NamedSelection `{ … }` after
    // slice(2) is not a method call, so emit element projection as `->map(...)`.
    pushField('value', gateOnField0(buildTJSONListSetSelectionExpr(returnTypeVal!, topTypeMap)));
  } else {
    pushField('value', gateOnField0(buildTJSONConnectSelection(returnTypeVal, topTypeMap)));
  }

  for (const t of throws) {
    const typeVal = topTypeMap[t.typeName];
    const fid = String(t.id);
    const parent = `$->get(4)->get("${fid}")->get("rec")`;
    // Discriminator for resolveType when exceptions share field names (e.g. message).
    props.push(`__throw_${t.typeName}: $->get(4)->get("${fid}")->ne(null)`);
    if (typeVal && typeVal.type === TType.STRUCT) {
      for (const [fieldName, fieldType] of Object.entries(typeVal.fields)) {
        const lit = formatTJSONLitProperty(fieldName, fieldType, topTypeMap, parent);
        const colon = lit.indexOf(':');
        const raw = colon >= 0 ? lit.slice(colon + 1).trim() : lit;
        pushField(fieldName, gateOnThrow(fid, raw));
      }
    } else {
      pushField('message', gateOnThrow(fid, `${parent}->get("1")->get("str")`));
    }
  }
  for (const [fieldName, exprs] of fieldExprs) {
    // Wrap multi-source fields in `$()` so `??` runs through Apollo LitExpr /
    // dollar-paren eval (bare LitObject values do not coalesce).
    props.push(
      exprs.length > 1 ? `${fieldName}: $(${exprs.join(' ?? ')})` : `${fieldName}: ${exprs[0]}`,
    );
  }
  return `$({\n  ${props.join(',\n  ')}\n})`;
}

/** LitObject property `name: expr` for `$({ … })` union selections (no NamedSelection braces). */
function formatTJSONLitProperty(
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
    const nested = Object.entries(resolved.fields)
      .map(([childName, childType]) =>
        formatTJSONLitProperty(
          childName,
          childType,
          topTypeMap,
          `${fieldPath}->get("rec")`,
          nextSeen,
        ),
      )
      .join(',\n    ');
    return `${graphqlName}: $({\n    ${nested}\n  })`;
  }

  if (resolved.type === TType.LIST || resolved.type === TType.SET) {
    const listPath = `${fieldPath}->get("${tag}")->slice(2)`;
    const elemResolved = resolveTypeVal(resolved.elementType, topTypeMap);
    if (elemResolved.type === TType.STRUCT) {
      // Nested list/set of structs: elements are bare field maps — map from `@`.
      const elemName = elemResolved.name || graphqlName;
      if (seenStructs.has(elemName)) {
        // Cycle: keep element field projections as leaves (no further nesting).
        const nested = Object.entries(elemResolved.fields)
          .map(([childName, childType]) => {
            const cid = String(childType.id ?? 1);
            const ctag = tjsonTypeTag(childType, topTypeMap);
            return `${childName}: @->get("${cid}")->get("${ctag}")`;
          })
          .join(',\n    ');
        return `${graphqlName}: ${listPath}->map(@->{\n    ${nested}\n  })`;
      }
      const nextSeen = new Set(seenStructs);
      nextSeen.add(elemName);
      const nested = Object.entries(elemResolved.fields)
        .map(([childName, childType]) =>
          formatTJSONLitProperty(childName, childType, topTypeMap, '@', nextSeen),
        )
        .join(',\n    ');
      return `${graphqlName}: ${listPath}->map(@->{\n    ${nested}\n  })`;
    }
    if (elemResolved.type === TType.ENUM) {
      const suffix = tjsonEnumWireToNameSuffix(elemResolved, true);
      if (suffix) {
        return `${graphqlName}: ${listPath}${suffix}`;
      }
    }
    return `${graphqlName}: ${listPath}`;
  }

  if (resolved.type === TType.MAP) {
    return `${graphqlName}: ${fieldPath}->get("${tag}")->get(3)`;
  }

  if (resolved.type === TType.ENUM) {
    const suffix = tjsonEnumWireToNameSuffix(resolved, false);
    if (suffix) {
      return `${graphqlName}: ${fieldPath}->get("${tag}")${suffix}`;
    }
  }

  return `${graphqlName}: ${fieldPath}->get("${tag}")`;
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
    if (elemResolved.type === TType.ENUM) {
      const suffix = tjsonEnumWireToNameSuffix(elemResolved, true);
      if (suffix) {
        return `${graphqlName}: ${listPath}${suffix}`;
      }
    }
    return `${graphqlName}: ${listPath}`;
  }

  if (resolved.type === TType.MAP) {
    return `${graphqlName}: ${fieldPath}->get("${tag}")->get(3)`;
  }

  if (resolved.type === TType.ENUM) {
    const suffix = tjsonEnumWireToNameSuffix(resolved, false);
    if (suffix) {
      return `${graphqlName}: ${fieldPath}->get("${tag}")${suffix}`;
    }
  }

  return `${graphqlName}: ${fieldPath}->get("${tag}")`;
}

export function thriftJsonContentTypeHeaders(): Array<{ name: string; value: string }> {
  return [
    { name: 'Content-Type', value: 'application/vnd.apache.thrift.json' },
    { name: 'Accept', value: 'application/vnd.apache.thrift.json' },
  ];
}
