import { applySelection, type ConnectSelectionExtras } from '../src/directives/connect.js';

function extrasWithArgs(args: Record<string, any> = {}): ConnectSelectionExtras {
  return {
    status: 200,
    vars: {
      args,
      thisValue: undefined,
      env: {},
      context: {},
    },
  };
}

const extras = extrasWithArgs();

describe('TJSON @connect selection (Hive Mesh eval)', () => {
  it('$(null) returns null on empty body; bare null is a field path', () => {
    expect(applySelection('$(null)', {}, extras)).toBeNull();
    expect(applySelection('null', {}, extras)).toEqual({ null: undefined });
  });

  it('TJSON bool match encodes true/false as integer 1/0', () => {
    const expr = '$args.enabled->match([true, 1], [false, 0], [@, 0])';
    expect(applySelection(expr, {}, extrasWithArgs({ enabled: true }))).toBe(1);
    expect(applySelection(expr, {}, extrasWithArgs({ enabled: false }))).toBe(0);
  });

  it('TJSON union throw-id discriminator survives shared message fields', () => {
    const sel = `$({
  value: $->get(4)->get("0")->get("tf"),
  __throw_First: $->get(4)->get("1")->ne(null),
  __throw_Second: $->get(4)->get("2")->ne(null),
  message: $($->get(4)->get("1")->get("rec")->get("1")->get("str") ?? $->get(4)->get("2")->get("rec")->get("1")->get("str"))
})`;
    const firstThrown = [1, 'go', 2, 1, { '1': { rec: { '1': { str: 'from-first' } } } }];
    expect(applySelection(sel, firstThrown, extras)).toEqual({
      value: undefined,
      __throw_First: true,
      __throw_Second: false,
      message: 'from-first',
    });
    const secondThrown = [1, 'go', 2, 1, { '2': { rec: { '1': { str: 'from-second' } } } }];
    expect(applySelection(sel, secondThrown, extras)).toEqual({
      value: undefined,
      __throw_First: false,
      __throw_Second: true,
      message: 'from-second',
    });
  });

  it('does not map $() / $-> selection over TJSON array envelopes', () => {
    const envelope = [1, 'divide', 2, 1, { '0': { i32: 5 } }];
    const sel = `$({
  value: $->get(4)->get("0")->get("i32"),
  message: $->get(4)->get("1")->get("rec")->get("1")->get("str")
})`;
    expect(applySelection(sel, envelope, extras)).toEqual({ value: 5 });

    const thrown = [1, 'divide', 2, 1, { '1': { rec: { '1': { str: 'division by zero' } } } }];
    expect(applySelection(sel, thrown, extras)).toEqual({ message: 'division by zero' });
  });

  it('void union ok follows empty result map; throws set message', () => {
    const sel = `$({
  ok: $->get(4)->size->eq(0),
  message: $->get(4)->get("1")->get("rec")->get("1")->get("str")
})`;
    expect(applySelection(sel, [1, 'flush', 2, 1, {}], extras)).toEqual({
      ok: true,
      message: undefined,
    });
    expect(
      applySelection(sel, [1, 'flush', 2, 1, { '1': { rec: { '1': { str: 'boom' } } } }], extras),
    ).toEqual({ ok: false, message: 'boom' });
  });

  it('->concat builds TJSON list envelopes without LitArray spreads', () => {
    const listExtras = extrasWithArgs({ ids: [10, 20] });
    expect(
      applySelection('$([ "i32", $args.ids->size ])->concat($args.ids)', {}, listExtras),
    ).toEqual(['i32', 2, 10, 20]);
  });

  it('keeps trailing subselection on $($args.x) roots', () => {
    const userExtras = extrasWithArgs({ user: { id: 1, name: 'a' } });
    expect(applySelection('$($args.user) { id }', {}, userExtras)).toEqual({ id: 1 });
  });

  it('preserves match @ wildcard inside map element rewrite', () => {
    const items = [{ code: 2 }];
    expect(
      applySelection('$.items->map(@.code->match([1, "one"], [@, "other"]))', { items }, extras),
    ).toEqual(['other']);
  });

  it('rewrites element @ inside ordinary lit arrays (not match arms)', () => {
    expect(applySelection('$.items->map(@->[@])', { items: [7] }, extras)).toEqual([[7]]);
  });

  it('struct union field0 is false when reply has no success field', () => {
    const sel = `$({
  field0: $->get(4)->get("0")->ne(null),
  value: $({
    left: $->get(4)->get("0")->get("rec")->get("1")->get("i32")
  }),
  __throw_DivByZero: $->get(4)->get("1")->ne(null),
  message: $->get(4)->get("1")->get("rec")->get("1")->get("str")
})`;
    const thrown = [1, 'divide', 2, 1, { '1': { rec: { '1': { str: 'division by zero' } } } }];
    expect(applySelection(sel, thrown, extras)).toEqual({
      field0: false,
      value: {},
      __throw_DivByZero: true,
      message: 'division by zero',
    });
  });

  it('void+throws isSuccess: empty result succeeds; declared throw fails', () => {
    const isSuccess = '$->get(2)->eq(2)->and($->get(4)->size->eq(0))';
    expect(applySelection(isSuccess, [1, 'flush', 2, 1, {}], extras)).toBe(true);
    expect(
      applySelection(
        isSuccess,
        [1, 'flush', 2, 1, { '1': { rec: { '1': { str: 'boom' } } } }],
        extras,
      ),
    ).toBe(false);
  });

  it('scalar union success and throw-id paths', () => {
    const sel = `$({
  value: $->get(4)->get("0")->get("tf"),
  __throw_First: $->get(4)->get("1")->ne(null),
  __throw_Second: $->get(4)->get("2")->ne(null),
  message: $->get(4)->get("2")->get("rec")->get("1")->get("str")
})`;
    expect(applySelection(sel, [1, 'go', 2, 1, { '0': { tf: 1 } }], extras)).toEqual({
      value: 1,
      __throw_First: false,
      __throw_Second: false,
      message: undefined,
    });
    expect(
      applySelection(sel, [1, 'go', 2, 1, { '2': { rec: { '1': { str: 'x' } } } }], extras),
    ).toEqual({
      value: undefined,
      __throw_First: false,
      __throw_Second: true,
      message: 'x',
    });
  });
});
