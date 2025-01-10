import useMeshHive from '../src';

describe('Hive', () => {
  it('does not hook into Node.js process', () => {
    const spy = jest.spyOn(process, 'once');
    useMeshHive({
      enabled: true,
      token: 'FAKE_TOKEN',
    }).onPluginInit?.({
      addPlugin: jest.fn(),
      plugins: [],
      setSchema: jest.fn(),
      registerContextErrorHandler: jest.fn(),
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
