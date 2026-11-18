import { createTenv, type Container } from '@e2e/tenv';

const { compose, serve, container } = createTenv(__dirname);

let mongo: Container;

beforeAll(async () => {
  mongo = await container({
    name: 'mongo',
    image: 'mongo:7',
    containerPort: 27017,
    healthcheck: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"],
  });
}, 120_000);

it('should compose the appropriate schema', async () => {
  const composition = await compose({
    services: [mongo],
    maskServicePorts: true,
  });
  expect(composition.result).toContain('kind: "mongo"');
  expect(composition.result).toContain('User_findById');
  expect(composition.result).toContain('User_createOne');
  expect(composition.result).toContain('filter: UserFilter');
  expect(composition.result).toContain('id: ID!');
  expect(composition.result).toMatchSnapshot();
});

it('should create and find users', async () => {
  const composition = await compose({ output: 'graphql', services: [mongo] });
  const gw = await serve({ supergraph: composition.output });

  const created = await gw.execute({
    query: /* GraphQL */ `
      mutation CreateUser {
        User_createOne(record: { name: "Ada", age: 36, gender: "female" }) {
          recordId
          record {
            id
            name
            age
            gender
          }
        }
      }
    `,
  });
  expect(created.errors).toBeUndefined();
  const recordId = (created.data as any).User_createOne.recordId as string;
  expect(recordId).toBeTruthy();
  expect((created.data as any).User_createOne.record.name).toBe('Ada');

  const found = await gw.execute({
    query: /* GraphQL */ `
      query FindUser($id: ID!) {
        User_findById(_id: $id) {
          id
          name
          age
        }
        User_findMany(filter: { name: { eq: "Ada" } }) {
          id
          name
        }
        User_count(filter: { gender: { eq: "female" } })
      }
    `,
    variables: { id: recordId },
  });
  expect(found.errors).toBeUndefined();
  expect(found.data).toMatchObject({
    User_findById: { id: recordId, name: 'Ada', age: 36 },
    User_findMany: [{ id: recordId, name: 'Ada' }],
    User_count: 1,
  });
}, 120_000);
