import 'json-bigint-patch';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh } from '@graphql-mesh/runtime';
import { join } from 'path';

import { printSchema, lexicographicSortSchema } from 'graphql';
import { readFile } from 'fs-extra';

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
import startGrpcServer from '../start-server.js';
const grpc$ = startGrpcServer(300);
jest.setTimeout(15000);

describe('gRPC Example', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(printSchema(lexicographicSortSchema(schema))).toMatchSnapshot('grpc-schema');
  });
  it('should get greeting correctly', async () => {
    const GreetingQuery = await readFile(
      join(__dirname, '../example-queries/GetGreeting.query.graphql'),
      'utf8',
    );
    const { execute } = await mesh$;
    await grpc$;
    const result = await execute(GreetingQuery, undefined);
    expect(result).toMatchSnapshot('greeting-result');
  });
  afterAll(() => {
    mesh$.then(mesh => mesh.destroy());
    grpc$.then(grpc => grpc.forceShutdown());
  });
});
