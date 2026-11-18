import { buildASTSchema, parse as parseGraphql } from 'graphql';
import { Schema } from 'mongoose';
import { getDirective, printSchemaWithDirectives } from '@graphql-tools/utils';
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
    expect(sdl).toContain('findUsers(filter:');
    expect(sdl).toContain('findOneUser(filter:');
    expect(sdl).toContain('countDocumentsUsers(filter:');
    expect(sdl).toContain('insertOneUser(document:');
    expect(sdl).toContain('updateOneUser(filter:');
    expect(sdl).toContain('update: UserUpdateInput!');
    expect(sdl).toContain('input UserUpdateInput');
    expect(sdl).toContain('set: UserSetInput');
    expect(sdl).toContain('input UserSetInput');
    expect(sdl).toContain('inc: UserNumericUpdateInput');
    expect(sdl).not.toContain('update: JSON!');
    expect(sdl).toContain('deleteOneUser(filter:');
    expect(sdl).toContain('input UserFilterInput');
    expect(sdl).toContain('enum UserSort');
    expect(sdl).toContain('id_asc');
    expect(sdl).toContain('age_desc');
    expect(sdl).toContain('and: [UserFilterInput!]');
    expect(sdl).not.toContain('AND: [UserFilterInput!]');
    expect(sdl).toContain('input FloatQueryOperators');
    expect(sdl).toContain('gte: Float');
    expect(sdl).toContain('$args.filter');
    expect(sdl).toContain('$args.sort');
    expect(sdl).toContain('enum EnumUserGender');
    expect(sdl).toContain('type UserAddress');
    expect(sdl).toContain('languages: [UserLanguages]');
    expect(sdl).toContain('Some dynamic data');
    expect(sdl).not.toContain('query: UserQueryInput');
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
          fields: {
            required: ['name', 'status'],
            remove: ['passwordHash'],
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
    expect(transport?.options?.objectIdFieldsByCollection).toEqual([
      { collection: 'posts', fields: ['owner'] },
    ]);
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
          fields: { required: ['title'] },
        },
        {
          name: 'Note',
          schema: new Schema({ title: String, owner: String }, { collection: 'notes' }),
          collection: 'notes',
        },
      ],
    });
    const transport = (schema.extensions as any)?.directives?.transport;
    expect(transport?.options?.objectIdFieldsByCollection).toEqual(
      expect.arrayContaining([
        { collection: 'posts', fields: ['owner'] },
        { collection: 'notes', fields: [] },
      ]),
    );
    expect(transport?.options?.requiredFieldsByCollection).toEqual([
      { collection: 'posts', fields: ['title'] },
    ]);
  });

  it('merges ObjectId fields across views and rejects ObjectId conflicts', async () => {
    const schema = await loadGraphQLSchemaFromMongo('merged-oid', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'AccountOwner',
          schema: new Schema(
            { owner: { type: Schema.Types.ObjectId }, name: String },
            { collection: 'accounts' },
          ),
          collection: 'accounts',
        },
        {
          name: 'AccountReviewer',
          schema: new Schema(
            { reviewer: { type: Schema.Types.ObjectId }, name: String },
            { collection: 'accounts' },
          ),
          collection: 'accounts',
        },
      ],
    });
    const transport = (schema.extensions as any)?.directives?.transport;
    const entry = transport?.options?.objectIdFieldsByCollection?.find(
      (e: { collection: string }) => e.collection === 'accounts',
    );
    expect(entry?.fields?.sort()).toEqual(['owner', 'reviewer']);

    await expect(
      loadGraphQLSchemaFromMongo('oid-conflict', {
        endpoint: 'mongodb://localhost:27017/test',
        models: [
          {
            name: 'A',
            schema: new Schema(
              { owner: { type: Schema.Types.ObjectId } },
              { collection: 'accounts' },
            ),
            collection: 'accounts',
          },
          {
            name: 'B',
            schema: new Schema({ owner: String }, { collection: 'accounts' }),
            collection: 'accounts',
          },
        ],
      }),
    ).rejects.toThrow(/Conflicting BSON ObjectId/);
  });

  it('rejects conflicting required policies on the same collection', async () => {
    await expect(
      loadGraphQLSchemaFromMongo('req-conflict', {
        endpoint: 'mongodb://localhost:27017/test',
        models: [
          {
            name: 'TitleView',
            schema: new Schema({ title: String, nickname: String }, { collection: 'accounts' }),
            collection: 'accounts',
            fields: { required: ['title'] },
          },
          {
            name: 'NickView',
            schema: new Schema({ title: String, nickname: String }, { collection: 'accounts' }),
            collection: 'accounts',
            fields: { required: ['nickname'] },
          },
        ],
      }),
    ).rejects.toThrow(/Conflicting required-field policies/);
  });

  it('prints hyphenated collection ObjectId maps that round-trip through SDL', async () => {
    const schema = await loadGraphQLSchemaFromMongo('hyphen', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'AccountRecord',
          schema: new Schema(
            { owner: { type: Schema.Types.ObjectId }, name: String },
            { collection: 'account-records' },
          ),
          collection: 'account-records',
        },
      ],
    });
    const fromExt = (schema.extensions as any)?.directives?.transport?.options
      ?.objectIdFieldsByCollection;
    expect(fromExt).toEqual([{ collection: 'account-records', fields: ['owner'] }]);
    const sdl = printSchemaWithDirectives(schema);
    // Entry-list encoding: hyphenated name is a string value, not an object key.
    expect(sdl).toMatch(/collection:\s*"account-records"/);
    expect(sdl).not.toMatch(/objectIdFieldsByCollection:\s*\{[^}]*account-records\s*:/);
    expect(() => parseGraphql(sdl)).not.toThrow();
    // Round-trip: re-parse SDL and read @transport options from the new schema.
    const roundTripped = buildASTSchema(parseGraphql(sdl), {
      assumeValid: true,
      assumeValidSDL: true,
    });
    const transportDirs = getDirective(roundTripped, roundTripped, 'transport') as
      | Array<{
          options?: {
            objectIdFieldsByCollection?: Array<{ collection: string; fields: string[] }>;
          };
        }>
      | undefined;
    expect(transportDirs?.[0]?.options?.objectIdFieldsByCollection).toEqual([
      { collection: 'account-records', fields: ['owner'] },
    ]);
  });

  it('omits raw aggregate subgraph-wide when any model is restricted', async () => {
    const schema = await loadGraphQLSchemaFromMongo('mixed', {
      endpoint: 'mongodb://localhost:27017/test',
      models: [
        {
          name: 'Account',
          schema: new Schema({ name: String, passwordHash: String }, { collection: 'accounts' }),
          collection: 'accounts',
          fields: { remove: ['passwordHash'] },
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
          fields: { required: ['name'] },
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
    expect(transport?.options?.placeholderFieldsByCollection).toEqual([
      { collection: 'tokens', fields: ['_'] },
      { collection: 'notes', fields: [] },
    ]);
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
    // Per-root directive args — do not regex across roots (false positives if a binder is dropped).
    const query = schema.getQueryType();
    const mutation = schema.getMutationType();
    const findByIdDirs = getDirective(
      schema,
      query!.getFields().findCircleById,
      'mongo__findOne',
    ) as Array<{ query?: string }> | undefined;
    expect(findByIdDirs?.[0]?.query).toMatch(/kind:\s*"Circle"/);
    const insertOneDirs = getDirective(
      schema,
      mutation!.getFields().insertOneCircle,
      'mongo__insertOne',
    ) as Array<{ set?: string }> | undefined;
    expect(insertOneDirs?.[0]?.set).toMatch(/kind:\s*"Circle"/);
    expect(insertOneDirs?.[0]?.set).not.toMatch(/documents:/);
    expect(sdl).not.toContain('rename: JSON');
    // `$unionWith` can bypass prepended discriminator `$match` — omit until scoped solidly.
    expect(sdl).not.toMatch(/\baggregateCircles\b/);
  });

  it('honors queryAndMutations false toggles and naming overrides', async () => {
    const schema = await loadGraphQLSchemaFromMongo('ops', {
      endpoint: 'mongodb://localhost:27017/test',
      naming: {
        findManyField: typeName => `list${typeName}s`,
        insertOneField: typeName => `add${typeName}`,
      },
      models: [
        {
          name: 'Item',
          schema: new Schema({ title: String }, { collection: 'items' }),
          collection: 'items',
          queryAndMutations: {
            insertMany: false,
            deleteMany: false,
            aggregate: false,
          },
        },
      ],
    });
    const sdl = printSchemaWithDirectives(schema);
    expect(sdl).toContain('listItems(');
    expect(sdl).not.toContain('findItems(');
    expect(sdl).toContain('addItem(');
    expect(sdl).not.toContain('insertOneItem(');
    expect(sdl).toContain('findItemById(');
    expect(sdl).not.toContain('insertManyItems(');
    expect(sdl).not.toContain('deleteManyItems(');
    expect(sdl).not.toContain('aggregateItems(');
    expect(sdl).toContain('updateOneItem(');
  });
});
