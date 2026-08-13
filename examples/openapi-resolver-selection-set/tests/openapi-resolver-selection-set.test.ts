import { createServer } from 'http';
import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh, type MeshInstance } from '@graphql-mesh/runtime';

const PET_ID = '0fc9111f-570d-4ebe-a72e-ff4eb274bc65';

describe('OpenAPI nested resolver selectionSet', () => {
  let mesh: MeshInstance;
  let upstream: ReturnType<typeof createServer>;

  beforeAll(async () => {
    upstream = createServer((req, res) => {
      if (req.url?.startsWith(`/pet/${PET_ID}`)) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ id: PET_ID, name: 'Bob' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>(resolve => upstream.listen(4011, '127.0.0.1', resolve));

    const config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    mesh = await getMesh(config);
  }, 30000);

  afterAll(async () => {
    mesh?.destroy();
    await new Promise<void>((resolve, reject) =>
      upstream.close(err => (err ? reject(err) : resolve())),
    );
  });

  it('fetches nested Pet fields when selectionSet is provided', async () => {
    const result = await mesh.execute(
      /* GraphQL */ `
        query {
          newPet(petId: "${PET_ID}") {
            foo
          }
        }
      `,
      {},
    );

    expect(result.errors).toBeUndefined();
    const foo = JSON.parse((result.data as any).newPet.foo);
    expect(foo).toEqual({
      id: PET_ID,
      name: 'Bob',
    });
  });
});
