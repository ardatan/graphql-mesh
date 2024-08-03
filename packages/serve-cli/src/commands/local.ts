import type { AddCommand } from '../cli.js';

export const addCommand: AddCommand = (_ctx, cli) =>
  cli
    .command('local')
    .description(
      'serve a local Federation supergraph provided by a compliant composition tool such as Mesh Compose or Apollo Rover',
    )
    .argument('[supergraph]', 'path to the composed supergraph schema file', 'supergraph.graphql');
