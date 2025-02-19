import { MeshInstance } from '@graphql-mesh/runtime';
import { getBuiltMesh } from '../.mesh';
import upstream from '../src';

describe('JSON Schema Complex URL', () => {
  let mesh: MeshInstance;
  beforeAll(async () => {
    mesh = await getBuiltMesh();
  });
  afterAll(() => {
    mesh.destroy();
    return new Promise<void>((resolve, reject) => {
      upstream.close(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
  it('receives username, password and query params correctly', async () => {
    const some_arg = new Date().toISOString();
    const result = await mesh.execute(
      /* GraphQL */ `
        query GetData($some_arg: String!) {
          getData(some_arg: $some_arg) {
            authorization
            url
          }
        }
      `,
      {
        some_arg,
      },
    );
    expect(result).toMatchObject({
      data: {
        getData: {
          authorization: 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=',
          url: `/?request=GetData&some_arg=${some_arg}&some_val=0`,
        },
      },
    });
  });
});
