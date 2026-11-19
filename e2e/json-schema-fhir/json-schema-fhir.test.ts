import { createTenv, type ServeRunner } from '@e2e/tenv';
import { ensureFhirSchema } from './ensure-fhir-schema';

const { compose, serve } = createTenv(__dirname);

/** Live HAPI R4 base — compose reads `process.env.FHIR_BASE` from mesh.config. */
const fhirEnv = {
  FHIR_BASE: process.env.FHIR_BASE || 'https://hapi.fhir.org/baseR4',
};

jest.setTimeout(300_000);

beforeAll(async () => {
  await ensureFhirSchema();
}, 120_000);

describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
  it('fetches Patient by id from live HAPI', async () => {
    const composition = await compose({ output: 'graphql', env: fhirEnv });
    const { execute } = await serve({
      runner,
      supergraph: composition.output,
      env: fhirEnv,
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

  it('hydrates Observation.subject.resource via generic Resource → Patient', async () => {
    const composition = await compose({ output: 'graphql', env: fhirEnv });
    const { execute } = await serve({
      runner,
      supergraph: composition.output,
      env: fhirEnv,
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
                __typename
                id
                ... on Patient {
                  name {
                    family
                    given
                  }
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
          __typename: 'Patient',
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
