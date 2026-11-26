import { matchPrintedFieldBlock } from '@e2e/printed-sdl';
import { createTenv, type ServeRunner, type Service } from '@e2e/tenv';

describe('OpenAPI entity stubs (FK + getById)', () => {
  jest.retryTimes(3);
  const { compose, serve, service } = createTenv(__dirname);

  let api: Service;

  beforeAll(async () => {
    api = await service('API');
  });

  it('composes with entity stub selection and entity:true on getCustomer', async () => {
    const { result } = await compose({
      output: 'graphql',
      services: [api],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
    // Invoice selection stubs customer via FK (shared fusion/loader contract).
    const invoiceConnect = matchPrintedFieldBlock(result, /getInvoice\([\s\S]*?\):\s*Invoice/);
    expect(invoiceConnect).toContain('customerId');
    expect(invoiceConnect).toMatch(/customer:\s*\{\s*__typename/);
    expect(invoiceConnect).not.toMatch(/customer:\s*\{[^}]*\bname\b/);
    // `getCustomer(id:)` — single key-typed arg is enough for entity: true.
    const getCustomer = matchPrintedFieldBlock(result, /getCustomer\([\s\S]*?\):\s*Customer/);
    expect(getCustomer).toMatch(/entity:\s*true/);
  });

  describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
    it('resolves invoice.customer via entity stub + getCustomer', async () => {
      const composition = await compose({
        output: 'graphql',
        services: [api],
      });
      const { execute } = await serve({
        runner,
        supergraph: composition.output,
      });
      const queryResult = await execute({
        query: /* GraphQL */ `
          query {
            getInvoice(id: "inv1") {
              id
              total
              customerId
              customer {
                id
                name
              }
            }
          }
        `,
      });
      expect(queryResult.errors).toBeFalsy();
      expect(queryResult.data).toEqual({
        getInvoice: {
          id: 'inv1',
          total: 42.5,
          customerId: 'c1',
          customer: {
            id: 'c1',
            name: 'Ada Lovelace',
          },
        },
      });
    });
  });
});
