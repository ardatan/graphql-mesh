import { join } from 'node:path';
import { parse } from 'graphql';
import { loadGraphQLSchemaFromSql } from '@omnigraph/sql';
import { getSqlExecutor } from '../src/execution.js';

const dbPath = join(__dirname, '../../../../e2e/sql-sqlite-chinook/chinook.db');

describe('getSqlExecutor sqlite', () => {
  it('resolves albums with artist relation', async () => {
    const schema = await loadGraphQLSchemaFromSql('chinook', {
      type: 'sqlite',
      db: dbPath,
      includeTables: ['albums', 'artists'],
    });
    const executor = getSqlExecutor({ subgraph: schema });
    try {
      const result = await executor({
        document: parse(/* GraphQL */ `
          query {
            albums(limit: 2) {
              id
              title
              artist {
                name
              }
            }
          }
        `),
      });
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        albums: [
          {
            id: '1',
            title: 'For Those About To Rock We Salute You',
            artist: { name: 'AC/DC' },
          },
          {
            id: '2',
            title: 'Balls to the Wall',
            artist: { name: 'Accept' },
          },
        ],
      });
    } finally {
      await (executor as any)[Symbol.asyncDispose]?.();
    }
  });
});
