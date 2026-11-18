import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Schema } from 'mongoose';
import { loadGraphQLSchemaFromMongo } from '../src/index.js';

describe('@omnigraph/mongo schema emit', () => {
  it('emits @mongo directives and slim @transport(kind: mongo)', async () => {
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
    expect(sdl).toContain('location: "mongodb://localhost:27017/test"');
    expect(sdl).toContain('@mongo(');
    expect(sdl).toContain('kind: FIND_ONE');
    expect(sdl).toContain('kind: FIND_MANY');
    expect(sdl).toContain('kind: COUNT');
    expect(sdl).toContain('collection: "user_users"');
    expect(sdl).toContain('User_findById');
    expect(sdl).toContain('User_findMany');
    expect(sdl).toContain('User_findOne');
    expect(sdl).toContain('User_count');
    expect(sdl).toContain('where: UserWhere');
    expect(sdl).toContain('$args.where');
    expect(sdl).toContain('type User');
    expect(sdl).toMatch(/type User[\s\S]*@mongo\([\s\S]*\$this\.id/);
    expect(sdl).toMatchSnapshot('user-find-slice');
  });
});
