import {
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { collectRelationFilters } from '../src/relation-filters.js';

describe('collectRelationFilters', () => {
  it('preserves all $this join predicates on a ROW relation', () => {
    const userSelection = ['id: id', 'tenantId: tenant_id', 'name: name'].join('\n');
    const accountSelection = [
      'id: id',
      'tenantId: tenant_id',
      'userId: user_id',
      'label: label',
    ].join('\n');
    const User: GraphQLObjectType = new GraphQLObjectType({
      name: 'User',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLID) },
        tenantId: { type: GraphQLInt },
        name: { type: GraphQLString },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'users',
            kind: 'ROW',
            where: 'id: $this.id',
            selection: userSelection,
          },
        },
      },
    });
    const Account: GraphQLObjectType = new GraphQLObjectType({
      name: 'Account',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLID) },
        tenantId: { type: GraphQLInt },
        userId: { type: GraphQLInt },
        label: { type: GraphQLString },
        user: {
          type: User,
          extensions: {
            directives: {
              sql: {
                table: 'users',
                kind: 'ROW',
                where: 'tenant_id: $this.tenantId\nid: $this.userId',
                selection: userSelection,
              },
            },
          },
        },
      }),
      extensions: {
        directives: {
          sql: {
            table: 'accounts',
            kind: 'ROW',
            where: 'id: $this.id',
            selection: accountSelection,
          },
        },
      },
    });
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          accounts: {
            type: new GraphQLList(Account),
            extensions: {
              directives: {
                sql: {
                  table: 'accounts',
                  kind: 'ROWS',
                  selection: accountSelection,
                },
              },
            },
          },
        },
      }),
      types: [Account, User],
    });

    const filters = collectRelationFilters(schema, 'Account');
    const user = filters.find(f => f.field === 'user');
    expect(user).toBeDefined();
    expect(user!.joinPredicates).toEqual([
      { localColumn: 'tenant_id', refColumn: 'tenant_id' },
      { localColumn: 'user_id', refColumn: 'id' },
    ]);
  });

  it('uses Query return selection for parent columns, not outgoing relations', () => {
    const albumSelection = ['id: AlbumId', 'title: Title', 'artistId: ArtistId'].join('\n');
    const artistSelection = ['id: ArtistId', 'name: Name'].join('\n');
    const Artist: GraphQLObjectType = new GraphQLObjectType({
      name: 'Artist',
      fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLInt) },
        name: { type: GraphQLString },
      }),
    });
    // Hand-written Album: no type-level @sql — parent map must come from Query.albums.
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

    const filters = collectRelationFilters(schema, 'Album');
    const artist = filters.find(f => f.field === 'artist');
    expect(artist).toBeDefined();
    expect(artist!.localColumn).toBe('ArtistId');
    expect(artist!.refColumn).toBe('ArtistId');
  });
});
