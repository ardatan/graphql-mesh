import {
  type MappingField,
  type ProtoType,
  resolveBind,
} from './mapping.js';

const WIRE_VARINT = 0;
const WIRE_64 = 1;
const WIRE_LEN = 2;
const WIRE_32 = 5;

export function encodeMessage(
  fields: MappingField[],
  args: Record<string, any>,
  localRoot: Record<string, any> = args,
): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const field of fields) {
    writeField(chunks, field, args, localRoot);
  }
  return concat(chunks);
}

function resolveFieldValue(
  bind: string | undefined,
  args: Record<string, any>,
  localRoot: Record<string, any>,
): any {
  if (bind == null || bind === '') return undefined;
  if (bind.startsWith('$args')) return resolveBind(bind, args);
  return resolveBind(bind, localRoot);
}

function writeField(
  chunks: Uint8Array[],
  field: MappingField,
  args: Record<string, any>,
  localRoot: Record<string, any>,
) {
  const type = field.type;
  if (type.kind === 'message') {
    let childRoot = localRoot;
    if (field.bind != null && !field.bind.startsWith('$args')) {
      const fromLocal = resolveBind(field.bind, localRoot);
      if (fromLocal != null && typeof fromLocal === 'object') {
        childRoot = fromLocal;
      }
    }
    const nestedFields = field.fields ?? type.fields;
    const nested = encodeMessage(nestedFields, args, childRoot);
    if (nested.length === 0) return;
    writeTag(chunks, field.id, WIRE_LEN);
    writeVarint(chunks, nested.length);
    chunks.push(nested);
    return;
  }

  if (type.kind === 'repeated') {
    const list = resolveFieldValue(field.bind, args, localRoot);
    if (!Array.isArray(list)) return;
    const elementType: ProtoType =
      type.element.kind === 'message' && field.fields?.length
        ? { kind: 'message', fields: field.fields }
        : type.element;
    for (const item of list) {
      writeValue(chunks, field.id, elementType, item);
    }
    return;
  }

  const value = resolveFieldValue(field.bind, args, localRoot);
  if (value === undefined || value === null) return;
  writeValue(chunks, field.id, type, value);
}

function writeValue(
  chunks: Uint8Array[],
  id: number,
  type: ProtoType,
  value: any,
) {
  if (type.kind === 'scalar') {
    switch (type.name) {
      case 'bool':
        writeTag(chunks, id, WIRE_VARINT);
        writeVarint(chunks, value ? 1 : 0);
        return;
      case 'int32':
      case 'uint32':
      case 'int64':
      case 'uint64':
        writeTag(chunks, id, WIRE_VARINT);
        writeVarint(chunks, toLongish(value));
        return;
      case 'sint32':
        writeTag(chunks, id, WIRE_VARINT);
        writeVarint(chunks, zigzag32(Number(value)));
        return;
      case 'sint64':
        writeTag(chunks, id, WIRE_VARINT);
        writeVarint(chunks, zigzag64(toLongish(value)));
        return;
      case 'fixed32':
      case 'sfixed32':
        writeTag(chunks, id, WIRE_32);
        writeFixed32(chunks, Number(value) >>> 0);
        return;
      case 'fixed64':
      case 'sfixed64':
        writeTag(chunks, id, WIRE_64);
        writeFixed64(chunks, toLongish(value));
        return;
      case 'float':
        writeTag(chunks, id, WIRE_32);
        writeFloat32(chunks, Number(value));
        return;
      case 'double':
        writeTag(chunks, id, WIRE_64);
        writeFloat64(chunks, Number(value));
        return;
      case 'string': {
        const bytes = new TextEncoder().encode(String(value));
        writeTag(chunks, id, WIRE_LEN);
        writeVarint(chunks, bytes.length);
        chunks.push(bytes);
        return;
      }
      case 'bytes': {
        const bytes =
          value instanceof Uint8Array
            ? value
            : typeof value === 'string'
              ? new TextEncoder().encode(value)
              : new Uint8Array(value);
        writeTag(chunks, id, WIRE_LEN);
        writeVarint(chunks, bytes.length);
        chunks.push(bytes);
        return;
      }
      default:
        throw new Error(`Unsupported scalar ${type.name}`);
    }
  }
  if (type.kind === 'enum') {
    const num =
      typeof value === 'number'
        ? value
        : type.values[String(value)] ?? type.values[String(value).toUpperCase()];
    if (num == null) {
      throw new Error(`Unknown enum value ${value}`);
    }
    writeTag(chunks, id, WIRE_VARINT);
    writeVarint(chunks, num);
    return;
  }
  if (type.kind === 'message') {
    const nested = encodeMessage(type.fields, value ?? {});
    writeTag(chunks, id, WIRE_LEN);
    writeVarint(chunks, nested.length);
    chunks.push(nested);
    return;
  }
  if (type.kind === 'map') {
    // value should be object; each entry is a synthetic message key=1 value=2
    const obj = value ?? {};
    for (const [k, v] of Object.entries(obj)) {
      const entry = encodeMessage(
        [
          { id: 1, type: type.key, bind: 'key' },
          { id: 2, type: type.value, bind: 'value' },
        ],
        { key: k, value: v },
      );
      writeTag(chunks, id, WIRE_LEN);
      writeVarint(chunks, entry.length);
      chunks.push(entry);
    }
    return;
  }
}

export function decodeMessage(
  fields: MappingField[],
  data: Uint8Array,
): Record<string, any> {
  const byId = new Map(fields.map(f => [f.id, f]));
  const out: Record<string, any> = {};
  let i = 0;
  while (i < data.length) {
    const tag = readVarint(data, i);
    i = tag.next;
    const tagNum = Number(tag.value);
    const id = tagNum >>> 3;
    const wire = tagNum & 7;
    const field = byId.get(id);
    if (!field) {
      i = skipWire(data, i, wire);
      continue;
    }
    let typeForRead: ProtoType = field.type;
    if (field.type.kind === 'message' && field.fields?.length) {
      typeForRead = { kind: 'message', fields: field.fields };
    } else if (field.type.kind === 'repeated' && field.type.element.kind === 'message' && field.fields?.length) {
      typeForRead = {
        kind: 'repeated',
        element: { kind: 'message', fields: field.fields },
      };
    }
    const decoded = readValue(data, i, wire, typeForRead);
    i = decoded.next;
    const key = field.bind && !field.bind.startsWith('$') ? field.bind : `_${id}`;
    if (field.type.kind === 'map') {
      const entry = decoded.value as { key: any; value: any };
      out[key] = out[key] ?? {};
      out[key][entry.key] = entry.value;
    } else if (field.type.kind === 'repeated') {
      out[key] = out[key] ?? [];
      out[key].push(decoded.value);
    } else {
      out[key] = decoded.value;
    }
  }
  // Map enum numbers back to names when bind keys used
  for (const field of fields) {
    const key = field.bind && !field.bind.startsWith('$') ? field.bind : `_${field.id}`;
    if (field.type.kind === 'enum' && out[key] != null && typeof out[key] === 'number') {
      const name = Object.entries(field.type.values).find(([, n]) => n === out[key])?.[0];
      if (name) out[key] = name;
    }
    if (field.type.kind === 'repeated' && field.type.element.kind === 'enum' && Array.isArray(out[key])) {
      out[key] = out[key].map((n: any) => {
        if (typeof n !== 'number') return n;
        return (
          Object.entries(field.type.element.values).find(([, v]) => v === n)?.[0] ?? n
        );
      });
    }
  }
  return out;
}

function readValue(
  data: Uint8Array,
  i: number,
  wire: number,
  type: ProtoType,
): { value: any; next: number; raw?: Uint8Array } {
  if (type.kind === 'repeated') {
    // element fields carried on parent MappingField are applied by caller via typeForRead
    return readValue(data, i, wire, type.element);
  }
  if (type.kind === 'map') {
    const len = readVarint(data, i);
    const end = len.next + Number(len.value);
    const raw = data.subarray(len.next, end);
    const entry = decodeMessage(
      [
        { id: 1, type: type.key, bind: 'key' },
        { id: 2, type: type.value, bind: 'value' },
      ],
      raw,
    );
    return { value: entry, next: end, raw };
  }
  if (type.kind === 'message' || (type.kind === 'scalar' && (type.name === 'string' || type.name === 'bytes'))) {
    const len = readVarint(data, i);
    const end = len.next + Number(len.value);
    const raw = data.subarray(len.next, end);
    if (type.kind === 'scalar' && type.name === 'string') {
      return { value: new TextDecoder().decode(raw), next: end, raw };
    }
    if (type.kind === 'scalar' && type.name === 'bytes') {
      return { value: raw, next: end, raw };
    }
    return { value: decodeMessage(type.fields, raw), next: end, raw };
  }
  if (wire === WIRE_VARINT) {
    const v = readVarint(data, i);
    let value: number | bigint = v.value;
    if (type.kind === 'scalar' && type.name === 'sint32') value = unzigzag32(Number(v.value));
    else if (type.kind === 'scalar' && type.name === 'sint64') value = unzigzag64(v.value);
    else if (type.kind === 'scalar' && type.name === 'bool') value = Number(v.value) !== 0;
    else if (type.kind === 'enum') value = Number(v.value);
    else if (
      type.kind === 'scalar' &&
      (type.name === 'int32' ||
        type.name === 'uint32' ||
        type.name === 'int64' ||
        type.name === 'uint64')
    ) {
      // Prefer Number when safe for GraphQL Int / Float paths
      const asNum = Number(v.value);
      value = BigInt(asNum) === v.value && Number.isSafeInteger(asNum) ? asNum : v.value;
    }
    return { value, next: v.next };
  }
  if (wire === WIRE_32) {
    const view = new DataView(data.buffer, data.byteOffset + i, 4);
    let value: number;
    if (type.kind === 'scalar' && type.name === 'float') value = view.getFloat32(0, true);
    else value = view.getUint32(0, true);
    return { value, next: i + 4 };
  }
  if (wire === WIRE_64) {
    const view = new DataView(data.buffer, data.byteOffset + i, 8);
    let value: number | bigint;
    if (type.kind === 'scalar' && type.name === 'double') value = view.getFloat64(0, true);
    else value = view.getBigUint64(0, true);
    return { value, next: i + 8 };
  }
  if (wire === WIRE_LEN) {
    const len = readVarint(data, i);
    const n = Number(len.value);
    return { value: data.subarray(len.next, len.next + n), next: len.next + n };
  }
  throw new Error(`Unsupported wire type ${wire}`);
}

function skipWire(data: Uint8Array, i: number, wire: number): number {
  if (wire === WIRE_VARINT) return readVarint(data, i).next;
  if (wire === WIRE_64) return i + 8;
  if (wire === WIRE_32) return i + 4;
  if (wire === WIRE_LEN) {
    const len = readVarint(data, i);
    return len.next + Number(len.value);
  }
  throw new Error(`Cannot skip wire type ${wire}`);
}

function writeTag(chunks: Uint8Array[], id: number, wire: number) {
  writeVarint(chunks, (id << 3) | wire);
}

function writeVarint(chunks: Uint8Array[], value: number | bigint) {
  let n = typeof value === 'bigint' ? value : BigInt(Math.trunc(Number(value)));
  if (n < 0n) {
    n = (1n << 64n) + n;
  }
  const out: number[] = [];
  while (n > 0x7fn) {
    out.push(Number((n & 0x7fn) | 0x80n));
    n >>= 7n;
  }
  out.push(Number(n));
  chunks.push(Uint8Array.from(out));
}

function readVarint(
  data: Uint8Array,
  i: number,
): { value: bigint; next: number } {
  let result = 0n;
  let shift = 0n;
  let pos = i;
  while (pos < data.length) {
    const b = data[pos++];
    result |= BigInt(b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7n;
  }
  return { value: result, next: pos };
}

function writeFixed32(chunks: Uint8Array[], value: number) {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, value, true);
  chunks.push(buf);
}

function writeFixed64(chunks: Uint8Array[], value: number | bigint) {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, BigInt(value), true);
  chunks.push(buf);
}

function writeFloat32(chunks: Uint8Array[], value: number) {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setFloat32(0, value, true);
  chunks.push(buf);
}

function writeFloat64(chunks: Uint8Array[], value: number) {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setFloat64(0, value, true);
  chunks.push(buf);
}

function zigzag32(n: number): number {
  return (n << 1) ^ (n >> 31);
}

function zigzag64(n: number | bigint): bigint {
  const v = BigInt(n);
  return (v << 1n) ^ (v >> 63n);
}

function unzigzag32(n: number): number {
  return (n >>> 1) ^ -(n & 1);
}

function unzigzag64(n: bigint): bigint {
  return (n >> 1n) ^ -(n & 1n);
}

function toLongish(value: any): number | bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'string') return BigInt(value);
  return Math.trunc(Number(value));
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
