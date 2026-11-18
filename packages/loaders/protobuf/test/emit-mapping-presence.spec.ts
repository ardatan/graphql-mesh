import type { INamespace } from 'protobufjs';
import { describe, expect, it } from '@jest/globals';
import { decodeMessage, encodeMessage } from '../../../transports/protobuf/src/protobuf/codec.js';
import { parseMapping } from '../../../transports/protobuf/src/protobuf/mapping.js';
import { emitResponseSelection } from '../src/emitMapping.js';

describe('emitMapping explicit presence (optional + oneof)', () => {
  const rootJson = {
    nested: {
      Kind: {
        oneofs: {
          choice: {
            oneof: ['name', 'flag'],
          },
          _maybe: {
            oneof: ['maybe'],
          },
        },
        fields: {
          name: { type: 'string', id: 1 },
          flag: { type: 'bool', id: 2 },
          maybe: {
            type: 'string',
            id: 3,
            options: { proto3_optional: true },
          },
          always: { type: 'string', id: 4 },
        },
      },
    },
  } as INamespace;

  it('emits optional for oneof members and proto3_optional, not for implicit scalars', () => {
    const mapping = emitResponseSelection(rootJson, [], 'Kind');
    expect(mapping).toMatch(/1\(optional string\):\s*name/);
    expect(mapping).toMatch(/2\(optional bool\):\s*flag/);
    expect(mapping).toMatch(/3\(optional string\):\s*maybe/);
    expect(mapping).toMatch(/4\(string\):\s*always/);
    expect(mapping).not.toMatch(/4\(optional string\)/);
  });

  it('loader→decoder: absent oneof members stay undefined; selected member is present', () => {
    const mapping = emitResponseSelection(rootJson, [], 'Kind');
    const fields = parseMapping(mapping);
    expect(fields.find(f => f.bind === 'name')?.presence).toBe('explicit');
    expect(fields.find(f => f.bind === 'flag')?.presence).toBe('explicit');
    expect(fields.find(f => f.bind === 'always')?.presence).toBe('implicit');

    const absent = decodeMessage(fields, new Uint8Array());
    expect(absent.name).toBeUndefined();
    expect(absent.flag).toBeUndefined();
    expect(absent.maybe).toBeUndefined();
    expect(absent.always).toBe('');

    const selectedName = decodeMessage(fields, encodeMessage(fields, { name: 'pet' }));
    expect(selectedName.name).toBe('pet');
    expect(selectedName.flag).toBeUndefined();

    const selectedFlag = decodeMessage(fields, encodeMessage(fields, { flag: false }));
    expect(selectedFlag.flag).toBe(false);
    expect(selectedFlag.name).toBeUndefined();
  });
});
