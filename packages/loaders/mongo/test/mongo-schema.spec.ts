import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Schema } from 'mongoose';
import { loadGraphQLSchemaFromMongo } from '../src/index.js';

describe('@omnigraph/mongo schema emit', () => {
  it('emits @mongo directives with filter binders and v0-style roots', async () => {
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
    expect(sdl).toContain('User_findById');
    expect(sdl).toContain('User_findByIds');
    expect(sdl).toContain('User_findMany');
    expect(sdl).toContain('User_connection');
    expect(sdl).toContain('User_pagination');
    expect(sdl).toContain('User_createOne');
    expect(sdl).toContain('User_dataLoaderMany');
    expect(sdl).toContain('filter: UserFilter');
    expect(sdl).toContain('$args.filter');
    expect(sdl).toContain('id: ID!');
    expect(sdl).toContain('_id: ID!');
    expect(sdl).not.toContain('where: UserWhere');
    expect(sdl).toMatchSnapshot('user-full-slice');
  });
});
