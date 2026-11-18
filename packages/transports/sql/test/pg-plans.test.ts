import {
  GraphQLID,
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
    expect(setFirst).toHaveBeenCalledWith(1);
  });

  it('keeps generic resolve for multi-segment $this paths', () => {
    const Profile: GraphQLObjectType = new GraphQLObjectType({
      name: 'Profile',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'profiles',
            selection: 'id: id',
          },
        },
      },
    });
    const User: GraphQLObjectType = new GraphQLObjectType({
      name: 'User',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        metadata: { type: GraphQLString },
        profile: {
          type: Profile,
          resolve: () => null,
          extensions: {
            directives: {
              sql: {
                table: 'profiles',
                kind: 'ROW',
                where: 'profile_id: $this.metadata.profileId',
                selection: 'id: id',
              },
            },
          },
        },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'users',
            selection: 'id: id\nmetadata: metadata',
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
            selection: 'id: id\nmetadata: metadata',
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

  it('keeps nested ROWS relation generic resolve when a root bails (e.g. orderBy)', () => {
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

  it('plans ROW belongs-to even when a sibling list root bails to generic', () => {
    const citySelection = ['id: id', 'name: name'].join('\n');
    const countrySelection = ['id: code', 'name: name', 'capital: capital'].join('\n');
    const City: GraphQLObjectType = new GraphQLObjectType({
      name: 'City',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
      }),
      extensions: {
        directives: {
          sql: { table: 'city', kind: 'ROW', where: 'id: $this.id', selection: citySelection },
        },
      },
    });
    const Country: GraphQLObjectType = new GraphQLObjectType({
      name: 'Country',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        capital: { type: GraphQLInt },
        city: {
          type: City,
          resolve: () => null,
          extensions: {
            directives: {
              sql: {
                table: 'city',
                kind: 'ROW',
                where: 'id: $this.capital',
                selection: citySelection,
              },
            },
          },
        },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'country',
            kind: 'ROW',
            where: 'code: $this.id',
            selection: countrySelection,
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          country: {
            type: Country,
            args: { id: { type: new GraphQLNonNull(GraphQLID) } },
            extensions: {
              directives: {
                sql: {
                  table: 'country',
                  kind: 'ROW',
                  where: 'code: $args.id',
                  selection: countrySelection,
                },
              },
            },
          },
          // Bails → Country may also be a plain-object parent; ROW city must still plan.
          countries: {
            type: new GraphQLList(Country),
            resolve: () => [],
            extensions: {
              directives: {
                sql: {
                  table: 'country',
                  kind: 'ROWS',
                  where: '$args.where',
                  selection: countrySelection,
                },
              },
            },
          },
        },
      }),
      types: [Country, City],
    });

    const { registry, tableByType, relationNames, installedRelations, sqlToAttrByTable } =
      buildPgRegistryFromSqlSchema(schema);
    expect(installedRelations.get('Country')?.has('city')).toBe(true);
    const wired = wirePostgresSqlPlans(schema, registry, {
      relationNames,
      tableByType,
      installedRelations,
      sqlToAttrByTable,
    });
    const countryFields = (wired.getType('Country') as GraphQLObjectType).getFields();
    expect(typeof countryFields.city.resolve).toBe('undefined');
    expect(typeof (countryFields.city.extensions as any)?.grafast?.plan).toBe('function');
  });

  it('attribute plan dual-paths Pg .get and entity hydrator for plain stubs', async () => {
    const { execute } = await import('grafast');
    const { parse } = await import('graphql');
    const { MESH_ENTITY_HYDRATOR } = await import('../src/entity.js');
    let hydrateParent: any;
    let hydrateInfo: any;
    const hydrator = (parent: any, _args: any, _ctx: any, info: any) => {
      hydrateParent = parent;
      hydrateInfo = info;
      if (parent != null && Object.prototype.hasOwnProperty.call(parent, 'name')) {
        return parent.name;
      }
      return Promise.resolve('from-hydrator').then(name => {
        if (parent && typeof parent === 'object') {
          Object.assign(parent, { name });
        }
        return name;
      });
    };
    (hydrator as any)[MESH_ENTITY_HYDRATOR] = true;

    const Artist = new GraphQLObjectType({
      name: 'Artist',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        name: {
          type: GraphQLString,
          resolve: hydrator,
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
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          artist: fieldSql(
            {
              table: 'artists',
              kind: 'ROW',
              where: 'ArtistId: $args.id',
              selection: artistSelection,
            },
            undefined,
            Artist,
          ),
          // Plain-object stub parent (missing `name`) — exercises hydrator plan path.
          artistStub: {
            type: Artist,
            resolve: () => ({ id: 7 }),
          },
        },
      }),
      types: [Artist],
    });
    const { registry, tableByType, relationNames, installedRelations, sqlToAttrByTable } =
      buildPgRegistryFromSqlSchema(schema);
    const wired = wirePostgresSqlPlans(schema, registry, {
      relationNames,
      tableByType,
      installedRelations,
      sqlToAttrByTable,
    });
    const nameField = (wired.getType('Artist') as GraphQLObjectType).getFields().name;
    // Hydrator resolve is replaced by a dual-path plan (Pg .get + lambda hydrator).
    expect(nameField.resolve).toBeUndefined();
    const plan = (nameField.extensions as any)?.grafast?.plan as (row: any) => any;
    expect(typeof plan).toBe('function');
    // Plan source must keep the hydrator closed over for plain-object stubs.
    expect(Function.prototype.toString.call(plan)).toMatch(/hydratorResolve|lambda/);

    // Pg-shaped parent: use .get (hydrator not involved; safe outside grafast lifecycle).
    expect(plan({ get: (k: string) => `pg:${k}` })).toBe('pg:name');
    expect(hydrateParent).toBeUndefined();

    // Execution-level: plain stub missing `name` runs hydrator with real field info.
    const result = await execute({
      schema: wired,
      document: parse(`{ artistStub { id name } }`),
      contextValue: {},
    } as any);
    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ artistStub: { id: 7, name: 'from-hydrator' } });
    expect(hydrateParent).toEqual({ id: 7, name: 'from-hydrator' });
    expect(hydrateInfo?.fieldName).toBe('name');
    expect(hydrateInfo?.parentType?.name).toBe('Artist');
  });
});
