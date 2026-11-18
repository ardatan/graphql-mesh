import { TType } from '@creditkarma/thrift-server-core';
import {
  applyCompactSelection,
  enumNameToWire,
  parseCompactArgsToTypeMap,
  parseCompactSelection,
} from '../src/compact-mapping.js';

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

describe('compact i32 ->match name↔i32', () => {
  const nameToWire =
    '->match(["TWEET", 0], ["RETWEET", 2], ["DM", 10], ["REPLY", 11], [@, 0])';
  const wireToName =
    '->match([0, "TWEET"], [2, "RETWEET"], [10, "DM"], [11, "REPLY"], [@, @])';

  it('parses args i32->match into TypeVal.values', () => {
    const map = parseCompactArgsToTypeMap(`5(i32): $args.tweetType${nameToWire}`);
    expect(map.tweetType.type).toBe(TType.ENUM);
    expect((map.tweetType as any).values).toEqual({
      TWEET: 0,
      RETWEET: 2,
      DM: 10,
      REPLY: 11,
    });
  });

  it('coerces GraphQL names to wire i32 for write', () => {
    const map = parseCompactArgsToTypeMap(`5(i32): $args.tweetType${nameToWire}`);
    const values = (map.tweetType as any).values as Record<string, number>;
    expect(enumNameToWire('RETWEET', values)).toBe(2);
    expect(enumNameToWire('DM', values)).toBe(10);
    expect(enumNameToWire(2, values)).toBe(2);
    expect(enumNameToWire('UNKNOWN', values)).toBe(0);
  });

  it('projects wire i32 to GraphQL names in selection', () => {
    const selection = parseCompactSelection(`tweetType: 5(i32)${wireToName}`);
    expect(applyCompactSelection(selection, new Map([[5, 2]]))).toEqual({
      tweetType: 'RETWEET',
    });
    expect(applyCompactSelection(selection, new Map([[5, 10]]))).toEqual({
      tweetType: 'DM',
    });
  });

  it('projects scalar and list enum roots', () => {
    expect(
      applyCompactSelection(parseCompactSelection(`$(i32)${wireToName}`), 2),
    ).toBe('RETWEET');
    expect(
      applyCompactSelection(
        parseCompactSelection(`$(list)->map(@${wireToName})`),
        [0, 2, 10],
      ),
    ).toEqual(['TWEET', 'RETWEET', 'DM']);
  });
});
