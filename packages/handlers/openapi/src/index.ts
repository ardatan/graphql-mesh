import { readFileSync } from 'fs';
import { resolve } from 'path';
import isUrl from 'is-url';
import * as yaml from 'js-yaml';
import request from 'request-promise-native';
import { createGraphQLSchema } from 'openapi-to-graphql';
import { Oas3 } from 'openapi-to-graphql/lib/types/oas3';
import { Options } from 'openapi-to-graphql/lib/types/options';
import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { GraphQLObjectType } from 'graphql';
import Maybe from 'graphql/tsutils/Maybe';

const handler: MeshHandlerLibrary<Options, Oas3> = {
  async tsSupport(options) {
    console.log(options.getMeshSourcePayload);

    return {};
  },
  async getMeshSource({ filePathOrUrl, name, config }) {
    let spec = null;

    // Load from a url or from a local file. only json supported at the moment.
    // I think `getValidOAS3` should support loading YAML files easily
    if (isUrl(filePathOrUrl)) {
      spec = JSON.parse(await request(filePathOrUrl));
    } else {
      const actualPath = filePathOrUrl.startsWith('/')
        ? filePathOrUrl
        : resolve(process.cwd(), filePathOrUrl);

      spec = readFile(actualPath);
    }

    const { schema } = await createGraphQLSchema(spec, {
      ...(config || {}),
      viewer: false // Viewer set to false in order to force users to specify auth via config file
    });

    return {
      source: {
        schema,
        sdk: context => {
          // This is not so-nice way to expose SDK, but currenty `openapi-to-graphql` doesn't
          // export pure SDK functions.
          const queryType = schema.getQueryType();
          const mutationType = schema.getMutationType();

          return extractSdkFromResolvers(context, [queryType, mutationType]);
        },
        name,
        source: filePathOrUrl
      },
      payload: spec
    };
  }
};

function readFile(path: string): Oas3 {
  if (/json$/.test(path)) {
    return JSON.parse(readFileSync(path, 'utf8'));
  } else if (/yaml$/.test(path) || /yml$/.test(path)) {
    return yaml.safeLoad(readFileSync(path, 'utf8'));
  } else {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure file '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml).`
    );
  }
}

// Dotan: This is a workaround, because `openapi-to-graphql` doesn't export the resolvers implementation as-is, as
// pure JS functions, so we need to extract it from the schema types, and allow it to run as standalone SDK.
// This is needed in order to allow custom resolvers later to implement their own logic and links
// between types
function extractSdkFromResolvers(
  context: any,
  types: Maybe<GraphQLObjectType>[]
) {
  const sdk: Record<string, Function> = {};

  for (const type of types) {
    if (type) {
      const fields = type.getFields();

      Object.keys(fields).forEach(fieldName => {
        if (fields[fieldName]) {
          const resolveFn = fields[fieldName].resolve;

          if (resolveFn) {
            sdk[fieldName] = (args: any) =>
              resolveFn(null, args, context, { path: { prev: '' } } as any);
          }
        }
      });
    }
  }

  return sdk;
}

export default handler;
