import type { AddCommand } from '../cli.js';
import { addCommand as addHiveCommand } from './hive.js';
import { addCommand as addLocalCommand } from './local.js';
import { addCommand as addProxyCommand } from './proxy.js';
import { addCommand as addStartCommand } from './start.js';

export const addCommands: AddCommand = (ctx, cli) => {
  addStartCommand(ctx, cli);
  addLocalCommand(ctx, cli);
  addHiveCommand(ctx, cli);
  addProxyCommand(ctx, cli);
};
