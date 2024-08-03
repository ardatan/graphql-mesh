import type { AddCommand } from '../cli.js';
import { addCommand as addHiveCommand } from './hive.js';
import { addCommand as addLocalCommand } from './local.js';
import { addCommand as addProxyCommand } from './proxy.js';

export const addCommands: AddCommand = (ctx, cli) => {
  addLocalCommand(ctx, cli);
  addHiveCommand(ctx, cli);
  addProxyCommand(ctx, cli);
};
