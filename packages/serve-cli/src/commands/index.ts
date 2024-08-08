import type { AddCommand } from '../cli.js';
import { addCommand as addProxyCommand } from './proxy.js';
import { addCommand as addStartCommand } from './start.js';
import { addCommand as addSubgraphCommand } from './subgraph.js';
import { addCommand as addSupergraphCommand } from './supergraph.js';

export const addCommands: AddCommand = (ctx, cli) => {
  addStartCommand(ctx, cli);
  addSupergraphCommand(ctx, cli);
  addSubgraphCommand(ctx, cli);
  addProxyCommand(ctx, cli);
};
