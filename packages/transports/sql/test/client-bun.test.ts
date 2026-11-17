import { isBunSqlAvailable } from '../src/client.js';

describe('Bun.SQL availability (Node / Jest)', () => {
  it('is unavailable under plain Node (native coverage lives in client.bun.test.ts)', () => {
    // Jest runs on Node; Bun.SQL only exists when the process is Bun.
    expect(isBunSqlAvailable()).toBe(false);
  });
});
