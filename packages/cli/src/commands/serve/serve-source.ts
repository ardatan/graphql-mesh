import { ProcessedConfig } from '@graphql-mesh/config';
import { wrapSchema } from '@graphql-tools/wrap';
import { createServer } from 'graphql-yoga';

export async function serveSource(meshConfig: ProcessedConfig, sourceName: string) {
  const sourceIndex = meshConfig.sources.findIndex(rawSource => rawSource.name === sourceName);
  const source = meshConfig.sources[sourceIndex];
  if (!source) {
    throw new Error(`Source ${sourceName} not found`);
  }
  const handlerResult = await source.handler.getMeshSource();
  const wrappedSchema = wrapSchema({
    ...handlerResult,
    transforms: source.transforms,
    merge: source.merge,
  } as any);
  const graphqlServer = createServer({
    schema: wrappedSchema,
    port: 4000 + sourceIndex + 1,
    enableLogging: true,
  });
  await graphqlServer.start();
}
