import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';

jest.setTimeout(30000);

describe('PostgresGeoDB', () => {
  let config: ProcessedConfig;
  let mesh: MeshInstance;
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  });
  it('should give correct response for example queries', async () => {
    const result = await mesh.execute(config.documents[0].document!);
    expect(result).toEqual({
      data: {
        allCities: {
          nodes: expect.arrayContaining([
            expect.objectContaining({
              countrycode: expect.any(String),
              developers: expect.arrayContaining([
                expect.objectContaining({
                  login: expect.any(String),
                }),
              ]),
            }),
          ]),
        },
      },
    });
  });
  afterAll(() => {
    mesh?.destroy();
  });
});
