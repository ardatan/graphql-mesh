import parser from '../src';

describe('Swagger Parser', () => {
  it('Should work correctly with a JSON schema (v3)', async () => {
    const result = await parser('./tests/fixtures/instagram.json');
    expect(result).toBeDefined();
    expect(result.getQueryType()).toBeDefined();
    expect(result.getType('UserShortInfo')).toBeDefined();
  });
});
