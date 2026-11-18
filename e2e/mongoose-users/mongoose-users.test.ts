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
  expect(composition.result).toContain('findUserById(id:');
  expect(composition.result).toContain('insertOneUser(document:');
  expect(composition.result).toContain('query: UserQueryInput');
  expect(composition.result).toContain('sort: [UserSort!]');
  expect(composition.result).toContain('id: ObjectID!');
  expect(composition.result).toContain('@mongo__findOne');
  expect(composition.result).toContain('update: UserUpdateInput!');
});

it('should create and find users', async () => {
  const composition = await compose({ output: 'graphql', services: [mongo] });
  const gw = await serve({ supergraph: composition.output });

  const created = await gw.execute({
    query: /* GraphQL */ `
      mutation CreateUser {
        insertOneUser(document: { name: "Ada", age: 36, gender: "female" }) {
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
  const recordId = (created.data as any).insertOneUser.recordId as string;
  expect(recordId).toBeTruthy();
  expect((created.data as any).insertOneUser.record.name).toBe('Ada');

  const found = await gw.execute({
    query: /* GraphQL */ `
      query FindUser($id: ObjectID!) {
        findUserById(id: $id) {
          id
          name
          age
        }
        findUsers(query: { name: { eq: "Ada" } }) {
          id
          name
        }
        countDocumentsUsers(query: { gender: { eq: "female" } })
      }
    `,
    variables: { id: recordId },
  });
  expect(found.errors).toBeUndefined();
  expect(found.data).toMatchObject({
    findUserById: { id: recordId, name: 'Ada', age: 36 },
    findUsers: [{ id: recordId, name: 'Ada' }],
    countDocumentsUsers: 1,
  });
}, 120_000);
