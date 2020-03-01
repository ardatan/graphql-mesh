import { readFileSync } from 'fs';
import { resolve } from 'path';
import isUrl from 'is-url';
import * as yaml from 'js-yaml';
import request from 'request-promise-native';
import { createGraphQLSchema } from '@dotansimha/openapi-to-graphql';
import { Oas3 } from '@dotansimha/openapi-to-graphql/lib/types/oas3';
import { Options } from '@dotansimha/openapi-to-graphql/lib/types/options';
import { PreprocessingData } from '@dotansimha/openapi-to-graphql/lib/types/preprocessing_data';
import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { GraphQLObjectType } from 'graphql';
import Maybe from 'graphql/tsutils/Maybe';
import { pascalCase } from 'change-case';

const handler: MeshHandlerLibrary<
  Options,
  { oas: Oas3; preprocessingData: PreprocessingData }
> = {
  async tsSupport(options) {
    const sdkIdentifier = `${options.name}Sdk`;
    const contextIdentifier = `${options.name}Context`;
    const operations =
      options.getMeshSourcePayload.preprocessingData.operations;

    const sdk = {
      identifier: sdkIdentifier,
      codeAst: `export type ${sdkIdentifier} = {
${Object.keys(operations)
  .map(operationName => {
    const operation = operations[operationName];
    const operationGqlBaseType = operation.method === 'get' ? options.schema.getQueryType()?.name : options.schema.getMutationType()?.name;
    const argsName = `${operationGqlBaseType}${pascalCase(operation.operationId)}Args`;
    
    return `  ${operation.operationId}: (args: ${argsName}) => Promise<${pascalCase(operation.responseDefinition.graphQLTypeName)}>`;
  })
  .join(',\n')}
};`
    };

    const context = {
      identifier: contextIdentifier,
      codeAst: `export type ${contextIdentifier} = { ${options.name}: { config: Record<string, any>, api: ${sdkIdentifier} } };`
    };

    return {
      sdk,
      context
    };
  },
  async getMeshSource({ filePathOrUrl, name, config }) {
    let spec: Oas3;

    if (isUrl(filePathOrUrl)) {
      spec = await readUrl(filePathOrUrl);
    } else {
      const actualPath = filePathOrUrl.startsWith('/')
        ? filePathOrUrl
        : resolve(process.cwd(), filePathOrUrl);

      spec = readFile(actualPath);
    }

    const { schema, data } = await createGraphQLSchema(spec, {
      ...(config || {}),
      operationIdFieldNames: true,
      viewer: false // Viewer set to false in order to force users to specify auth via config file
    });

    return {
      source: {
        schema,
        name,
        source: filePathOrUrl
      },
      payload: {
        oas: spec,
        preprocessingData: data
      }
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

async function readUrl(path: string): Promise<Oas3> {
  if (/json$/.test(path)) {
    return JSON.parse(await request(path));
  } else if (/yaml$/.test(path) || /yml$/.test(path)) {
    return yaml.safeLoad(await request(path));
  } else {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure endpoint '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml).`
    );
  }
}

export default handler;
