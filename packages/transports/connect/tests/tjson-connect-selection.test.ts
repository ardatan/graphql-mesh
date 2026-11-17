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
  message: $($->get(4)->get("1")->ne(null)->match([true, $->get(4)->get("1")->get("rec")->get("1")->get("str")], [@, null]) ?? $->get(4)->get("2")->ne(null)->match([true, $->get(4)->get("2")->get("rec")->get("1")->get("str")], [@, null]))
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

  it('TJSON union gates shared struct fields on active throw before coalesce', () => {
    // Absent throw still builds `$({ text: undefined })` — without throw-gating that
    // object is non-nullish and `??` would hide the active exception's struct.
    const sel = `$({
  field0: $->get(4)->get("0")->ne(null),
  value: $({
    left: $->get(4)->get("0")->get("rec")->get("1")->get("i32")
  }),
  __throw_First: $->get(4)->get("1")->ne(null),
  __throw_Second: $->get(4)->get("2")->ne(null),
  detail: $($->get(4)->get("1")->ne(null)->match([true, $({
    text: $->get(4)->get("1")->get("rec")->get("1")->get("rec")->get("1")->get("str"),
    code: $->get(4)->get("1")->get("rec")->get("1")->get("rec")->get("2")->get("i32")
  })], [@, null]) ?? $->get(4)->get("2")->ne(null)->match([true, $({
    text: $->get(4)->get("2")->get("rec")->get("1")->get("rec")->get("1")->get("str"),
    code: $->get(4)->get("2")->get("rec")->get("1")->get("rec")->get("2")->get("i32")
  })], [@, null]))
})`;
    const firstThrown = [
      1,
      'go',
      2,
      1,
      { '1': { rec: { '1': { rec: { '1': { str: 'from-first' }, '2': { i32: 7 } } } } } },
    ];
    expect(applySelection(sel, firstThrown, extras)).toEqual({
      field0: false,
      value: {},
      __throw_First: true,
      __throw_Second: false,
      detail: { text: 'from-first', code: 7 },
    });
    const secondThrown = [
      1,
      'go',
      2,
      1,
      { '2': { rec: { '1': { rec: { '1': { str: 'from-second' }, '2': { i32: 9 } } } } } },
    ];
    expect(applySelection(sel, secondThrown, extras)).toEqual({
      field0: false,
      value: {},
      __throw_First: false,
      __throw_Second: true,
      detail: { text: 'from-second', code: 9 },
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

  it('list/set success inside match uses ->map expression, not trailing braces', () => {
    // Apache TJSON list-of-struct: elements are bare field maps (no per-element `rec`).
    const reply = [
      1,
      'items',
      2,
      1,
      {
        '0': {
          lst: [
            'rec',
            2,
            { '1': { i32: 1 }, '2': { str: 'a' } },
            { '1': { i32: 2 }, '2': { str: 'b' } },
          ],
        },
      },
    ];
    const gatedMap = `$({
  value: $($->get(4)->get("0")->ne(null)->match([true, $->get(4)->get("0")->get("lst")->slice(2)->map(@->{ left: @->get("1")->get("i32"), text: @->get("2")->get("str") })], [@, null])),
  __throw_Boom: $->get(4)->get("1")->ne(null)
})`;
    expect(applySelection(gatedMap, reply, extras)).toEqual({
      value: [
        { left: 1, text: 'a' },
        { left: 2, text: 'b' },
      ],
      __throw_Boom: false,
    });
    // Trailing NamedSelection braces inside match do not project list elements.
    const gatedBraced = `$({
  value: $($->get(4)->get("0")->ne(null)->match([true, $->get(4)->get("0")->get("lst")->slice(2) { left: $->get("1")->get("i32") }], [@, null]))
})`;
    expect(applySelection(gatedBraced, reply, extras)).toEqual({});
  });

  it('nested list-of-struct fields project via ->map from @', () => {
    const reply = [
      1,
      'items',
      2,
      1,
      {
        '0': {
          lst: [
            'rec',
            1,
            {
              '1': { i32: 10 },
              '2': { lst: ['rec', 2, { '1': { i32: 7 } }, { '1': { i32: 9 } }] },
            },
          ],
        },
      },
    ];
    const sel = `$({
  value: $($->get(4)->get("0")->ne(null)->match([true, $->get(4)->get("0")->get("lst")->slice(2)->map(@->{ left: @->get("1")->get("i32"), children: @->get("2")->get("lst")->slice(2)->map(@->{ n: @->get("1")->get("i32") }) })], [@, null]))
})`;
    expect(applySelection(sel, reply, extras)).toEqual({
      value: [{ left: 10, children: [{ n: 7 }, { n: 9 }] }],
    });
  });

  it('gates success value/ok so exception fields with the same name cannot clobber', () => {
    // Success + exception both emit `value` / `ok` — one LitObject key, gated then `??`.
    const valueSel = `$({
  field0: $->get(4)->get("0")->ne(null),
  value: $($->get(4)->get("0")->ne(null)->match([true, $({
    left: $->get(4)->get("0")->get("rec")->get("1")->get("i32")
  })], [@, null]) ?? $->get(4)->get("1")->ne(null)->match([true, $->get(4)->get("1")->get("rec")->get("1")->get("str")], [@, null])),
  __throw_ValueBoom: $->get(4)->get("1")->ne(null)
})`;
    expect(
      applySelection(valueSel, [1, 'go', 2, 1, { '0': { rec: { '1': { i32: 42 } } } }], extras),
    ).toEqual({
      field0: true,
      value: { left: 42 },
      __throw_ValueBoom: false,
    });
    expect(
      applySelection(
        valueSel,
        [1, 'go', 2, 1, { '1': { rec: { '1': { str: 'from-boom' } } } }],
        extras,
      ),
    ).toEqual({
      field0: false,
      value: 'from-boom',
      __throw_ValueBoom: true,
    });

    const okSel = `$({
  ok: $($->get(4)->size->eq(0)->match([true, true], [@, null]) ?? $->get(4)->get("1")->ne(null)->match([true, $->get(4)->get("1")->get("rec")->get("1")->get("tf")], [@, null])),
  __throw_OkBoom: $->get(4)->get("1")->ne(null)
})`;
    expect(applySelection(okSel, [1, 'flush', 2, 1, {}], extras)).toEqual({
      ok: true,
      __throw_OkBoom: false,
    });
    expect(
      applySelection(okSel, [1, 'flush', 2, 1, { '1': { rec: { '1': { tf: 1 } } } }], extras),
    ).toEqual({
      ok: 1,
      __throw_OkBoom: true,
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
