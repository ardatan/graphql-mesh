import { describe, expect, it } from '@jest/globals';
import { decodeMessage, encodeMessage } from '../src/protobuf/codec.js';
import { parseMapping } from '../src/protobuf/mapping.js';

describe('protobuf mapping + codec', () => {
  it('roundtrips MovieRequest-like body', () => {
    const fields = parseMapping(`
      1(message): input.movie {
        2(int64): year
        6(enum{UNSPECIFIED=0,ACTION=1,DRAMA=2}): genre
      }
    `);
    const bytes = encodeMessage(fields, {
      input: { movie: { year: 2015, genre: 'DRAMA' } },
    });
    expect(bytes.length).toBeGreaterThan(0);
    const decoded = decodeMessage(
      parseMapping(`
        1(message): movie {
          2(int64): year
          6(enum{UNSPECIFIED=0,ACTION=1,DRAMA=2}): genre
        }
      `),
      bytes,
    );
    expect(decoded.movie.year).toBe(2015);
    expect(decoded.movie.genre).toBe('DRAMA');
  });

  it('parses repeated message selection', () => {
    const fields = parseMapping(`
      1(repeated message): result {
        1(string): name
        2(int64): year
      }
    `);
    expect(fields[0].type.kind).toBe('repeated');
    expect(fields[0].fields?.[0].bind).toBe('name');
  });

  it('skips # documentation comments', () => {
    const fields = parseMapping(`
      # Encode GraphQL field arguments into the protobuf request message.
      1(message): input.movie {
        # year is int64 on the wire
        2(int64): year
      }
    `);
    expect(fields).toHaveLength(1);
    expect(fields[0].fields?.[0].bind).toBe('year');
  });

  it('resolves $args message binds as child roots', () => {
    const fields = parseMapping(`1(message): $args.input { 1(string): name }`);
    const bytes = encodeMessage(fields, { input: { name: 'Ada' } });
    const decoded = decodeMessage(parseMapping(`1(message): input { 1(string): name }`), bytes);
    expect(decoded.input.name).toBe('Ada');
  });

  it('preserves empty-message presence when bind is {}', () => {
    const fields = parseMapping(`1(message): input { 1(string): name }`);
    const bytes = encodeMessage(fields, { input: {} });
    expect(bytes.length).toBeGreaterThan(0);
    const decoded = decodeMessage(fields, bytes);
    expect(decoded.input).toEqual({ name: '' });
  });

  it('encodes bool map keys from Object.entries strings', () => {
    const fields = parseMapping(`1(map<bool,string>): flags`);
    const bytes = encodeMessage(fields, { flags: { true: 'yes', false: 'no' } });
    const decoded = decodeMessage(fields, bytes);
    expect(decoded.flags.true ?? decoded.flags[true as any]).toBe('yes');
    expect(decoded.flags.false ?? decoded.flags[false as any]).toBe('no');
  });

  it('decodes packed repeated int32', () => {
    // tag 1, wire 2 → 0x0a; length 2; values 1, 2
    const bytes = Uint8Array.from([0x0a, 0x02, 0x01, 0x02]);
    const decoded = decodeMessage(parseMapping(`1(repeated int32): values`), bytes);
    expect(decoded.values).toEqual([1, 2]);
  });

  it('decodes signed int32/int64 from varint two’s complement', () => {
    const fields = parseMapping(`1(int32): a 2(int64): b`);
    const bytes = encodeMessage(fields, { a: -1, b: -2 });
    const decoded = decodeMessage(fields, bytes);
    expect(decoded.a).toBe(-1);
    expect(decoded.b).toBe(-2);
  });

  it('materializes proto3 scalar defaults for absent implicit-presence fields', () => {
    const decoded = decodeMessage(
      parseMapping(`1(bool): enabled 2(string): name 3(int32): count`),
      new Uint8Array(),
    );
    expect(decoded).toEqual({ enabled: false, name: '', count: 0 });
  });

  it('leaves absent explicit optional scalars undefined (presence)', () => {
    const fields = parseMapping(`1(optional bool): enabled 2(optional string): name`);
    expect(fields[0].presence).toBe('explicit');
    const absent = decodeMessage(fields, new Uint8Array());
    expect(absent).toEqual({});
    expect(absent.enabled).toBeUndefined();
    expect(absent.name).toBeUndefined();
    const present = decodeMessage(fields, encodeMessage(fields, { enabled: false, name: '' }));
    expect(present.enabled).toBe(false);
    expect(present.name).toBe('');
  });

  it('roundtrips sint32 ZigZag', () => {
    const fields = parseMapping(`1(sint32): n`);
    const bytes = encodeMessage(fields, { n: -1 });
    expect(Array.from(bytes)).toEqual([0x08, 0x01]);
    expect(decodeMessage(fields, bytes).n).toBe(-1);
  });

  it('parses map<message> nested fields without dropping map kind', () => {
    const fields = parseMapping(`1(map<string,message>): movies { 1(string): name }`);
    expect(fields[0].type.kind).toBe('map');
    if (fields[0].type.kind === 'map') {
      expect(fields[0].type.value.kind).toBe('message');
    }
  });

  it('resolves message& self-refs and round-trips nested recursion', () => {
    const fields = parseMapping(`
      1(string): name
      2(message&): child
    `);
    expect(fields[1].fields).toBe(fields);
    const bytes = encodeMessage(fields, {
      name: 'a',
      child: { name: 'b', child: { name: 'c' } },
    });
    expect(decodeMessage(fields, bytes)).toEqual({
      name: 'a',
      child: { name: 'b', child: { name: 'c' } },
    });
  });

  it('rejects truncated packed repeated payloads', () => {
    const fields = parseMapping(`1(repeated int32): values`);
    // Tag 1 wire-len, length=2, but only one payload byte → truncated.
    const truncated = Uint8Array.from([0x0a, 0x02, 0x01]);
    expect(() => decodeMessage(fields, truncated)).toThrow(/Truncated packed|Invalid packed/);
  });

  it('maps negative enum wire values to names (signed int32)', () => {
    const fields = parseMapping(`1(enum{UNKNOWN=-1,OK=0}): status`);
    const bytes = encodeMessage(fields, { status: 'UNKNOWN' });
    expect(decodeMessage(fields, bytes).status).toBe('UNKNOWN');
  });

  it('dual $this.parent|$args.arg: prefers parent id over args.requestId', () => {
    const fields = parseMapping(`1(string): $this.id|$args.requestId`);
    const bytes = encodeMessage(
      fields,
      { requestId: 'from-args' },
      { requestId: 'from-args' },
      { id: 'from-parent' },
    );
    expect(decodeMessage(parseMapping(`1(string): value`), bytes).value).toBe('from-parent');
  });

  it('dual $this.id|$args.requestId: empty parent falls back to args.requestId', () => {
    const fields = parseMapping(`1(string): $this.id|$args.requestId`);
    const bytes = encodeMessage(
      fields,
      { requestId: 'from-args' },
      { requestId: 'from-args' },
      {},
    );
    expect(decodeMessage(parseMapping(`1(string): value`), bytes).value).toBe('from-args');
  });

  it('dual $this.petId|$args.friendId: missing parent key uses args.friendId', () => {
    const fields = parseMapping(`1(string): $this.petId|$args.friendId`);
    const bytes = encodeMessage(
      fields,
      { friendId: 'from-args' },
      { friendId: 'from-args' },
      { other: 'x' },
    );
    expect(decodeMessage(parseMapping(`1(string): value`), bytes).value).toBe('from-args');
  });

  it('dual $this.petId|$args.friendId: parent petId wins over args', () => {
    const fields = parseMapping(`1(string): $this.petId|$args.friendId`);
    const bytes = encodeMessage(
      fields,
      { friendId: 'from-args' },
      { friendId: 'from-args' },
      { petId: 'from-parent' },
    );
    expect(decodeMessage(parseMapping(`1(string): value`), bytes).value).toBe('from-parent');
  });
});
