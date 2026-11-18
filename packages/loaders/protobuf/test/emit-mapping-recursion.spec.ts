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

  it('reuses @Name defs for shared acyclic message types (bounded DAG)', () => {
    const dag = {
      nested: {
        Leaf: {
          fields: {
            n: { type: 'int32', id: 1 },
          },
        },
        Branch: {
          fields: {
            left: { type: 'Leaf', id: 1 },
            right: { type: 'Leaf', id: 2 },
          },
        },
      },
    } as INamespace;
    const mapping = emitResponseSelection(dag, [], 'Branch');
    expect(mapping).toMatch(/@Leaf\s*\{/);
    expect(mapping).toMatch(/1\(message@Leaf\):\s*left/);
    expect(mapping).toMatch(/2\(message@Leaf\):\s*right/);
    // Leaf field list appears once in the hoisted def.
    expect(mapping.match(/1\(int32\):\s*n/g)?.length).toBe(1);
    const fields = parseMapping(mapping);
    const left = fields.find(f => f.bind === 'left');
    const right = fields.find(f => f.bind === 'right');
    expect(left?.fields).toBe(right?.fields);
    const bytes = encodeMessage(fields, { left: { n: 1 }, right: { n: 2 } });
    expect(decodeMessage(fields, bytes)).toEqual({ left: { n: 1 }, right: { n: 2 } });
  });

  it('disambiguates colliding @Name candidates with a numeric suffix', () => {
    // Nested paths that sanitize to the same identifier (dots → `_`).
    const colliding = {
      nested: {
        Root: {
          nested: {
            a: {
              nested: {
                b_c: {
                  fields: { x: { type: 'int32', id: 1 } },
                },
              },
            },
            a_b: {
              nested: {
                c: {
                  fields: { y: { type: 'int32', id: 1 } },
                },
              },
            },
          },
          fields: {
            left: { type: 'a.b_c', id: 1 },
            right: { type: 'a_b.c', id: 2 },
          },
        },
      },
    } as INamespace;
    const mapping = emitResponseSelection(colliding, [], 'Root');
    const defNames = [...mapping.matchAll(/@([A-Za-z0-9_]+)\s*\{/g)].map(m => m[1]);
    expect(defNames.length).toBe(2);
    expect(new Set(defNames).size).toBe(2);
    expect(defNames.some(n => /_\d+$/.test(n))).toBe(true);
    expect(() => parseMapping(mapping)).not.toThrow();
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
    expect(mapping).toMatch(/@B\s*\{/);
    expect(mapping).toMatch(/2\(message@B\):\s*b/);
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

  it('emitRequestBody: mutual recursion A→B→A round-trips nested A values', () => {
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
    const mapping = emitRequestBody(mutual, [], 'A');
    // Prefix only at the request boundary; nested B is a hoisted relative def.
    expect(mapping).toMatch(/1\(string\):\s*input\.label/);
    expect(mapping).toMatch(/2\(message@B\):\s*input\.b/);
    expect(mapping).toMatch(/@B\s*\{/);
    // B→A must expand a relative A copy (not message& to the prefix-bound root list).
    expect(mapping).toMatch(/2\(message\):\s*a\s*\{/);
    expect(mapping).toMatch(/1\(string\):\s*label/);
    // Deeper mutual cycle reuses the hoisted B def.
    expect(mapping).toMatch(/2\(message@B\):\s*b/);
    // Shared recursive bodies must not carry request-prefixed binds.
    expect(mapping).not.toMatch(/message&[^:]*:\s*input\./);
    expect(mapping).not.toMatch(/\{\s*1\(string\):\s*input\.label/);

    const fields = parseMapping(mapping);
    const args = {
      input: {
        label: 'a1',
        b: {
          title: 'b1',
          a: {
            label: 'a2',
            b: {
              title: 'b2',
              a: {
                label: 'a3',
              },
            },
          },
        },
      },
    };
    const bytes = encodeMessage(fields, args);
    const decoded = decodeMessage(parseMapping(emitResponseSelection(mutual, [], 'A')), bytes);
    expect(decoded).toEqual({
      label: 'a1',
      b: {
        title: 'b1',
        a: {
          label: 'a2',
          b: {
            title: 'b2',
            a: {
              label: 'a3',
            },
          },
        },
      },
    });
  });
});
