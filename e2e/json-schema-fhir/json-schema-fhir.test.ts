import { createTenv, type ServeRunner } from '@e2e/tenv';
import { ensureFhirSchema } from './ensure-fhir-schema';

const { compose, serve } = createTenv(__dirname);

jest.setTimeout(300_000);

beforeAll(async () => {
  await ensureFhirSchema();
}, 120_000);

it('composes official fhir.schema.json + rename + mini Reference.resource SDL', async () => {
  const { result } = await compose();
  expect(result).not.toContain('@resolveTo');
  expect(result).toMatch(/subject:\s*Reference/);
  expect(result).toMatch(/resource:\s*Patient/);
  expect(result).toMatch(/->split\(/);
  expect(result).toMatch(/patient\(/);
  expect(result).toMatch(/entity:\s*true/);
  // Join field comes from the mini SDL subgraph, not loader magic.
  expect(result).toMatch(/referenceResource|REFERENCE_RESOURCE/i);
  // Colliding FHIR value types renamed per subgraph (prefix transform).
  // After scalarMap + hard filter, observations often has nothing left to prefix
  // (shared `code`/`uri`/`Reference`); patients still renames HumanName.
  expect(result).toMatch(/patients_/);
  // Force scalarMap: string→String (Patient.id is `#/definitions/string`).
  expect(result).not.toMatch(/\bscalar string\b/);
  expect(result).not.toMatch(/\bscalar uri\b/);
  expect(result).toMatch(/type Patient[\s\S]*?\bid:\s*String\b/);
  // Reference.type is FHIR `uri` → graphql-scalars URL.
  expect(result).toMatch(/\btype:\s*URL\b/);
  // Shared FHIR `code` stays as `@regexp` (not in scalarMap).
  expect(result).toMatch(/\bscalar code\b/);
  expect(result).not.toMatch(/\bscalar oid\b/);
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
