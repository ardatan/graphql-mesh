import { GraphQLSchema } from 'graphql';
import { extname, resolve } from 'path';
import { createGraphQlSchema } from 'openapi-to-graphql';
import isUrl from 'is-url';
import request from 'request-promise-native';

export default async function(filePathOrUrl: string): Promise<GraphQLSchema> {
  let spec = null;

  if (isUrl(filePathOrUrl)) {
    spec = JSON.parse(await request(filePathOrUrl));
  } else {
    const actualPath = filePathOrUrl.startsWith('/')
      ? filePathOrUrl
      : resolve(process.cwd(), filePathOrUrl);
    const fileExt = extname(actualPath).toLowerCase();

    if (fileExt === '.json') {
      spec = require(actualPath);
    }
  }

  const { schema } = await createGraphQlSchema(spec);

  return schema;
}
