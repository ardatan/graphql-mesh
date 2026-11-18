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
    // Raw aggregate would bypass fields.remove — omit for restricted models.
    expect(sdl).not.toMatch(/\baggregateAccounts\b/);
  });

  it('does not register String refs as ObjectId coercion fields', async () => {
    const schema = await loadGraphQLSchemaFromMongo('posts', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'Post',
          schema: new Schema(
            {
              title: String,
              authorId: { type: String, ref: 'User' },
              owner: { type: Schema.Types.ObjectId, ref: 'User' },
            },
            { collection: 'posts' },
          ),
          collection: 'posts',
        },
      ],
    });
    const transport = (schema.extensions as any)?.directives?.transport;
    const objectIdFields: string[] = transport?.options?.objectIdFields || [];
    expect(objectIdFields).toContain('owner');
    expect(objectIdFields).not.toContain('authorId');
    expect(transport?.options?.objectIdFieldsByCollection).toEqual({ posts: ['owner'] });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toMatch(/authorId:\s*String/);
    expect(sdl).toMatch(/owner:\s*ObjectID/);
  });

  it('scopes objectId and required fields by collection across models', async () => {
    const schema = await loadGraphQLSchemaFromMongo('scoped', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'Post',
          schema: new Schema(
            { title: String, owner: { type: Schema.Types.ObjectId, ref: 'User' } },
            { collection: 'posts' },
          ),
          collection: 'posts',
          options: { fields: { required: ['title'] } },
        },
        {
          name: 'Note',
          schema: new Schema({ title: String, owner: String }, { collection: 'notes' }),
          collection: 'notes',
        },
      ],
    });
    const transport = (schema.extensions as any)?.directives?.transport;
    expect(transport?.options?.objectIdFieldsByCollection).toEqual({ posts: ['owner'] });
    expect(transport?.options?.objectIdFieldsByCollection?.notes).toBeUndefined();
    expect(transport?.options?.requiredFieldsByCollection).toEqual({ posts: ['title'] });
    expect(transport?.options?.requiredFieldsByCollection?.notes).toBeUndefined();
  });

  it('omits raw aggregate subgraph-wide when any model is restricted', async () => {
    const schema = await loadGraphQLSchemaFromMongo('mixed', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'Account',
          schema: new Schema({ name: String, passwordHash: String }, { collection: 'accounts' }),
          collection: 'accounts',
          options: { fields: { remove: ['passwordHash'] } },
        },
        {
          name: 'Note',
          schema: new Schema({ body: String }, { collection: 'notes' }),
          collection: 'notes',
        },
      ],
    });
    const sdl = printSchemaWithDirectives(schema);
    // Unrestricted Note must not keep aggregate (could $unionWith accounts).
    expect(sdl).not.toMatch(/\baggregateNotes\b/);
    expect(sdl).not.toMatch(/\baggregateAccounts\b/);
  });

  it('declares stringIdCollections for String _id models', async () => {
    const schema = await loadGraphQLSchemaFromMongo('externals', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'ExternalUser',
          schema: new Schema({ _id: String, name: String }, { collection: 'external_users' }),
          collection: 'external_users',
        },
      ],
    });
    const transport = (schema.extensions as any)?.directives?.transport;
    expect(transport?.options?.stringIdCollections).toEqual(['external_users']);
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toMatch(/findExternalUserById\(id: String!\)/);
    expect(sdl).toMatch(/input ExternalUserDocumentInput[\s\S]*?\bid:\s*String!/);
    expect(sdl).toMatch(/recordId:\s*String/);
    expect(sdl).toMatch(/recordIds:\s*\[String!\]/);
    expect(sdl).toMatch(/_id:\s*\$args\.document\.id/);
    expect(sdl).toMatch(/updateExternalUserById\(id: String!/);
    expect(sdl).toMatch(/deleteExternalUserById\(id: String!/);
  });

  it('omits rename JSON when only fields.required is set; excludes required from UnsetInput', async () => {
    const schema = await loadGraphQLSchemaFromMongo('required-only', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'Profile',
          schema: new Schema({ name: String, nickname: String }, { collection: 'profiles' }),
          collection: 'profiles',
          options: { fields: { required: ['name'] } },
        },
      ],
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).not.toContain('rename: JSON');
    expect(sdl).not.toContain('push: JSON');
    const unsetStart = sdl.search(/input\s+ProfileUnsetInput\b/);
    expect(unsetStart).toBeGreaterThanOrEqual(0);
    const open = sdl.indexOf('{', unsetStart);
    let depth = 0;
    let body = '';
    for (let i = open; i < sdl.length; i++) {
      if (sdl[i] === '{') depth++;
      else if (sdl[i] === '}') {
        depth--;
        if (depth === 0) {
          body = sdl.slice(open + 1, i);
          break;
        }
      }
    }
    expect(body).not.toMatch(/\bname\b/);
    expect(body).toMatch(/\bnickname\b/);
  });

  it('scopes placeholderFieldsByCollection to id-only models', async () => {
    const schema = await loadGraphQLSchemaFromMongo('placeholders', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'Token',
          schema: new Schema({}, { collection: 'tokens' }),
          collection: 'tokens',
        },
        {
          name: 'Note',
          schema: new Schema({ _: String, body: String }, { collection: 'notes' }),
          collection: 'notes',
        },
      ],
    });
    const transport = (schema.extensions as any)?.directives?.transport;
    // Empty scoped entry for notes so the executor does not fall back to global `_`.
    expect(transport?.options?.placeholderFieldsByCollection).toEqual({
      tokens: ['_'],
      notes: [],
    });
    expect(transport?.options?.placeholderFields).toEqual(['_']);
  });

  it('reserves GraphQL id for String _id when a stored id path exists', async () => {
    const schema = await loadGraphQLSchemaFromMongo('id-collision', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'External',
          schema: new Schema(
            { _id: String, id: String, name: String },
            { collection: 'externals' },
          ),
          collection: 'externals',
        },
      ],
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toMatch(/input ExternalDocumentInput[\s\S]*?\bid:\s*String!/);
    expect(sdl).toMatch(/storedId:\s*String/);
    expect(sdl).toMatch(/id:\s*\$args\.document\.storedId/);
    expect(sdl).toMatch(/_id:\s*\$args\.document\.id/);
  });

  it('stamps discriminator key on subtype roots and omits it from fields', async () => {
    const base = new Schema(
      { name: String, kind: { type: String, default: 'base' } },
      { collection: 'shapes', discriminatorKey: 'kind' },
    );
    // Mimic mongoose discriminatorMapping without a live connection.
    (base as any).discriminatorMapping = {
      key: 'kind',
      value: 'Circle',
      isRoot: false,
    };
    const schema = await loadGraphQLSchemaFromMongo('shapes', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'Circle',
          schema: base,
          collection: 'shapes',
          discriminator: { key: 'kind', value: 'Circle' },
        },
      ],
    });
    const sdl = printSchemaWithDirectives(schema);
    // Object fields omit discriminator key; binders still stamp it.
    const typeBody =
      sdl.match(/type Circle implements[\s\S]*?^}/m)?.[0] ||
      sdl.match(/type Circle [\s\S]*?^}/m)?.[0] ||
      '';
    expect(typeBody).toMatch(/type Circle/);
    expect(typeBody).not.toMatch(/\bkind\b/);
    expect(sdl).toMatch(/kind:\s*"Circle"/);
    expect(sdl).toMatch(/findCircleById[\s\S]*?kind:\s*"Circle"/);
    expect(sdl).toMatch(/insertOneCircle[\s\S]*?kind:\s*"Circle"/);
    expect(sdl).toMatch(/insertManyCircles[\s\S]*?kind:\s*"Circle"/);
  });
});
