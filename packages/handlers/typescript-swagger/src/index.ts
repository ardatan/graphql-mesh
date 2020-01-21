import { writeFileSync } from 'fs';
import { extname, resolve, join } from 'path';
import isUrl from 'is-url';
import request from 'request-promise-native';
import { spawnSync } from 'child_process';
import { createGraphQlSchema } from '@dotansimha/openapi-to-graphql';
import {
  Oas3,
  OperationObject
} from '@dotansimha/openapi-to-graphql/lib/types/oas3';
import { PreprocessingData } from '@dotansimha/openapi-to-graphql/lib/types/preprocessing_data';
import * as Oas3Tools from '@dotansimha/openapi-to-graphql/lib/oas_3_tools';
import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { isObjectType, isScalarType } from 'graphql';
import { camelCase, pascalCase, camelCaseTransformMerge } from 'change-case';

export type ApiServiceResult = {
  apiTypesPath: string;
};

export type BuildGraphQLSchemaPayload = {
  schemaPreprocessingData: PreprocessingData;
  oas3: Oas3;
};

const handler: MeshHandlerLibrary<
  BuildGraphQLSchemaPayload,
  ApiServiceResult
> = {
  async buildGraphQLSchema({ filePathOrUrl, outputPath }) {
    let spec = null;

    // Load from a url or from a local file. only json supported at the moment.
    // I think `getValidOAS3` should support loading YAML files easily
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

    // TODO: `spec` might be an array?
    const oass: Oas3 = await Oas3Tools.getValidOAS3(spec);
    // This will make sure to generate only a single SDK service called `DefaultApi` instead of
    // the default behaviour of `openapi-codegen` to create a SDK file per tag value.
    // We prefer to use a single API service because it's easier to manage and pull later from
    // the context on runtime
    removeApiTags(oass);
    // We are passing `viewer: false` because we don't need authentication wrapper, because we are not
    // using the runtime of `openapi-to-graphql`, just the schema definition.
    // `operationIdFieldNames` is set to `true` in order to make sure the names on the GraphQL schema
    // will match the API SDK method names.
    const transformOptions = { viewer: false, operationIdFieldNames: true };
    const { schema, data } = await createGraphQlSchema(spec, transformOptions);

    return {
      payload: {
        schemaPreprocessingData: data,
        oas3: oass
      },
      schema
    };
  },
  async generateApiServices({ payload: { oas3 }, outputPath }) {
    const oasFilePath = join(outputPath, './oas3-schema.json');
    const apiTypesPath = join(outputPath, './types');
    writeFileSync(oasFilePath, JSON.stringify(oas3, null, 2));
    generateOpenApiSdk(oasFilePath, apiTypesPath);

    return {
      payload: {
        apiTypesPath
      }
    };
  },
  async generateGqlWrapper({
    apiName,
    handlerConfig,
    schema,
    outputPath,
    buildSchemaPayload
  }) {
    const indexFilePath = join(outputPath, './index.ts');
    // Build `context.ts` content with type a type definition for the context
    const contextOutputFile = join(outputPath, './context.ts');
    const contextTypeName = `${apiName}Context`;
    const contextInstanceName = `${apiName}Api`;
    const contextContent = `export type ${contextTypeName} = {
  ${contextInstanceName}: DefaultApi,
}

export function createContext(config: Record<any, any> = ${JSON.stringify(
      handlerConfig,
      null,
      2
    )}): ${contextTypeName} {
  const api = new DefaultApi();
  
  if (config && config.apiKey) {
    api.setApiKey(0, config.apiKey);
  }

  return {
    ${contextInstanceName}: api,
  };
}
`;
    writeFileSync(
      contextOutputFile,
      buildFileContentWithImports(
        new Set<string>().add(`import { DefaultApi } from './types/api';`),
        contextContent
      )
    );

    // Build resolvers file
    const resolversFilePath = join(outputPath, './resolvers.ts');
    const types = schema.getTypeMap();
    const resolversFileImports = new Set<string>();
    resolversFileImports.add(`import { ${contextTypeName} } from './context';`);

    const output = ([
      schema.getQueryType()?.name,
      schema.getMutationType()?.name,
      schema.getSubscriptionType()?.name
    ].filter(Boolean) as string[]).map(typeName => {
      const type = types[typeName];

      if (isScalarType(type) || typeName.startsWith('__')) {
        return null;
      }

      if (isObjectType(type)) {
        const fields = type.getFields();
        const fieldsResolvers = Object.keys(fields).map(fieldName => {
          const oas3Operation =
            buildSchemaPayload.schemaPreprocessingData.operations[fieldName];

          let argsVarName = 'args';
          let argsCall = '';

          if (oas3Operation.parameters.length > 0) {
            const sorted = oas3Operation.parameters.sort((x, y) =>
              x.required === y.required ? 0 : x.required ? -1 : 1
            );
            argsCall = sorted.map(arg => arg.name).join(', ');
            argsVarName = `{ ${argsCall} }`;
          }

          let sdkMethodName = oas3Operation.operationId;

          if (!oas3Operation.object.operationId) {
            sdkMethodName = buildSdkMethodForAnonOperation(
              oas3Operation.path,
              oas3Operation.method
            );
          }

          return `    ${fieldName}: (root, ${argsVarName}, { ${contextInstanceName} }: ${contextTypeName}) => ${contextInstanceName}.${sdkMethodName}(${argsCall}).then(r => r.body),`;
        });

        return `  ${type.name}: {
${fieldsResolvers.join('\n')}
  },`;
      }

      return null;
    });

    const result = `export const resolvers = {
${output.filter(Boolean).join('\n')}
};`;

    writeFileSync(
      resolversFilePath,
      buildFileContentWithImports(resolversFileImports, result)
    );

    writeFileSync(
      indexFilePath,
      buildFileContentWithImports(
        new Set<string>()
          .add(`export * from './resolvers';`)
          .add(`export * from './context';`)
      )
    );

    return {
      payload: indexFilePath
    };
  }
};

function buildSdkMethodForAnonOperation(path: string, method: string): string {
  const [, ...pathsParts] = path.split(/[/?]+/);
  let paramsStr = '';

  if (pathsParts[pathsParts.length - 1].includes('=')) {
    const params = pathsParts.pop()?.split(/[&=]+/);

    paramsStr = (params?.map(t => camelCase(t)) || []).join('');
  }

  const mergedPath = camelCase(pathsParts.join(' '), {
    transform: camelCaseTransformMerge
  });
  const result = mergedPath + paramsStr + pascalCase(method);

  return result;
}

function generateOpenApiSdk(inputFile: string, outputDir: string) {
  const args = `generate -i ${inputFile} -p supportsES6=true -g typescript-node -o ${outputDir}`.split(
    ' '
  );
  const binPath = require.resolve(
    '@openapitools/openapi-generator-cli/bin/openapi-generator.jar'
  );
  const JAVA_OPTS = process.env['JAVA_OPTS'] || '';

  let command = `java ${JAVA_OPTS} -jar "${binPath}"`;

  if (args) {
    command += ` ${args.join(' ')}`;
  }

  spawnSync(command, {
    // stdio: 'inherit',
    shell: true
  });
}

function removeApiTags(oas3: Oas3): void {
  Object.entries(oas3.paths).forEach(([path, pathData]) => {
    Object.keys(pathData).forEach(method => {
      const operation: OperationObject = pathData[method];
      operation.tags = [];
    });
  });
}

function buildFileContentWithImports(
  imports: Set<string>,
  content: string = ''
): string {
  return `${Array.from(imports).join('\n')}

${content}`;
}

export default handler;
