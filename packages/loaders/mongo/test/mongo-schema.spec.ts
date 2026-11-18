import { Schema } from 'mongoose';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromMongo } from '../src/index.js';

describe('@omnigraph/mongo schema emit', () => {
  it('emits typed query/sort with Mongo method roots', async () => {
    const languagesSchema = new Schema(
      {
        language: String,
        skill: { type: String, enum: ['basic', 'fluent', 'native'] },
      },
      { _id: false },
    );
    const addressSchema = new Schema({
      street: String,
      geo: { type: [Number] },
    });
    const userSchema = new Schema(
      {
        name: { type: String, index: true },
        age: { type: Number, index: true },
        languages: { type: [languagesSchema], default: [] },
        contacts: {
          email: String,
          phones: [String],
        },
        gender: {
          type: String,
          enum: ['male', 'female', 'not-specified'],
        },
        address: { type: addressSchema },
        someMixed: { type: Schema.Types.Mixed, description: 'Some dynamic data' },
        salaryDecimal: { type: Schema.Types.Decimal128 },
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

    expect(sdl).toContain('@mongo__findOne');
    expect(sdl).toContain('@mongo__find');
    expect(sdl).toContain('@mongo__count');
    expect(sdl).toContain('@mongo__insertOne');
    expect(sdl).toContain('findUserById(id: ID!)');
    expect(sdl).toContain('findUsers(query:');
    expect(sdl).toContain('findOneUser(query:');
    expect(sdl).toContain('countDocumentsUsers(query:');
    expect(sdl).toContain('insertOneUser(document:');
    expect(sdl).toContain('updateOneUser(query:');
    expect(sdl).toContain('deleteOneUser(query:');
    expect(sdl).toContain('input UserQueryInput');
    expect(sdl).toContain('enum UserSort');
    expect(sdl).toContain('id_asc');
    expect(sdl).toContain('age_desc');
    expect(sdl).toContain('and: [UserQueryInput!]');
    expect(sdl).not.toContain('AND: [UserQueryInput!]');
    expect(sdl).toContain('input FloatQueryOperators');
    expect(sdl).toContain('gte: Float');
    expect(sdl).toContain('$args.query');
    expect(sdl).toContain('$args.sort');
    expect(sdl).toContain('enum EnumUserGender');
    expect(sdl).toContain('type UserAddress');
    expect(sdl).toContain('languages: [UserLanguages]');
    expect(sdl).toContain('Some dynamic data');
    expect(sdl).not.toContain('where: UserWhereInput');
    expect(sdl).not.toContain('kind: FIND_ONE');
    expect(sdl).not.toContain('$args.where');
    expect(sdl).toMatchSnapshot('user-full-slice');
  });
});
