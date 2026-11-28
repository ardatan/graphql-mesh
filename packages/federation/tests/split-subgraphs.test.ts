import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getStitchedSchemaFromSupergraphSdl } from '../src/index';
import { DocumentNode, print } from 'graphql';

it('split subgraphs correctly', () => {
  const supergraphSdl = readFileSync(
    join(__dirname, 'fixtures/connectors/supergraph.graphql'),
    'utf-8',
  );
  const subgraphAstMap: Record<string, DocumentNode> = {};
  getStitchedSchemaFromSupergraphSdl({
    supergraphSdl,
    onSubgraphAST(name, subgraphAST) {
      subgraphAstMap[name] = subgraphAST;
      return subgraphAST;
    },
  });
  for (const subgraphName of Object.keys(subgraphAstMap).sort()) {
    const subgraphAst = subgraphAstMap[subgraphName]!;
    expect(print(subgraphAst)).toMatchSnapshot(subgraphName);
  }
});
