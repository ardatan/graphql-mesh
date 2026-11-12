import { OperationTypeNode } from 'graphql';
import { inferBodySelection } from '../src/connectAnnotations.js';

describe('inferBodySelection', () => {
  it('bakes requestBaseBody literals and spreads $args.input', () => {
    const selection = inferBodySelection({
      type: OperationTypeNode.MUTATION,
      field: 'create',
      path: '/items',
      method: 'POST',
      requestSchema: { type: 'object' },
      requestBaseBody: { api_key: 'secret', mode: 'live' },
    } as any);
    expect(selection).toContain('api_key: $("secret")');
    expect(selection).toContain('mode: $("live")');
    expect(selection).toContain('...$args.input');
    expect(selection?.trim().startsWith('{')).toBe(true);
  });

  it('emits bare $args.input when there is no base body', () => {
    expect(
      inferBodySelection({
        type: OperationTypeNode.MUTATION,
        field: 'create',
        path: '/items',
        method: 'POST',
        requestSchema: { type: 'object' },
      } as any),
    ).toBe('$args.input');
  });

  it('emits a literal when only requestBaseBody is set', () => {
    expect(
      inferBodySelection({
        type: OperationTypeNode.MUTATION,
        field: 'create',
        path: '/items',
        method: 'POST',
        requestBaseBody: { ping: true },
      } as any),
    ).toBe('$({"ping":true})');
  });
});
