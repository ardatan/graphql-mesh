import { getInterpolatedHeadersFactory } from '../src/resolver-data-factory.js';

describe('getInterpolatedHeadersFactory', () => {
  const headers = {
    'x-foo': 'foo',
    'x-bar': '{context.bar}',
    'x-baz': '{context.baz}',
  };

  it('should interpolate headers', () => {
    const interpolatedHeaders = getInterpolatedHeadersFactory(headers)({
      env: {},
      context: {
        bar: 'bar',
      },
    });
    expect(interpolatedHeaders).toEqual({
      'x-foo': 'foo',
      'x-bar': 'bar',
    });
  });
});
