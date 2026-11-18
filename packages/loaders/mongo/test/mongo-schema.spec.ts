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
    expect(sdl).toContain('findUserById(id: ObjectID!)');
    expect(sdl).toContain('input ObjectIDQueryOperators');
    expect(sdl).toContain('id: ObjectID!');
    expect(sdl).not.toContain('input IDQueryOperators');
    expect(sdl).toContain('findUsers(query:');
    expect(sdl).toContain('findOneUser(query:');
    expect(sdl).toContain('countDocumentsUsers(query:');
    expect(sdl).toContain('insertOneUser(document:');
    expect(sdl).toContain('updateOneUser(query:');
    expect(sdl).toContain('update: UserUpdateInput!');
    expect(sdl).toContain('input UserUpdateInput');
    expect(sdl).toContain('set: UserSetInput');
    expect(sdl).toContain('input UserSetInput');
    expect(sdl).toContain('inc: UserNumericUpdateInput');
    expect(sdl).not.toContain('update: JSON!');
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

  it('applies fields.required / remove without JSON update bypasses', async () => {
    const schema = await loadGraphQLSchemaFromMongo('restricted', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'Account',
          schema: new Schema(
            {
              name: String,
              status: { type: String, enum: ['active', 'closed'] },
              passwordHash: String,
              age: Number,
            },
            { collection: 'accounts' },
          ),
          collection: 'accounts',
          options: {
            fields: {
              required: ['name', 'status'],
              remove: ['passwordHash'],
            },
          },
        },
      ],
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).not.toContain('passwordHash');
    expect(sdl).toContain('input AccountSetInput');
    expect(sdl).toContain('set: AccountSetInput');
    const typeBody = (kind: 'type' | 'input', name: string) => {
      const start = sdl.search(new RegExp(`${kind}\\s+${name}\\b`));
      expect(start).toBeGreaterThanOrEqual(0);
      const open = sdl.indexOf('{', start);
      expect(open).toBeGreaterThan(start);
      let depth = 0;
      for (let i = open; i < sdl.length; i++) {
        if (sdl[i] === '{') depth++;
        else if (sdl[i] === '}') {
          depth--;
          if (depth === 0) return sdl.slice(open + 1, i);
        }
      }
      throw new Error(`unclosed ${kind} ${name}`);
    };
    expect(typeBody('type', 'Account')).toMatch(/\bname:\s*String!/);
    expect(typeBody('type', 'Account')).toMatch(/\bstatus:\s*EnumAccountStatus!/);
    expect(typeBody('input', 'AccountDocumentInput')).toMatch(/\bname:\s*String!/);
    expect(typeBody('input', 'AccountDocumentInput')).toMatch(/\bstatus:\s*EnumAccountStatus!/);
    // SetInput stays partial (omit OK) — no `name: String!`.
    expect(typeBody('input', 'AccountSetInput')).toMatch(/\bname:\s*String\b/);
    expect(typeBody('input', 'AccountSetInput')).not.toMatch(/\bname:\s*String!/);
    expect(sdl).not.toContain('rename: JSON');
    expect(sdl).not.toContain('push: JSON');
  });
});
