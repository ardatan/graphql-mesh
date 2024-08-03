import { Option } from '@commander-js/extra-typings';
import type { AddCommand } from '../cli.js';

export const addCommand: AddCommand = (_ctx, cli) =>
  cli
    .command('hive')
    .description(
      "serve a remote supergraph from Hive's High-Availablity CDN and report usage data to Hive's registry",
    )
    .addOption(
      new Option('--endpoint <endpoint>', 'Hive CDN endpoint for fetching the supergraph')
        .env('HIVE_CDN_ENDPOINT')
        .makeOptionMandatory(),
    )
    .addOption(
      new Option('--key <key>', 'Hive CDN API key for fetching the supergraph')
        .env('HIVE_CDN_KEY')
        .makeOptionMandatory(),
    );
