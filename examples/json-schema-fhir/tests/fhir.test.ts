import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

jest.setTimeout(120_000);

describe('FHIR', () => {
  let mesh: MeshInstance;
  beforeAll(async () => {
    const config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  afterAll(() => {
    mesh?.destroy();
  });

  it('should generate correct schema', async () => {
    expect(printSchemaWithDirectives(mesh.schema)).toMatchSnapshot();
  });

  it('executes root connector and Reference.resource @connect from additionalTypeDefs', async () => {
    // Live HAPI — proves getMesh's second processDirectives pass wired
    // `Reference.resource` without replacing root connect resolvers.
    const result = await mesh.execute(
      /* GraphQL */ `
        query {
          resourceById(id: "nhanes-112200-1742-6", resourceType: "Observation") {
            ... on Observation {
              id
              subject {
                reference
                resource {
                  ... on Patient {
                    id
                    resourceType
                  }
                }
              }
            }
          }
        }
      `,
      {},
    );
    expect(result.errors).toBeUndefined();
    const obs = (result.data as any)?.resourceById;
    expect(obs?.id).toBe('nhanes-112200-1742-6');
    expect(obs?.subject?.reference).toMatch(/^Patient\//);
    expect(obs?.subject?.resource?.id || obs?.subject?.resource?.resourceType).toBeTruthy();
  });
});
