import { renameTransform } from './../src/index';
import { buildSchema, printSchema } from 'graphql';

describe('rename', () => {
  it('should change the name of a type', async () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        user: User!
      }

      type User {
        id: ID!
      }
    `);

    const newSchema = await renameTransform({
      schema,
      config: {
        type: '',
        from: 'User',
        to: 'MyUser'
      }
    });

    expect(newSchema.getType('User')).toBeUndefined();
    expect(newSchema.getType('MyUser')).toBeDefined();
    expect(printSchema(newSchema)).toMatchSnapshot();
  });
});
