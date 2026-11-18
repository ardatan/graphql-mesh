import { Schema } from 'mongoose';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromMongo } from '../src/index.js';

describe('@omnigraph/mongo schema emit', () => {
  it('emits @mongo directives with filter/sort and collection-method roots', async () => {
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
    expect(sdl).toContain('findUserById(id: ID!)');
    expect(sdl).toContain('findUsersByIds(ids:');
    expect(sdl).toContain('findUsers(filter:');
    expect(sdl).toContain('findOneUser(filter:');
    expect(sdl).toContain('findUsersConnection(');
    expect(sdl).toContain('findUsersPagination(');
    expect(sdl).toContain('countDocumentsUsers(filter:');
    expect(sdl).toContain('aggregateUsers(');
    expect(sdl).toContain('kind: AGGREGATE');
    expect(sdl).toContain('insertOneUser(document:');
    expect(sdl).toContain('insertManyUsers(documents:');
    expect(sdl).toContain('updateOneUser(filter:');
    expect(sdl).toContain('deleteOneUser(filter:');
    expect(sdl).toContain('$args.filter');
    expect(sdl).toContain('$args.sort');
    expect(sdl).toContain('id: ID!');
    expect(sdl).toContain('error: MongoError');
    expect(sdl).toContain('interface ErrorInterface');
    expect(sdl).toContain('salaryDecimal: Decimal128');
    expect(sdl).toContain('enum EnumUserGender');
    expect(sdl).toContain('not_specified');
    expect(sdl).toContain('enum EnumUserLanguagesSkill');
    expect(sdl).toContain('type UserAddress');
    expect(sdl).toContain('type UserLanguages');
    expect(sdl).toContain('type UserContacts');
    expect(sdl).toContain('address: UserAddress');
    expect(sdl).toContain('languages: [UserLanguages]');
    expect(sdl).toContain('contacts: UserContacts');
    expect(sdl).toContain('phones: [String]');
    expect(sdl).toContain('geo: [Float]');
    expect(sdl).toContain('Some dynamic data');
    expect(sdl).not.toContain('User_findById');
    expect(sdl).not.toContain('where: UserWhereInput');
    expect(sdl).not.toContain('$args.where');
    expect(sdl).not.toContain('$args.orderBy');
    expect(sdl).toMatchSnapshot('user-full-slice');
  });
});
