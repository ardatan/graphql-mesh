import {
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  type GraphQLFieldConfig,
} from 'graphql';
import { wirePostgresSqlPlans } from '../src/pg-plans.js';
import { buildPgRegistryFromSqlSchema } from '../src/pg-registry.js';

const albumSelection = ['id: AlbumId', 'title: Title', 'artistId: ArtistId'].join('\n');
const artistSelection = ['id: ArtistId', 'name: Name'].join('\n');

function fieldSql(
  args: Record<string, unknown>,
  resolve: GraphQLFieldConfig<any, any>['resolve'] = () => null,
  type: GraphQLFieldConfig<any, any>['type'] = GraphQLString as any,
): GraphQLFieldConfig<any, any> {
  return {
    type,
    resolve,
    extensions: {
      directives: {
        sql: args,
      },
    },
  };
}

describe('wirePostgresSqlPlans relation bailouts', () => {
  it('keeps generic resolve for ROW/ROWS predicates plans cannot apply', () => {
    const Artist: GraphQLObjectType = new GraphQLObjectType({
      name: 'Artist',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        name: { type: GraphQLString },
        // Pure $this join — plan OK.
        album: {
          type: Album,
          resolve: () => ({ id: 1 }),
          extensions: {
            directives: {
              sql: {
                table: 'albums',
                kind: 'ROW',
                where: 'ArtistId: $this.id',
                selection: albumSelection,
              },
            },
          },
        },
        // Extra $args predicate — must keep generic resolve.
        albumForTenant: {
          type: Album,
          resolve: () => ({ id: 1 }),
          extensions: {
            directives: {
              sql: {
                table: 'albums',
                kind: 'ROW',
                where: 'ArtistId: $this.id\ntenant_id: $args.tenantId',
                selection: albumSelection,
              },
            },
          },
        },
        // Fixed literal + legacy filter binder on ROWS — keep generic resolve.
        activeAlbums: {
          type: new GraphQLList(Album),
          resolve: () => [],
          extensions: {
            directives: {
              sql: {
                table: 'albums',
                kind: 'ROWS',
                where: 'ArtistId: $this.id\nactive: true',
                filter: '$args.filter',
                selection: albumSelection,
              },
            },
          },
        },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'artists',
            selection: artistSelection,
          },
        },
      },
    });
    const Album: GraphQLObjectType = new GraphQLObjectType({
      name: 'Album',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        title: { type: GraphQLString },
        artistId: { type: GraphQLInt },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'albums',
            selection: albumSelection,
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          artists: fieldSql(
            {
              table: 'artists',
              kind: 'ROWS',
              selection: artistSelection,
            },
            () => null,
            new GraphQLList(Artist),
          ),
        },
      }),
      types: [Album, Artist],
    });

    const { registry, tableByType, relationNames, installedRelations, sqlToAttrByTable } =
      buildPgRegistryFromSqlSchema(schema);
    const wired = wirePostgresSqlPlans(schema, registry, {
      relationNames,
      tableByType,
      installedRelations,
      sqlToAttrByTable,
    });
    const artistFields = (wired.getType('Artist') as GraphQLObjectType).getFields();

    expect(artistFields.album.resolve).toBeUndefined();
    expect(typeof (artistFields.album.extensions as any)?.grafast?.plan).toBe('function');

    expect(typeof artistFields.albumForTenant.resolve).toBe('function');
    expect((artistFields.albumForTenant.extensions as any)?.grafast?.plan).toBeUndefined();

    expect(typeof artistFields.activeAlbums.resolve).toBe('function');
    expect((artistFields.activeAlbums.extensions as any)?.grafast?.plan).toBeUndefined();
  });

  it('plans $args.take pagination and keeps nested relations on planned roots', () => {
    const Artist: GraphQLObjectType = new GraphQLObjectType({
      name: 'Artist',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        name: { type: GraphQLString },
        albums: {
          type: new GraphQLList(Album),
          resolve: () => [],
          extensions: {
            directives: {
              sql: {
                table: 'albums',
                kind: 'ROWS',
                where: 'ArtistId: $this.id',
                selection: albumSelection,
              },
            },
          },
        },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'artists',
            selection: artistSelection,
          },
        },
      },
    });
    const Album: GraphQLObjectType = new GraphQLObjectType({
      name: 'Album',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        title: { type: GraphQLString },
        artistId: { type: GraphQLInt },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'albums',
            selection: albumSelection,
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          artists: {
            type: new GraphQLList(Artist),
            args: { take: { type: GraphQLInt } },
            resolve: () => [],
            extensions: {
              directives: {
                sql: {
                  table: 'artists',
                  kind: 'ROWS',
                  limit: '$args.take',
                  selection: artistSelection,
                },
              },
            },
          },
        },
      }),
      types: [Album, Artist],
    });

    const { registry, tableByType, relationNames, installedRelations, sqlToAttrByTable } =
      buildPgRegistryFromSqlSchema(schema);
    const wired = wirePostgresSqlPlans(schema, registry, {
      relationNames,
      tableByType,
      installedRelations,
      sqlToAttrByTable,
    });
    const queryFields = (wired.getType('Query') as GraphQLObjectType).getFields();
    const artistFields = (wired.getType('Artist') as GraphQLObjectType).getFields();

    expect(queryFields.artists.resolve).toBeUndefined();
    expect(typeof (queryFields.artists.extensions as any)?.grafast?.plan).toBe('function');
    expect(artistFields.albums.resolve).toBeUndefined();
    expect(typeof (artistFields.albums.extensions as any)?.grafast?.plan).toBe('function');

    // Assert `limit: $args.take` reaches setFirst via the `take` arg (not a hard-coded `limit`).
    const setFirst = jest.fn();
    jest.spyOn(registry.pgResources.artists as any, 'find').mockReturnValue({
      setFirst,
      setOffset: jest.fn(),
    });
    const getRaw = jest.fn((name: string) => (name === 'take' ? 1 : undefined));
    (queryFields.artists.extensions as any).grafast.plan(null, { getRaw });
    expect(getRaw).toHaveBeenCalledWith('take');
    expect(setFirst).toHaveBeenCalled();
  });

  it('keeps generic resolve for relations with multiple $this predicates', () => {
    const Profile: GraphQLObjectType = new GraphQLObjectType({
      name: 'Profile',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        tenantId: { type: GraphQLInt },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'profiles',
            selection: ['id: id', 'tenantId: tenant_id'].join('\n'),
          },
        },
      },
    });
    const User: GraphQLObjectType = new GraphQLObjectType({
      name: 'User',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        tenantId: { type: GraphQLInt },
        profileId: { type: GraphQLInt },
        profile: {
          type: Profile,
          resolve: () => null,
          extensions: {
            directives: {
              sql: {
                table: 'profiles',
                kind: 'ROW',
                where: 'tenant_id: $this.tenantId\nid: $this.profileId',
                selection: ['id: id', 'tenantId: tenant_id'].join('\n'),
              },
            },
          },
        },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'users',
            selection: ['id: id', 'tenantId: tenant_id', 'profileId: profile_id'].join('\n'),
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          users: fieldSql({
            table: 'users',
            kind: 'ROWS',
            selection: ['id: id', 'tenantId: tenant_id', 'profileId: profile_id'].join('\n'),
          }),
        },
      }),
      types: [User, Profile],
    });
    const { registry, tableByType, relationNames, installedRelations, sqlToAttrByTable } =
      buildPgRegistryFromSqlSchema(schema);
    const wired = wirePostgresSqlPlans(schema, registry, {
      relationNames,
      tableByType,
      installedRelations,
      sqlToAttrByTable,
    });
    const userFields = (wired.getType('User') as GraphQLObjectType).getFields();
    expect(typeof userFields.profile.resolve).toBe('function');
    expect((userFields.profile.extensions as any)?.grafast?.plan).toBeUndefined();
  });

  it('keeps nested relation generic resolve when a root bails (e.g. orderBy)', () => {
    const Artist: GraphQLObjectType = new GraphQLObjectType({
      name: 'Artist',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        name: { type: GraphQLString },
        albums: {
          type: new GraphQLList(Album),
          resolve: () => [],
          extensions: {
            directives: {
              sql: {
                table: 'albums',
                kind: 'ROWS',
                where: 'ArtistId: $this.id',
                selection: albumSelection,
              },
            },
          },
        },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'artists',
            selection: artistSelection,
          },
        },
      },
    });
    const Album: GraphQLObjectType = new GraphQLObjectType({
      name: 'Album',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        title: { type: GraphQLString },
        artistId: { type: GraphQLInt },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'albums',
            selection: albumSelection,
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          artists: {
            type: new GraphQLList(Artist),
            resolve: () => [],
            extensions: {
              directives: {
                sql: {
                  table: 'artists',
                  kind: 'ROWS',
                  orderBy: '$args.orderBy',
                  selection: artistSelection,
                },
              },
            },
          },
        },
      }),
      types: [Album, Artist],
    });

    const { registry, tableByType, relationNames, installedRelations, sqlToAttrByTable } =
      buildPgRegistryFromSqlSchema(schema);
    const wired = wirePostgresSqlPlans(schema, registry, {
      relationNames,
      tableByType,
      installedRelations,
      sqlToAttrByTable,
    });
    const queryFields = (wired.getType('Query') as GraphQLObjectType).getFields();
    const artistFields = (wired.getType('Artist') as GraphQLObjectType).getFields();

    expect(typeof queryFields.artists.resolve).toBe('function');
    expect(typeof artistFields.albums.resolve).toBe('function');
    expect((artistFields.albums.extensions as any)?.grafast?.plan).toBeUndefined();
  });
});
