import { renameTransform } from './../src/index';
import { buildSchema, printSchema } from 'graphql';

describe('rename', () => {
  const schema = buildSchema(/* GraphQL */ `
    type Query {
      user: User!
    }

    type User {
      id: ID!
    }
  `);

  it('should change the name of a type', async () => {
    const newSchema = await renameTransform({
      schema,
      config: [
        {
          from: 'User',
          to: 'MyUser'
        }
      ]
    });

    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('MyUser')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });
});
