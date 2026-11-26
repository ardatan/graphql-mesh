import { Kind, parse } from 'graphql';
import { ensureSupergraphSDLAst } from '../src/supergraph.js';

describe('ensureSupergraphSDLAst', () => {
  it('does not mutate the caller’s supergraph AST across repeated builds', () => {
    const original = parse(/* GraphQL */ `
      type Query {
        hello: String
      }
    `);
    const queryBefore = original.definitions.find(
      d => d.kind === Kind.OBJECT_TYPE_DEFINITION,
    ) as any;
    const directiveCountBefore = queryBefore.directives?.length ?? 0;

    const first = ensureSupergraphSDLAst(original);
    const second = ensureSupergraphSDLAst(original);

    expect(first).not.toBe(original);
    expect(second).not.toBe(original);
    expect(first).not.toBe(second);

    const queryAfter = original.definitions.find(
      d => d.kind === Kind.OBJECT_TYPE_DEFINITION,
    ) as any;
    expect(queryAfter.directives?.length ?? 0).toBe(directiveCountBefore);
  });
});
