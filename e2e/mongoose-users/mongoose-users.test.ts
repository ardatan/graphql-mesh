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
  expect(composition.result).toContain('filter: UserFilterInput');
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
        insertOneUser(document: { name: "Ada", age: 36, gender: female }) {
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
        findUsers(filter: { name: { eq: "Ada" } }) {
          id
          name
        }
        countDocumentsUsers(filter: { gender: { eq: "female" } })
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

  // Decimal128 through composed gateway (scalar parseValue + transport coerce).
  const withDecimal = await gw.execute({
    query: /* GraphQL */ `
      mutation InsertDecimal($salary: Decimal128!) {
        insertOneUser(
          document: { name: "Grace", age: 40, gender: female, salaryDecimal: $salary }
        ) {
          record {
            id
            salaryDecimal
          }
        }
      }
    `,
    variables: { salary: '12.50' },
  });
  expect(withDecimal.errors).toBeUndefined();
  const graceId = (withDecimal.data as any).insertOneUser.record.id as string;
  expect((withDecimal.data as any).insertOneUser.record.salaryDecimal).toBe('12.50');

  const updatedDecimal = await gw.execute({
    query: /* GraphQL */ `
      mutation UpdateDecimal($id: ObjectID!, $salary: Decimal128!) {
        updateOneUser(filter: { id: { eq: $id } }, update: { set: { salaryDecimal: $salary } }) {
          record {
            salaryDecimal
          }
        }
      }
    `,
    variables: { id: graceId, salary: '99.01' },
  });
  expect(updatedDecimal.errors).toBeUndefined();
  expect((updatedDecimal.data as any).updateOneUser.record.salaryDecimal).toBe('99.01');

  const queriedDecimal = await gw.execute({
    query: /* GraphQL */ `
      query FindBySalary($salary: Decimal128!) {
        findUsers(filter: { salaryDecimal: { eq: $salary } }) {
          id
          salaryDecimal
        }
      }
    `,
    variables: { salary: '99.01' },
  });
  expect(queriedDecimal.errors).toBeUndefined();
  expect(queriedDecimal.data).toMatchObject({
    findUsers: [{ id: graceId, salaryDecimal: '99.01' }],
  });
}, 120_000);
