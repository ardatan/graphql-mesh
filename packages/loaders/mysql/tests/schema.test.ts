import { getNamedType, isInputObjectType, isNonNullType, isObjectType } from 'graphql';
import { upgrade } from 'mysql-utilities';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromMySQL } from '../src/schema.js';

jest.mock('mysql', () => ({
  // We start with an empty connection mock, we will override it in the mockDatabaseUpgrade function
  createConnection: jest.fn(() => ({})),
}));

// See mockDatabaseUpgrade for the actual mocks
jest.mock('mysql-utilities');

jest.mock('@graphql-mesh/cross-helpers', () => ({
  fs: {
    readFileSync: jest.fn(),
  },
  util: {
    // We do not promisify, the functions passed in are already promise-based for simplicity
    promisify: jest.fn(fn => fn),
  },
}));

// Mock transport-mysql
jest.mock('@graphql-mesh/transport-mysql', () => ({
  getConnectionOptsFromEndpointUri: jest.fn(() => ({
    host: 'localhost',
    port: 3306,
    user: 'test',
    password: 'test',
    database: 'testdb',
    protocol: 'mysql:',
  })),
}));

const mockDatabaseUpgrade = (
  options: Partial<{
    databaseTables: jest.Mock;
    fields: jest.Mock;
    foreign: jest.Mock;
    queryKeyValue: jest.Mock;
    end: jest.Mock;
  }>,
) => {
  jest.mocked(upgrade).mockImplementationOnce(connection => {
    connection.databaseTables = options.databaseTables ?? jest.fn();
    connection.fields = options.fields ?? jest.fn();
    connection.end = options.end ?? jest.fn();

    // By default there are no foreign keys. Override this method inside the individual tests
    connection.foreign = options.foreign ?? jest.fn(() => ({}));
    // By default there are no auto incremented columns. Override this method inside the individual tests
    connection.queryKeyValue = options.queryKeyValue ?? jest.fn(() => ({}));
  });
};

const loaderParamsDefaultMock: Parameters<typeof loadGraphQLSchemaFromMySQL> = [
  'test',
  {
    endpoint: 'mysql://test:test@localhost:3306/testdb',
  },
];

describe('loadGraphQLSchemaFromMySQL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('should correctly generate graphql schema from a mysql schema', () => {
    it('when there is a single basic mysql table', async () => {
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
        }),
        fields: jest.fn().mockResolvedValueOnce({
          user_id: {
            Field: 'user_id',
            Type: 'int(11)',
            Null: 'NO',
            Key: 'PRI',
            Default: null,
          },
        }),
      });

      const createdSchema = await loadGraphQLSchemaFromMySQL(...loaderParamsDefaultMock);

      expect(createdSchema).toBeDefined();
      expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
    });

    it('when there are multiple tables and a foreign key relationship', async () => {
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
          posts: {
            TABLE_NAME: 'posts',
            TABLE_COMMENT: 'Post table',
          },
        }),
        fields: jest
          .fn()
          .mockResolvedValueOnce({
            user_id: {
              Field: 'user_id',
              Type: 'int(11)',
              Null: 'NO',
              Key: 'PRI',
              Default: null,
            },
            username: {
              Field: 'username',
              Type: 'varchar(255)',
              Null: 'NO',
              Default: null,
            },
          })
          .mockResolvedValueOnce({
            post_id: {
              Field: 'post_id',
              Type: 'int(11)',
              Null: 'NO',
              Key: 'PRI',
              Default: null,
            },
            by_user_id: {
              Field: 'by_user_id',
              Type: 'int(11)',
              Null: 'NO',
              Default: null,
            },
          }),
        foreign: jest.fn(tableName => {
          if (tableName === 'posts') {
            return {
              fk_user_posts: {
                COLUMN_NAME: 'by_user_id',
                REFERENCED_TABLE_NAME: 'users',
                REFERENCED_COLUMN_NAME: 'user_id',
              },
            };
          } else {
            return {};
          }
        }),
      });

      const createdSchema = await loadGraphQLSchemaFromMySQL(...loaderParamsDefaultMock);

      expect(createdSchema).toBeDefined();
      expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
    });

    it('when the tables option is provided in order to filter some tables out', async () => {
      const filteredOutTableName = 'comments_table_name';
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
          posts: {
            TABLE_NAME: 'posts',
            TABLE_COMMENT: 'Post table',
          },
          [filteredOutTableName]: {
            TABLE_NAME: filteredOutTableName,
            TABLE_COMMENT: 'Comment table',
          },
        }),
        fields: jest
          .fn()
          .mockResolvedValueOnce({
            user_id: {
              Field: 'user_id',
              Type: 'int(11)',
              Null: 'NO',
              Key: 'PRI',
              Default: null,
            },
            username: {
              Field: 'username',
              Type: 'varchar(255)',
              Null: 'NO',
              Default: null,
            },
          })
          .mockResolvedValueOnce({
            post_id: {
              Field: 'post_id',
              Type: 'int(11)',
              Null: 'NO',
              Key: 'PRI',
              Default: null,
            },
            by_user_id: {
              Field: 'by_user_id',
              Type: 'int(11)',
              Null: 'NO',
              Default: null,
            },
          }),
      });

      const createdSchema = await loadGraphQLSchemaFromMySQL(loaderParamsDefaultMock[0], {
        ...loaderParamsDefaultMock[1],
        tables: ['users', 'posts'],
      });

      const schemaString = printSchemaWithDirectives(createdSchema);
      expect(createdSchema).toBeDefined();
      expect(schemaString).not.toContain(filteredOutTableName);
      expect(schemaString).toMatchSnapshot();
    });

    it('when the tableFields option is provided in order to filter some fields out', async () => {
      const filteredOutFieldName = 'by_user_id';
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
          posts: {
            TABLE_NAME: 'posts',
            TABLE_COMMENT: 'Post table',
          },
        }),
        fields: jest
          .fn()
          .mockResolvedValueOnce({
            user_id: {
              Field: 'user_id',
              Type: 'int(11)',
              Null: 'NO',
              Key: 'PRI',
              Default: null,
            },
            username: {
              Field: 'username',
              Type: 'varchar(255)',
              Null: 'NO',
              Default: null,
            },
          })
          .mockResolvedValueOnce({
            post_id: {
              Field: 'post_id',
              Type: 'int(11)',
              Null: 'NO',
              Default: null,
            },
            [filteredOutFieldName]: {
              Field: filteredOutFieldName,
              Type: 'int(11)',
              Null: 'NO',
              Default: null,
            },
          }),
      });

      const createdSchema = await loadGraphQLSchemaFromMySQL(loaderParamsDefaultMock[0], {
        ...loaderParamsDefaultMock[1],
        tableFields: [{ table: 'posts', fields: ['post_id'] }],
      });

      const schemaString = printSchemaWithDirectives(createdSchema);
      expect(schemaString).not.toContain(filteredOutFieldName);
      expect(schemaString).toMatchSnapshot();
    });

    it('when there are ENUM fields in the mysql definition', async () => {
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
        }),
        fields: jest.fn().mockResolvedValueOnce({
          user_id: {
            Field: 'user_id',
            Type: 'int(11)',
            Null: 'NO',
            Key: 'PRI',
            Default: null,
          },
          status: {
            Field: 'status',
            Type: "enum('active','inactive','pending')",
            Null: 'NO',
            Key: '',
            Default: 'active',
            Extra: '',
          },
        }),
      });
      const createdSchema = await loadGraphQLSchemaFromMySQL(...loaderParamsDefaultMock);

      expect(createdSchema).toBeDefined();
      const schemaString = printSchemaWithDirectives(createdSchema);
      expect(schemaString).toContain('enum users_status');
      expect(schemaString).toContain('active');
      expect(schemaString).toContain('inactive');
      expect(schemaString).toContain('pending');
      expect(schemaString).toMatchSnapshot();
    });

    it('when there are SET fields in the mysql definition', async () => {
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
        }),
        fields: jest.fn().mockResolvedValueOnce({
          user_id: {
            Field: 'user_id',
            Type: 'int(11)',
            Null: 'NO',
            Key: 'PRI',
            Default: null,
            Extra: 'auto_increment',
            Comment: 'Primary key',
          },
          tags: {
            Field: 'tags',
            Type: "set('tag1','tag2','tag3')",
            Null: 'YES',
            Key: '',
            Default: null,
            Extra: '',
            Comment: 'User tags',
          },
        }),
        queryKeyValue: jest.fn().mockResolvedValueOnce({
          users: 'user_id',
        }),
      });

      const createdSchema = await loadGraphQLSchemaFromMySQL(...loaderParamsDefaultMock);

      expect(createdSchema).toBeDefined();
      const schemaString = printSchemaWithDirectives(createdSchema);
      expect(schemaString).toContain('enum users_tags');
      expect(schemaString).toContain('tag1');
      expect(schemaString).toContain('tag2');
      expect(schemaString).toContain('tag3');
      expect(schemaString).toMatchSnapshot();
    });

    it('when there are json fields in the mysql definition', async () => {
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
        }),
        fields: jest.fn().mockResolvedValueOnce({
          user_id: {
            Field: 'user_id',
            Type: 'int(11)',
            Null: 'NO',
            Key: 'PRI',
            Default: null,
            Extra: 'auto_increment',
            Comment: 'Primary key',
          },
          data_table_field: {
            Field: 'data_table_field',
            Type: 'json',
            Null: 'YES',
            Default: null,
            Extra: '',
            Comment: 'JSON data field',
          },
        }),
        queryKeyValue: jest.fn().mockResolvedValueOnce({
          users: 'user_id',
        }),
      });

      const createdSchema = await loadGraphQLSchemaFromMySQL(...loaderParamsDefaultMock);

      expect(createdSchema).toBeDefined();
      const schemaString = printSchemaWithDirectives(createdSchema);
      expect(schemaString).toContain('data_table_field: JSON');
      expect(schemaString).toMatchSnapshot();
    });

    it('when there is an auto increment field in the mysql definition', async () => {
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
        }),
        fields: jest.fn().mockResolvedValueOnce({
          user_id: {
            Field: 'user_id',
            Type: 'int(11)',
            Null: 'NO',
            Key: 'PRI',
            Default: null,
          },
          user_sequence_id: {
            Field: 'user_sequence_id',
            Type: 'int(11)',
            Null: 'NO',
            Default: null,
            Extra: 'auto_increment',
          },
        }),
        queryKeyValue: jest.fn().mockImplementationOnce(sqlString => {
          if (sqlString.includes('auto_increment')) {
            return {
              users: 'user_sequence_id',
            };
          }
        }),
      });

      const createdSchema = await loadGraphQLSchemaFromMySQL(...loaderParamsDefaultMock);

      expect(createdSchema).toBeDefined();

      // AST check: Verify that the users_InsertInput type has the correct field structure
      const usersInsertInputType = createdSchema.getType('users_InsertInput');
      expect(usersInsertInputType).toBeDefined();
      expect(isInputObjectType(usersInsertInputType)).toBe(true);

      if (isInputObjectType(usersInsertInputType)) {
        const fields = usersInsertInputType.getFields();

        // Check that user_id field exists and is required (non-null)
        expect(fields.user_id).toBeDefined();
        expect(isNonNullType(fields.user_id.type)).toBe(true);
        expect(getNamedType(fields.user_id.type).name).toBe('Int');

        // Check that user_sequence_id field exists and is optional (nullable)
        expect(fields.user_sequence_id).toBeDefined();
        expect(isNonNullType(fields.user_sequence_id.type)).toBe(false);
        expect(getNamedType(fields.user_sequence_id.type).name).toBe('Int');
      }

      expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
    });

    it('when there is a field with a nullable value and no default value', async () => {
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
        }),
        fields: jest.fn().mockResolvedValueOnce({
          user_id: {
            Field: 'user_id',
            Type: 'int(11)',
            Null: 'No',
            Key: 'PRI',
            Default: null,
          },
          user_name: {
            Field: 'user_name',
            Type: 'varchar(255)',
            Null: 'YES',
            Default: null,
          },
        }),
      });

      const createdSchema = await loadGraphQLSchemaFromMySQL(...loaderParamsDefaultMock);

      expect(createdSchema).toBeDefined();
      const schemaString = printSchemaWithDirectives(createdSchema);
      const usersType = createdSchema.getType('users');
      const usersInsertInputType = createdSchema.getType('users_InsertInput');

      expect(usersType).toBeDefined();
      expect(isObjectType(usersType)).toBe(true);

      expect(usersInsertInputType).toBeDefined();
      expect(isInputObjectType(usersInsertInputType)).toBe(true);

      if (isObjectType(usersType)) {
        const fields = usersType.getFields();
        expect(fields.user_name).toBeDefined();
        expect(isNonNullType(fields.user_name.type)).toBe(false);
        expect(getNamedType(fields.user_name.type).name).toBe('String');
      }
      if (isInputObjectType(usersInsertInputType)) {
        const fields = usersInsertInputType.getFields();
        expect(fields.user_name).toBeDefined();
        expect(isNonNullType(fields.user_name.type)).toBe(false);
        expect(getNamedType(fields.user_name.type).name).toBe('String');
      }

      expect(schemaString).toMatchSnapshot();
    });

    it('when there is a field with a nullable value and a default value', async () => {
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
        }),
        fields: jest.fn().mockResolvedValueOnce({
          user_id: {
            Field: 'user_id',
            Type: 'int(11)',
            Null: 'NO',
            Key: 'PRI',
            Default: null,
          },
          user_name: {
            Field: 'user_name',
            Type: 'varchar(255)',
            Null: 'YES',
            Default: 'default_guest_user_name',
          },
        }),
      });

      const createdSchema = await loadGraphQLSchemaFromMySQL(...loaderParamsDefaultMock);

      expect(createdSchema).toBeDefined();
      const schemaString = printSchemaWithDirectives(createdSchema);
      const usersInsertInputType = createdSchema.getType('users_InsertInput');
      const usersType = createdSchema.getType('users');

      expect(usersType).toBeDefined();
      expect(isObjectType(usersType)).toBe(true);

      expect(usersInsertInputType).toBeDefined();
      expect(isInputObjectType(usersInsertInputType)).toBe(true);

      if (isInputObjectType(usersInsertInputType)) {
        const fields = usersInsertInputType.getFields();
        expect(fields.user_name).toBeDefined();
        expect(isNonNullType(fields.user_name.type)).toBe(false);
        expect(getNamedType(fields.user_name.type).name).toBe('String');
      }

      if (isObjectType(usersType)) {
        const fields = usersType.getFields();
        expect(fields.user_name).toBeDefined();
        expect(isNonNullType(fields.user_name.type)).toBe(false);
        expect(getNamedType(fields.user_name.type).name).toBe('String');
      }

      expect(schemaString).toMatchSnapshot();
    });

    it('when there is a field with a non-nullable value and a default value', async () => {
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
        }),
        fields: jest.fn().mockResolvedValueOnce({
          user_id: {
            Field: 'user_id',
            Type: 'int(11)',
            Null: 'NO',
            Key: 'PRI',
            Default: null,
          },
          user_name: {
            Field: 'user_name',
            Type: 'varchar(255)',
            Null: 'NO',
            Default: 'default_guest_user_name',
          },
        }),
      });

      const createdSchema = await loadGraphQLSchemaFromMySQL(...loaderParamsDefaultMock);

      expect(createdSchema).toBeDefined();
      const usersInsertInputType = createdSchema.getType('users_InsertInput');
      expect(usersInsertInputType).toBeDefined();
      expect(isInputObjectType(usersInsertInputType)).toBe(true);

      const usersType = createdSchema.getType('users');

      expect(usersType).toBeDefined();
      expect(isObjectType(usersType)).toBe(true);

      expect(usersInsertInputType).toBeDefined();
      expect(isInputObjectType(usersInsertInputType)).toBe(true);

      if (isInputObjectType(usersInsertInputType)) {
        const fields = usersInsertInputType.getFields();
        expect(fields.user_name).toBeDefined();
        expect(isNonNullType(fields.user_name.type)).toBe(false);
      }

      if (isObjectType(usersType)) {
        const fields = usersType.getFields();
        expect(fields.user_name).toBeDefined();
        expect(isNonNullType(fields.user_name.type)).toBe(true);
      }

      expect(printSchemaWithDirectives(createdSchema)).toMatchSnapshot();
    });

    it('when there is a field with a comment', async () => {
      const userIdComment = 'A specific comment for user_id';
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
        }),
        fields: jest.fn().mockResolvedValueOnce({
          user_id: {
            Field: 'user_id',
            Type: 'int(11)',
            Null: 'NO',
            Key: 'PRI',
            Default: null,
            Comment: userIdComment,
          },
          user_name: {
            Field: 'user_name',
            Type: 'varchar(255)',
            Null: 'NO',
          },
        }),
      });

      const createdSchema = await loadGraphQLSchemaFromMySQL(...loaderParamsDefaultMock);

      expect(createdSchema).toBeDefined();
      const schemaString = printSchemaWithDirectives(createdSchema);
      expect(schemaString).toContain(userIdComment);
      expect(schemaString).toMatchSnapshot();
    });
  });

  describe('should correctly map MySQL types to GraphQL types', () => {
    it('should map MySQL types to GraphQL types correctly', async () => {
      mockDatabaseUpgrade({
        databaseTables: jest.fn().mockResolvedValueOnce({
          users: {
            TABLE_NAME: 'users',
            TABLE_COMMENT: 'User table',
          },
        }),
        fields: jest.fn().mockResolvedValueOnce({
          id: {
            Field: 'id',
            Type: 'int(11)',
            Null: 'NO',
            Key: 'PRI',
          },
          name: {
            Field: 'name',
            Type: 'varchar(255)',
            Null: 'NO',
          },
          email: {
            Field: 'email',
            Type: 'varchar(255)',
            Null: 'YES',
          },
          age: {
            Field: 'age',
            Type: 'tinyint unsigned',
            Null: 'YES',
          },
          balance: {
            Field: 'balance',
            Type: 'decimal(10,2)',
            Null: 'YES',
          },
          data: {
            Field: 'data',
            Type: 'json',
            Null: 'YES',
          },
          created_at: {
            Field: 'created_at',
            Type: 'datetime',
            Null: 'NO',
          },
          updated_at: {
            Field: 'updated_at',
            Type: 'timestamp',
            Null: 'YES',
          },
          is_active: {
            Field: 'is_active',
            Type: 'boolean',
            Null: 'NO',
          },
          bigint_field: {
            Field: 'bigint_field',
            Type: 'bigint',
            Null: 'YES',
          },
          bigint_unsigned_field: {
            Field: 'bigint_unsigned_field',
            Type: 'bigint unsigned',
            Null: 'YES',
          },
          binary_field: {
            Field: 'binary_field',
            Type: 'binary(255)',
            Null: 'YES',
          },
          bit_field: {
            Field: 'bit_field',
            Type: 'bit(1)',
            Null: 'YES',
          },
          blob_field: {
            Field: 'blob_field',
            Type: 'blob',
            Null: 'YES',
          },
          bool_field: {
            Field: 'bool_field',
            Type: 'bool',
            Null: 'YES',
          },
          char_field: {
            Field: 'char_field',
            Type: 'char(10)',
            Null: 'YES',
          },
          date_field: {
            Field: 'date_field',
            Type: 'date',
            Null: 'YES',
          },
          dec_field: {
            Field: 'dec_field',
            Type: 'dec(10,2)',
            Null: 'YES',
          },
          dec_unsigned_field: {
            Field: 'dec_unsigned_field',
            Type: 'dec unsigned',
            Null: 'YES',
          },
          decimal_unsigned_field: {
            Field: 'decimal_unsigned_field',
            Type: 'decimal unsigned',
            Null: 'YES',
          },
          double_field: {
            Field: 'double_field',
            Type: 'double',
            Null: 'YES',
          },
          double_unsigned_field: {
            Field: 'double_unsigned_field',
            Type: 'double unsigned',
            Null: 'YES',
          },
          float_field: {
            Field: 'float_field',
            Type: 'float',
            Null: 'YES',
          },
          float_unsigned_field: {
            Field: 'float_unsigned_field',
            Type: 'float unsigned',
            Null: 'YES',
          },
          int_unsigned_field: {
            Field: 'int_unsigned_field',
            Type: 'int unsigned',
            Null: 'YES',
          },
          integer_field: {
            Field: 'integer_field',
            Type: 'integer',
            Null: 'YES',
          },
          integer_unsigned_field: {
            Field: 'integer_unsigned_field',
            Type: 'integer unsigned',
            Null: 'YES',
          },
          longblob_field: {
            Field: 'longblob_field',
            Type: 'longblob',
            Null: 'YES',
          },
          longtext_field: {
            Field: 'longtext_field',
            Type: 'longtext',
            Null: 'YES',
          },
          mediumblob_field: {
            Field: 'mediumblob_field',
            Type: 'mediumblob',
            Null: 'YES',
          },
          mediumint_field: {
            Field: 'mediumint_field',
            Type: 'mediumint',
            Null: 'YES',
          },
          mediumint_unsigned_field: {
            Field: 'mediumint_unsigned_field',
            Type: 'mediumint unsigned',
            Null: 'YES',
          },
          mediumtext_field: {
            Field: 'mediumtext_field',
            Type: 'mediumtext',
            Null: 'YES',
          },
          numeric_field: {
            Field: 'numeric_field',
            Type: 'numeric(10,2)',
            Null: 'YES',
          },
          numeric_unsigned_field: {
            Field: 'numeric_unsigned_field',
            Type: 'numeric unsigned',
            Null: 'YES',
          },
          smallint_field: {
            Field: 'smallint_field',
            Type: 'smallint',
            Null: 'YES',
          },
          smallint_unsigned_field: {
            Field: 'smallint_unsigned_field',
            Type: 'smallint unsigned',
            Null: 'YES',
          },
          text_field: {
            Field: 'text_field',
            Type: 'text',
            Null: 'YES',
          },
          time_field: {
            Field: 'time_field',
            Type: 'time',
            Null: 'YES',
          },
          tinyblob_field: {
            Field: 'tinyblob_field',
            Type: 'tinyblob',
            Null: 'YES',
          },
          tinyint_field: {
            Field: 'tinyint_field',
            Type: 'tinyint',
            Null: 'YES',
          },
          tinyint_unsigned_field: {
            Field: 'tinyint_unsigned_field',
            Type: 'tinyint unsigned',
            Null: 'YES',
          },
          tinytext_field: {
            Field: 'tinytext_field',
            Type: 'tinytext',
            Null: 'YES',
          },
          varbinary_field: {
            Field: 'varbinary_field',
            Type: 'varbinary(255)',
            Null: 'YES',
          },
          year_field: {
            Field: 'year_field',
            Type: 'year',
            Null: 'YES',
          },
        }),
      });
      const createdSchema = await loadGraphQLSchemaFromMySQL(...loaderParamsDefaultMock);

      expect(createdSchema).toBeDefined();
      const schemaString = printSchemaWithDirectives(createdSchema);

      expect(schemaString).toContain('id: Int!');
      expect(schemaString).toContain('name: String!');
      expect(schemaString).toContain('email: String');
      expect(schemaString).toContain('age: UnsignedInt');
      expect(schemaString).toContain('balance: Float');
      expect(schemaString).toContain('data: JSON');
      expect(schemaString).toContain('created_at: DateTime!');
      expect(schemaString).toContain('updated_at: Timestamp');
      expect(schemaString).toContain('is_active: Boolean!');
      expect(schemaString).toContain('bigint_field: BigInt');
      expect(schemaString).toContain('bigint_unsigned_field: BigInt');
      expect(schemaString).toContain('binary_field: String');
      expect(schemaString).toContain('bit_field: Int');
      expect(schemaString).toContain('blob_field: String');
      expect(schemaString).toContain('bool_field: Boolean');
      expect(schemaString).toContain('char_field: String');
      expect(schemaString).toContain('date_field: Date');
      expect(schemaString).toContain('dec_field: Float');
      expect(schemaString).toContain('dec_unsigned_field: UnsignedFloat');
      expect(schemaString).toContain('decimal_unsigned_field: UnsignedFloat');
      expect(schemaString).toContain('double_field: Float');
      expect(schemaString).toContain('double_unsigned_field: UnsignedFloat');
      expect(schemaString).toContain('float_field: Float');
      expect(schemaString).toContain('float_unsigned_field: UnsignedFloat');
      expect(schemaString).toContain('int_unsigned_field: UnsignedInt');
      expect(schemaString).toContain('integer_field: Int');
      expect(schemaString).toContain('integer_unsigned_field: UnsignedInt');
      expect(schemaString).toContain('longblob_field: String');
      expect(schemaString).toContain('longtext_field: String');
      expect(schemaString).toContain('mediumblob_field: String');
      expect(schemaString).toContain('mediumint_field: Int');
      expect(schemaString).toContain('mediumint_unsigned_field: UnsignedInt');
      expect(schemaString).toContain('mediumtext_field: String');
      expect(schemaString).toContain('numeric_field: Float');
      expect(schemaString).toContain('numeric_unsigned_field: UnsignedFloat');
      expect(schemaString).toContain('smallint_field: Int');
      expect(schemaString).toContain('smallint_unsigned_field: UnsignedInt');
      expect(schemaString).toContain('text_field: String');
      expect(schemaString).toContain('time_field: Time');
      expect(schemaString).toContain('tinyblob_field: String');
      expect(schemaString).toContain('tinyint_field: Int');
      expect(schemaString).toContain('tinyint_unsigned_field: UnsignedInt');
      expect(schemaString).toContain('tinytext_field: String');
      expect(schemaString).toContain('varbinary_field: String');
      expect(schemaString).toContain('year_field: Int');
    });
  });
});
