/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-nodejs-modules */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
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
      it('fusiongraph', async () => {
        expect(printSchemaWithDirectives(fusiongraph)).toMatchSnapshot('fusiongraph');
      });
      const { fusiongraphExecutor } = getExecutorForFusiongraph({
        fusiongraph,
        transports() {
          return {
            async getSubgraphExecutor({ subgraphName }) {
              const serviceServers = await import(
                join(__dirname, 'fixtures', 'supergraphs', supergraph, 'services')
              );
              const serviceServer = serviceServers[subgraphName];
              return buildHTTPExecutor({
                fetch: serviceServer,
              });
            },
          };
        },
      });
      it('example query', async () => {
        const exampleQuery = readFileSync(
          join(__dirname, 'fixtures', 'supergraphs', supergraph, 'example-query.graphql'),
          'utf-8',
        );
        const result = await fusiongraphExecutor({
          document: parse(exampleQuery),
        });
        expect(result).toMatchSnapshot('example-query-result');
      });
    });
  });
});
