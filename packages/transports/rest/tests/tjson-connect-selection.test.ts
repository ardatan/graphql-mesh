import { applySelection } from '../src/directives/connect.js';

const extras = { vars: { args: {} }, status: 200 };

describe('TJSON @connect selection (Hive Mesh eval)', () => {
  it('$(null) returns null on empty body; bare null is a field path', () => {
    expect(applySelection('$(null)', {}, extras)).toBeNull();
    expect(applySelection('null', {}, extras)).toEqual({ null: undefined });
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
    const listExtras = { vars: { args: { ids: [10, 20] } }, status: 200 };
    expect(
      applySelection('$([ "i32", $args.ids->size ])->concat($args.ids)', {}, listExtras),
    ).toEqual(['i32', 2, 10, 20]);
  });
});
