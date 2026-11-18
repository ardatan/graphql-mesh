import {
  GraphQLID,
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

    const { registry, tableByType, relationNames, installedRelations } =
      buildPgRegistryFromSqlSchema(schema);

    expect(tableByType.get('Album')).toBe('albums');
    expect(tableByType.get('Artist')).toBe('artists');
    expect(registry.pgResources.albums).toBeDefined();
    expect(registry.pgResources.artists).toBeDefined();
    expect(relationNames.get('Album')?.get('artist')?.kind).toBe('ROW');
    expect(relationNames.get('Artist')?.get('albums')?.kind).toBe('ROWS');
    expect(installedRelations.get('Album')?.has('artist')).toBe(true);
    expect(installedRelations.get('Artist')?.has('albums')).toBe(true);
  });

  it('keeps id unique when @key selects slug, and rejects partial composite keys', () => {
    const Item = new GraphQLObjectType({
      name: 'Item',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        slug: { type: new GraphQLNonNull(GraphQLString) },
        tenantId: { type: GraphQLString },
      },
      extensions: {
        directives: {
          key: { fields: 'slug' },
          sql: {
            table: 'items',
            selection: ['id: id', 'slug: slug', 'tenantId: tenant_id'].join('\n'),
          },
        },
      },
    });
    const Partial = new GraphQLObjectType({
      name: 'PartialKey',
      fields: {
        tenantId: { type: new GraphQLNonNull(GraphQLString) },
        // Declared on the GraphQL type but omitted from SQL selection — isolates
        // the missing mapping the unique-key builder must reject.
        externalId: { type: new GraphQLNonNull(GraphQLString) },
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      extensions: {
        directives: {
          // externalId missing from selection — must not register tenantId alone as unique.
          key: { fields: 'tenantId externalId' },
          sql: {
            table: 'partials',
            selection: ['tenantId: tenant_id', 'id: id'].join('\n'),
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          item: {
            type: Item,
            extensions: {
              directives: {
                sql: {
                  table: 'items',
                  kind: 'ROW',
                  where: 'id: $args.id',
                  selection: ['id: id', 'slug: slug', 'tenantId: tenant_id'].join('\n'),
                },
              },
            },
          },
          partial: {
            type: Partial,
            extensions: {
              directives: {
                sql: {
                  table: 'partials',
                  kind: 'ROW',
                  where: 'id: $args.id',
                  selection: ['tenantId: tenant_id', 'id: id'].join('\n'),
                },
              },
            },
          },
        },
      }),
      types: [Item, Partial],
    });

    const { registry } = buildPgRegistryFromSqlSchema(schema);
    const itemUniques = (registry.pgResources.items as any).uniques as Array<{
      attributes: string[];
      isPrimary?: boolean;
    }>;
    const partialUniques = (registry.pgResources.partials as any).uniques as Array<{
      attributes: string[];
    }>;

    expect(itemUniques.map(u => u.attributes)).toEqual(expect.arrayContaining([['slug'], ['id']]));
    expect(partialUniques.map(u => u.attributes)).toEqual([['id']]);
    expect(partialUniques.some(u => u.attributes.includes('tenantId'))).toBe(false);
  });
});
