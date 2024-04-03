/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-nodejs-modules */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { getExecutorForFusiongraph } from '@graphql-mesh/fusion-runtime';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { convertSupergraphToFusiongraph } from '../src/index';

describe('Supergraphs', () => {
  readdirSync(join(__dirname, 'fixtures', 'supergraphs')).forEach(supergraph => {
    const supergraphSdl = readFileSync(
      join(__dirname, 'fixtures', 'supergraphs', supergraph, 'supergraph.graphql'),
      'utf-8',
    );
    const fusiongraph = convertSupergraphToFusiongraph(supergraphSdl);
    describe(supergraph, () => {
      it('Fusiongraph', async () => {
        expect(printSchemaWithDirectives(fusiongraph)).toMatchSnapshot('fusiongraph');
      });
      const serviceServers = {};
      const fixturePath = join(__dirname, 'fixtures', 'supergraphs', supergraph, 'services')
      readdirSync(fixturePath).forEach(
        serviceName => {
          const serviceDir = join(fixturePath, serviceName);
          serviceServers[serviceName] = createYoga({
            schema: buildSubgraphSchema({
              typeDefs: parse(require(join(serviceDir, 'typeDefs')).typeDefs),
              resolvers: require(join(serviceDir, 'resolvers')).resolvers,
            }),
          });
        },
      );
      const { fusiongraphExecutor } = getExecutorForFusiongraph({
        fusiongraph,
        transports() {
          return {
            getSubgraphExecutor({ subgraphName }) {
              const serviceServer = serviceServers[subgraphName];
              return buildHTTPExecutor({
                fetch: serviceServer,
              });
            },
          };
        },
      });
      const { exampleQueries } = require(
        join(__dirname, 'fixtures', 'supergraphs', supergraph, 'example-queries'),
      ) as {
        exampleQueries: Record<string, string>;
      };
      Object.entries(exampleQueries).forEach(([name, query]) => {
        it(`Example Query: ${name}`, async () => {
          const result = await fusiongraphExecutor({
            document: parse(query),
          });
          expect(result).toMatchSnapshot(`${supergraph}-${name}-result`);
        });
      });
    });
  });
});
