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
});
