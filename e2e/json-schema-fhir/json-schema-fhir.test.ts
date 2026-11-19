import { createTenv, type ServeRunner } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

jest.setTimeout(300_000);

it('composes JSON Schema patients + observations from fhir.schema.json', async () => {
  const { result } = await compose();
  expect(result).not.toContain('@resolveTo');
  expect(result).toMatch(/subject:\s*Reference/);
  expect(result).toMatch(/resource:\s*Patient/);
  expect(result).toMatch(/->split\(/);
  expect(result).toMatch(/patient\(/);
  expect(result).toMatch(/entity:\s*true/);
});

describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
  it('fetches Patient by id from live HAPI', async () => {
    const composition = await compose({ output: 'graphql' });
    const { execute } = await serve({
      runner,
      supergraph: composition.output,
    });
    const result = await execute({
      query: /* GraphQL */ `
        query PatientById {
          patient(id: "16020") {
            id
            gender
            name {
              family
              given
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.patient).toMatchObject({
      id: '16020',
      name: expect.arrayContaining([
        expect.objectContaining({
          family: 'Doe',
        }),
      ]),
    });
  });

  it('hydrates Observation.subject.resource via Patient entity subgraph', async () => {
    const composition = await compose({ output: 'graphql' });
    const { execute } = await serve({
      runner,
      supergraph: composition.output,
    });
    const result = await execute({
      query: /* GraphQL */ `
        query ObservationSubject {
          observationById(id: "nhanes-112200-1742-6") {
            id
            status
            subject {
              reference
              resource {
                id
                name {
                  family
                  given
                }
              }
            }
          }
        }
      `,
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.observationById).toMatchObject({
      id: 'nhanes-112200-1742-6',
      subject: {
        reference: 'Patient/nhanes-112200',
        resource: {
          id: 'nhanes-112200',
          name: expect.arrayContaining([
            expect.objectContaining({
              family: 'Jennings',
            }),
          ]),
        },
      },
    });
  });
});
