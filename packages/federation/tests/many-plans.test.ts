import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { getStitchedSchemaFromSupergraphSdl } from '../src/index';
import { parse } from 'graphql';
import { schemas } from './fixtures/many-plans/subgraphs/schemas';

describe('many plans', () => {
  it('executes the query', async () => {
    const supergraphSdl = readFileSync(
      join(__dirname, 'fixtures/many-plans/supergraph.graphql'),
      'utf-8',
    );
    const stitchedSchema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onSubschemaConfig(subschemaConfig) {
        const subgraphIndex = parseInt(
          subschemaConfig.name?.toLowerCase().replace('sub', ''),
        );
        const schema = schemas[subgraphIndex];
        subschemaConfig.executor = createDefaultExecutor(schema!);
      },
      batch: true,
    });
    const query = readFileSync(
      join(__dirname, 'fixtures/many-plans/query.graphql'),
      'utf-8',
    );
    const expectedResult = JSON.parse(
      readFileSync(
        join(__dirname, 'fixtures/many-plans/expected.json'),
        'utf-8',
      ),
    );
    const result = await normalizedExecutor({
      schema: stitchedSchema,
      document: parse(query),
    });
    expect(result).toEqual(expectedResult);
  });
});
