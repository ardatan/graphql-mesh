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
): GraphQLFieldConfig<any, any> {
  return {
    type: GraphQLString as any,
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
          artists: fieldSql({
            table: 'artists',
            kind: 'ROWS',
            selection: artistSelection,
          }),
        },
      }),
      types: [Album, Artist],
    });

    const { registry, tableByType, relationNames } = buildPgRegistryFromSqlSchema(schema);
    const wired = wirePostgresSqlPlans(schema, registry, { relationNames, tableByType });
    const artistFields = (wired.getType('Artist') as GraphQLObjectType).getFields();

    expect(artistFields.album.resolve).toBeUndefined();
    expect(typeof (artistFields.album.extensions as any)?.grafast?.plan).toBe('function');

    expect(typeof artistFields.albumForTenant.resolve).toBe('function');
    expect((artistFields.albumForTenant.extensions as any)?.grafast?.plan).toBeUndefined();

    expect(typeof artistFields.activeAlbums.resolve).toBe('function');
    expect((artistFields.activeAlbums.extensions as any)?.grafast?.plan).toBeUndefined();
  });
});
