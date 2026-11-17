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

  it('materializes proto3 scalar defaults for absent fields', () => {
    const decoded = decodeMessage(
      parseMapping(`1(bool): enabled 2(string): name 3(int32): count`),
      new Uint8Array(),
    );
    expect(decoded).toEqual({ enabled: false, name: '', count: 0 });
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
});
