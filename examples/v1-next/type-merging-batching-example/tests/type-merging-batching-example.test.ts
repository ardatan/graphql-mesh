import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { GraphQLSchema, parse } from 'graphql';
import { getComposedSchemaFromConfig } from '@graphql-mesh/compose-cli';
import {
  createExecutablePlanForOperation,
  serializeExecutableOperationPlan,
} from '@graphql-mesh/fusion-execution';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';
import * as HTTPTransport from '@graphql-mesh/transport-http';
import { Executor, printSchemaWithDirectives } from '@graphql-tools/utils';
import { Request } from '@whatwg-node/fetch';
import { composeConfig } from '../mesh.config.js';
import { authorsYoga } from '../services/authors/yoga.js';
import { booksYoga } from '../services/books/yoga.js';

describe('Type Merging with Batching Example', () => {
  let fusiongraph: GraphQLSchema;
  let executor: Executor;
  async function subgraphFetch(...args: Parameters<typeof fetch>) {
    const req = new Request(...args);
    if (req.url.startsWith('http://localhost:4001/graphql')) {
      return authorsYoga.fetch(req);
    }
    if (req.url.startsWith('http://localhost:4002/graphql')) {
      return booksYoga.fetch(req);
    }
    return new Response(null, {
      status: 404,
    });
  }
  beforeAll(async () => {
    fusiongraph = await getComposedSchemaFromConfig({
      ...composeConfig,
      fetch: subgraphFetch,
    });
    const { fusiongraphExecutor } = getExecutorForFusiongraph({
      fusiongraph,
      fetch: subgraphFetch,
      transports: { http: HTTPTransport },
    });
    executor = fusiongraphExecutor;
  });
  it('generates the schema correctly', () => {
    expect(printSchemaWithDirectives(fusiongraph)).toMatchSnapshot('schema');
  });
  const queryNames = readdirSync(join(__dirname, '../example-queries'));
  for (const queryName of queryNames) {
    const query = readFileSync(join(__dirname, '../example-queries', queryName), 'utf8');
    const document = parse(query, { noLocation: true });
    it(`executes ${queryName} query`, async () => {
      const result = await executor({
        document,
      });
      expect(result).toMatchSnapshot(`result-${queryName}`);
    });
    it(`plans ${queryName} correctly`, async () => {
      const plan = createExecutablePlanForOperation({
        fusiongraph,
        document,
      });
      const serializedPlan = serializeExecutableOperationPlan(plan);
      expect(serializedPlan).toMatchSnapshot(`plan-${queryName}`);
    });
  }
});
