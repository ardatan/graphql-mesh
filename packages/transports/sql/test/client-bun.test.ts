import {
  buildBunSqlCtorOptions,
  isBunSqlAvailable,
  resolveBunTlsOption,
} from '../src/client.js';

describe('Bun.SQL availability (Node / Jest)', () => {
  it('is unavailable under plain Node (native coverage lives in client.bun.test.ts)', () => {
    // Jest runs on Node; Bun.SQL only exists when the process is Bun.
    expect(isBunSqlAvailable()).toBe(false);
  });

  it('forwards ssl.ca / rejectUnauthorized into Bun tls options', () => {
    expect(resolveBunTlsOption(true, { ca: 'PEM', rejectUnauthorized: true })).toEqual({
      rejectUnauthorized: true,
      ca: 'PEM',
    });
    expect(resolveBunTlsOption('insecure', { ca: 'PEM' })).toEqual({
      rejectUnauthorized: false,
      ca: 'PEM',
    });
    expect(
      buildBunSqlCtorOptions({
        adapter: 'mysql',
        location: 'mysqls://u@h/db',
        tls: true,
        ssl: { ca: 'someCA', rejectUnauthorized: true },
      }).tls,
    ).toEqual({ rejectUnauthorized: true, ca: 'someCA' });
  });
});
