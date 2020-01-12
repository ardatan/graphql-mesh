import { GraphQLSchema } from 'graphql';
import { extname, resolve } from 'path';
import { createGraphQlSchema } from 'openapi-to-graphql';

export default async function(filePath: string): Promise<GraphQLSchema> {
  const actualPath = filePath.startsWith('/')
    ? filePath
    : resolve(process.cwd(), filePath);
  const fileExt = extname(actualPath).toLowerCase();
  let spec = null;

  if (fileExt === '.json') {
    spec = require(actualPath);
  }

  const { schema } = await createGraphQlSchema(spec);

  return schema;
}
