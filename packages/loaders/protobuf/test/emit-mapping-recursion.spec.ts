import type { INamespace } from 'protobufjs';
import { describe, expect, it } from '@jest/globals';
import { decodeMessage, encodeMessage } from '../../../transports/protobuf/src/protobuf/codec.js';
import { parseMapping } from '../../../transports/protobuf/src/protobuf/mapping.js';
import { emitRequestBody, emitResponseSelection } from '../src/emitMapping.js';

describe('emitMapping cycle-aware message& refs', () => {
  const rootJson = {
    nested: {
      Node: {
        fields: {
          name: { type: 'string', id: 1 },
          child: { type: 'Node', id: 2 },
        },
      },
    },
  } as INamespace;

  it('emits message& for self-recursive fields instead of empty stubs', () => {
    const mapping = emitResponseSelection(rootJson, [], 'Node');
    expect(mapping).toMatch(/1\(string\):\s*name/);
    expect(mapping).toMatch(/2\(message&\):\s*child/);
    expect(mapping).not.toMatch(/2\(message\):\s*child\s*\{\s*\}/);
  });

  it('loader→decoder round-trips multiple recursion levels (child.child)', () => {
    const mapping = emitResponseSelection(rootJson, [], 'Node');
    const fields = parseMapping(mapping);
    const childField = fields.find(f => f.bind === 'child');
    expect(childField?.type.kind).toBe('message');
    expect(childField?.fields).toBe(fields);

    const tree = {
      name: 'root',
      child: {
        name: 'mid',
        child: {
          name: 'leaf',
        },
      },
    };
    const bytes = encodeMessage(fields, tree);
    const decoded = decodeMessage(fields, bytes);
    expect(decoded).toEqual({
      name: 'root',
      child: {
        name: 'mid',
        child: {
          name: 'leaf',
        },
      },
    });
  });

  it('emits message&1 for mutual recursion and round-trips', () => {
    const mutual = {
      nested: {
        A: {
          fields: {
            label: { type: 'string', id: 1 },
            b: { type: 'B', id: 2 },
          },
        },
        B: {
          fields: {
            title: { type: 'string', id: 1 },
            a: { type: 'A', id: 2 },
          },
        },
      },
    } as INamespace;
    const mapping = emitResponseSelection(mutual, [], 'A');
    expect(mapping).toMatch(/2\(message\):\s*b\s*\{/);
    expect(mapping).toMatch(/2\(message&1\):\s*a/);

    const fields = parseMapping(mapping);
    const value = {
      label: 'a1',
      b: {
        title: 'b1',
        a: {
          label: 'a2',
        },
      },
    };
    const decoded = decodeMessage(fields, encodeMessage(fields, value));
    expect(decoded).toEqual(value);
  });

  it('emitRequestBody: relative binds for recursive map<string,message> values', () => {
    const mapRoot = {
      nested: {
        Node: {
          fields: {
            name: { type: 'string', id: 1 },
            children: { type: 'Node', id: 2, keyType: 'string' },
          },
        },
      },
    } as INamespace;
    const mapping = emitRequestBody(mapRoot, [], 'Node');
    expect(mapping).toMatch(/2\(map<string,message>\):\s*input\.children\s*\{/);
    expect(mapping).toMatch(/2\(map<string,message&>\):\s*children/);
    expect(mapping).not.toMatch(/message&:\s*input\./);

    const fields = parseMapping(mapping);
    const args = {
      input: {
        name: 'root',
        children: {
          a: { name: 'childA' },
          b: { name: 'childB', children: { c: { name: 'grand' } } },
        },
      },
    };
    const decoded = decodeMessage(
      parseMapping(emitResponseSelection(mapRoot, [], 'Node')),
      encodeMessage(fields, args),
    );
    expect(decoded).toEqual({
      name: 'root',
      children: {
        a: { name: 'childA', children: {} },
        b: { name: 'childB', children: { c: { name: 'grand', children: {} } } },
      },
    });
  });

  it('emitRequestBody: relative binds inside recursive child (input.child.child)', () => {
    const mapping = emitRequestBody(rootJson, [], 'Node');
    // Prefix only at the request boundary; nested recursive body stays relative.
    expect(mapping).toMatch(/1\(string\):\s*input\.name/);
    expect(mapping).toMatch(/2\(message\):\s*input\.child\s*\{/);
    expect(mapping).toMatch(/1\(string\):\s*name/);
    expect(mapping).toMatch(/2\(message&\):\s*child/);
    // Shared recursive body must not reuse request-prefixed binds.
    expect(mapping).not.toMatch(/message&:\s*input\./);
    expect(mapping).not.toMatch(/\{\s*1\(string\):\s*input\.name/);

    const fields = parseMapping(mapping);
    const args = {
      input: {
        name: 'root',
        child: {
          name: 'mid',
          child: {
            name: 'leaf',
          },
        },
      },
    };
    const bytes = encodeMessage(fields, args);
    // Decode with relative selection to assert wire payload preserved nested names.
    const decoded = decodeMessage(parseMapping(emitResponseSelection(rootJson, [], 'Node')), bytes);
    expect(decoded).toEqual({
      name: 'root',
      child: {
        name: 'mid',
        child: {
          name: 'leaf',
        },
      },
    });
  });
});
