import { getCoercedVariableValues, getVariableValues } from '../src/getCoercedVariableValues.js';

describe('getCoercedVariableValues', () => {
  it('does not treat flat GraphQL 16 maps with coerced/sources names as wrappers', () => {
    const flat = { coerced: 'a', sources: 'b' };
    expect(getCoercedVariableValues(flat)).toEqual(flat);
    const wrapped = getVariableValues(flat);
    expect(wrapped.coerced).toEqual(flat);
    expect(getCoercedVariableValues(wrapped)).toEqual(flat);
  });

  it('unwraps branded wrappers from getVariableValues', () => {
    const flat = { show: true, id: '1' };
    const wrapped = getVariableValues(flat);
    expect(getCoercedVariableValues(wrapped)).toEqual(flat);
  });

  it('unwraps structural VariableValues with signature sources', () => {
    const structural = {
      coerced: { show: false },
      sources: {
        show: {
          signature: { name: 'show', type: {} as any, default: undefined },
          value: false,
        },
      },
    };
    expect(getCoercedVariableValues(structural)).toEqual({ show: false });
  });
});
