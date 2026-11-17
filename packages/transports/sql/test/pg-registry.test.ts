import {
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { buildPgRegistryFromSqlSchema } from '../src/pg-registry.js';

const albumSelection = ['id: AlbumId', 'title: Title', 'artistId: ArtistId'].join('\n');
const artistSelection = ['id: ArtistId', 'name: Name'].join('\n');

describe('buildPgRegistryFromSqlSchema', () => {
  it('builds codecs/resources/relations from @sql directives', () => {
    const Artist: GraphQLObjectType = new GraphQLObjectType({
      name: 'Artist',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        name: { type: GraphQLString },
        albums: {
          type: new GraphQLList(Album),
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
        artist: {
          type: Artist,
          extensions: {
            directives: {
              sql: {
                table: 'artists',
                kind: 'ROW',
                where: 'ArtistId: $this.artistId',
                selection: artistSelection,
              },
            },
          },
        },
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
          albums: {
            type: new GraphQLList(Album),
            extensions: {
              directives: {
                sql: {
                  table: 'albums',
                  kind: 'ROWS',
                  selection: albumSelection,
                },
              },
            },
          },
        },
      }),
      types: [Album, Artist],
    });

    const { registry, tableByType, relationNames } = buildPgRegistryFromSqlSchema(schema);

    expect(tableByType.get('Album')).toBe('albums');
    expect(tableByType.get('Artist')).toBe('artists');
    expect(registry.pgResources.albums).toBeDefined();
    expect(registry.pgResources.artists).toBeDefined();
    expect(relationNames.get('Album')?.get('artist')?.kind).toBe('ROW');
    expect(relationNames.get('Artist')?.get('albums')?.kind).toBe('ROWS');
  });
});
