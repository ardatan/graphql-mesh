import { createTenv } from '@e2e/tenv';

describe('Date Coercion', () => {
  const { compose, service, serve } = createTenv(__dirname);
  it('works', async () => {
    const { output } = await compose({
      output: 'graphql',
      services: [await service('loans')],
    });
    const { execute } = await serve({
      supergraph: output,
    });
    const result = await execute({
      query: /* GraphQL */ `
        mutation {
          updatePaymentDate(input: { id: "123", date: "2024-12-17" }) {
            success
            newDate
          }
        }
      `,
    });
    expect(result).toEqual({
      data: {
        updatePaymentDate: {
          success: true,
          newDate: '2024-12-17',
        },
      },
    });
  });
});
