import { TType } from '@creditkarma/thrift-server-core';
import { parseCompactArgsToTypeMap } from '../src/compact-mapping.js';

describe('parseCompactArgsToTypeMap map-of-struct', () => {
  it('preserves MAP wire type and puts descriptors on valType.fields', () => {
    const map = parseCompactArgsToTypeMap(`1(map<string, struct>): $args.items {
  7(i32): value
}`);
    const items = map.items;
    expect(items.type).toBe(TType.MAP);
    if (items.type !== TType.MAP) throw new Error('expected MAP');
    expect(items.keyType.type).toBe(TType.STRING);
    expect(items.valType.type).toBe(TType.STRUCT);
    if (items.valType.type !== TType.STRUCT) throw new Error('expected STRUCT val');
    expect(items.valType.fields.value?.type).toBe(TType.I32);
    expect(items.valType.fields.value?.id).toBe(7);
  });

  it('preserves LIST→MAP→STRUCT for list<map<string, struct>> and field 7', () => {
    const map = parseCompactArgsToTypeMap(`1(list<map<string, struct>>): $args.batches {
  7(i32): value
}`);
    const batches = map.batches;
    expect(batches.type).toBe(TType.LIST);
    if (batches.type !== TType.LIST) throw new Error('expected LIST');
    expect(batches.elementType.type).toBe(TType.MAP);
    if (batches.elementType.type !== TType.MAP) throw new Error('expected MAP element');
    expect(batches.elementType.keyType.type).toBe(TType.STRING);
    expect(batches.elementType.valType.type).toBe(TType.STRUCT);
    if (batches.elementType.valType.type !== TType.STRUCT) throw new Error('expected STRUCT val');
    expect(batches.elementType.valType.fields.value?.type).toBe(TType.I32);
    expect(batches.elementType.valType.fields.value?.id).toBe(7);
  });
});
