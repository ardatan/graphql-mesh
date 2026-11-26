import { parseValue } from 'graphql';
import { extractVariables } from '../src/extractVariables.js';
import { parseMergeArgsExpr } from '../src/parseMergeArgsExpr.js';
import {
  decodeKeyPath,
  encodeKeyPathSegments,
  preparseMergeArgsExpr,
} from '../src/preparseMergeArgsExpr.js';
import { addProperty, propertyTreeFromPaths } from '../src/properties.js';

describe('stitching-directives preparser and properties', () => {
  it('retains every destination for a repeated variable', () => {
    const inputValue = parseValue('{ first: $key, second: $key }', { noLocation: true });
    const { variablePaths } = extractVariables(inputValue);
    expect(variablePaths.key).toEqual([['first'], ['second']]);
  });

  it('encodes dotted key paths losslessly vs literal delimiter segments', () => {
    const nested = encodeKeyPathSegments(['org', 'id']);
    const literal = encodeKeyPathSegments(['org__dot__id']);
    expect(nested).not.toBe(literal);
    expect(decodeKeyPath(nested)).toEqual(['org', 'id']);
    expect(decodeKeyPath(literal)).toEqual(['org__dot__id']);
  });

  it('does not rewrite dotted text inside string literals', () => {
    const { mergeArgsExpr } = preparseMergeArgsExpr(
      'filter: { tenant: "$tenant.prod", id: $key.id }',
    );
    expect(mergeArgsExpr).toContain('"$tenant.prod"');
    expect(mergeArgsExpr).toContain('$key__dot__id');
    expect(mergeArgsExpr).not.toContain('$tenant__dot__prod');
  });

  it('recognizes expansion brackets only outside string literals', () => {
    const { mergeArgsExpr, expansionExpressions } = preparseMergeArgsExpr(
      'msg: "has [[ not an expansion", ids: [[$key.id]]',
    );
    expect(mergeArgsExpr).toContain('"has [[ not an expansion"');
    expect(Object.keys(expansionExpressions)).toHaveLength(1);
    expect(expansionExpressions.__exp1).toContain('$key');
  });

  it('keeps the whole value when one source path contains another', () => {
    const tree = Object.create(null);
    addProperty(tree, ['a', 'b'], null);
    addProperty(tree, ['a'], null);
    expect(tree).toEqual({ a: null });

    const tree2 = Object.create(null);
    addProperty(tree2, ['a'], null);
    addProperty(tree2, ['a', 'b'], null);
    expect(tree2).toEqual({ a: null });

    const siblings = propertyTreeFromPaths([
      ['a', 'x'],
      ['a', 'y'],
    ]);
    expect(siblings).toEqual({ a: { x: null, y: null } });
  });

  it('maps repeated variable destinations when parsing merge args', () => {
    const parsed = parseMergeArgsExpr('first: $key.id, second: $key.id');
    expect(parsed.mappingInstructions).toHaveLength(2);
    expect(parsed.mappingInstructions?.map(m => m.destinationPath)).toEqual([
      ['first'],
      ['second'],
    ]);
  });
});
