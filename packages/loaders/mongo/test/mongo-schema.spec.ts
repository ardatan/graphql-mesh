import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Schema } from 'mongoose';
import { loadGraphQLSchemaFromMongo } from '../src/index.js';

describe('@omnigraph/mongo schema emit', () => {
  it('emits @mongo directives with where/orderBy and SQL-style roots', async () => {
    const userSchema = new Schema(
      {
        name: { type: String, index: true },
        age: { type: Number, index: true },
        gender: {
          type: String,
          enum: ['male', 'female', 'not-specified'],
        },
        someMixed: { type: Schema.Types.Mixed },
      },
      { collection: 'user_users' },
    );

    const schema = await loadGraphQLSchemaFromMongo('users', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'User',
          schema: userSchema,
          collection: 'user_users',
        },
      ],
    });

    const sdl = printSchemaWithDirectives(schema);

    expect(sdl).toContain('@transport');
    expect(sdl).toContain('kind: "mongo"');
    expect(sdl).toContain('@mongo(');
    expect(sdl).toContain('kind: FIND_ONE');
    expect(sdl).toContain('kind: FIND_MANY');
    expect(sdl).toContain('kind: COUNT');
    expect(sdl).toContain('kind: CONNECTION');
    expect(sdl).toContain('kind: PAGINATION');
    expect(sdl).toContain('kind: INSERT_ONE');
    expect(sdl).toContain('kind: UPDATE_ONE');
    expect(sdl).toContain('kind: DELETE_ONE');
    expect(sdl).toContain('user(id: ID!)');
    expect(sdl).toContain('usersByIds(ids:');
    expect(sdl).toContain('users(where:');
    expect(sdl).toContain('allUsers(');
    expect(sdl).toContain('usersPagination(');
    expect(sdl).toContain('usersCount(where:');
    expect(sdl).toContain('createUser(input:');
    expect(sdl).toContain('where: UserWhereInput');
    expect(sdl).toContain('orderBy: UserOrderByInput');
    expect(sdl).toContain('$args.where');
    expect(sdl).toContain('$args.orderBy');
    expect(sdl).toContain('id: ID!');
    expect(sdl).not.toContain('User_findById');
    expect(sdl).not.toContain('filter: UserFilter');
    expect(sdl).not.toContain('$args.filter');
    expect(sdl).not.toContain('sort: String');
    expect(sdl).toMatchSnapshot('user-full-slice');
  });
});
