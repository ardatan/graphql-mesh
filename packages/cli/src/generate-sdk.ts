import { Logger } from 'winston';
import { MeshConfig } from './config';
import { codegen } from '@graphql-codegen/core';

export interface GenerateSdkOptions {
  config: MeshConfig;
  logger: Logger;
}

export async function generateSdk({
  config,
  logger,
}: GenerateSdkOptions): Promise<void> {
  // const output = await codegen({
  //   filename: outputPath,
  //   pluginMap: {},
  //   documents: [],
  //   plugins: [],
  //   config: {
  //   }
  // });

  // writeFileSync(outputPath, output);
}
