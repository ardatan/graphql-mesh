import { generateSchemaAstFile } from '@graphql-mesh/utils';
import { GraphQLSchema } from 'graphql';
import {
  MeshConfig,
  APISource,
  SchemaTransformation,
  OutputTransformation
} from './config';
import { resolve, join } from 'path';
import { mergeSchemas } from '@graphql-toolkit/schema-merging';
import {
  OutputTransformationFn,
  SchemaTransformationFn,
  MeshHandlerLibrary
} from '@graphql-mesh/types';
import { sync as mkdirp } from 'mkdirp';

export async function getHandler(
  source: APISource
): Promise<MeshHandlerLibrary> {
  console.info(`\tLoading handler ${source.handler}...`);

  const handlerFn = await getPackage<MeshHandlerLibrary>(
    source.handler,
    'handler'
  );

  return handlerFn;
}

export async function executeMesh(config: MeshConfig): Promise<void> {
  // TODO: Improve and run in parallel // Dotan
  // TODO: Report nice CLI output (listr?) // Dotan
  for (const output of config) {
    const handlersResults: Record<
      string,
      {
        buildSchemaPayload: any;
        generateServicesPayload: any;
        schema: GraphQLSchema;
      }
    > = {};
    const outputPath = resolve(process.cwd(), output.output);
    console.info(`Generating output to ${outputPath}...`);

    for (const source of output.sources) {
      const sourceOutputPath = join(outputPath, `./${source.name}/`);
      mkdirp(sourceOutputPath);
      const handlerFn = await getHandler(source);

      let {
        schema,
        payload: buildSchemaPayload
      } = await handlerFn.buildGraphQLSchema({
        apiName: source.name,
        filePathOrUrl: source.source,
        outputPath: sourceOutputPath
      });

      if (source.transformations && source.transformations.length > 0) {
        schema = await applySchemaTransformations(
          source.name,
          schema,
          source.transformations
        );
      }

      await generateSchemaAstFile(
        schema,
        join(sourceOutputPath, `./schema.graphql`)
      );

      let {
        payload: generateServicesPayload
      } = await handlerFn.generateApiServices({
        apiName: source.name,
        outputPath: sourceOutputPath,
        schema,
        payload: buildSchemaPayload
      });

      handlersResults[source.name] = {
        schema,
        buildSchemaPayload,
        generateServicesPayload
      };
    }

    let unifiedSchema = mergeSchemas({
      schemas: Object.keys(handlersResults).map(
        key => handlersResults[key].schema
      )
    });

    if (output.transformations && output.transformations.length > 0) {
      unifiedSchema = await applyOutputTransformations(
        unifiedSchema,
        output.transformations
      );
    }

    await generateSchemaAstFile(
      unifiedSchema,
      join(outputPath, './unified-schema.graphql')
    );

    // TODO: Generate resolvers signature somewhere, and the use it for the resolvers
    // await generateUnifiedResolversSignature(
    //   unifiedSchema,
    //   join(outputPath, './resolvers-types.ts'),
    //   mappers
    // );

    for (const source of output.sources) {
      const handlerFn = await getHandler(source);
      await handlerFn.generateResolvers({
        apiName: source.name,
        outputPath: outputPath,
        buildSchemaPayload: handlersResults[source.name].buildSchemaPayload,
        apiServicesPayload:
          handlersResults[source.name].generateServicesPayload,
        schema: handlersResults[source.name].schema
      });
    }
  }
}

async function applySchemaTransformations(
  name: string,
  schema: GraphQLSchema,
  transformations: SchemaTransformation[]
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;

  for (const transformation of transformations) {
    const transformationFn = await getPackage<SchemaTransformationFn>(
      transformation.type,
      'transformation'
    );

    resultSchema = await transformationFn(name, schema);
  }

  return resultSchema;
}

async function applyOutputTransformations(
  schema: GraphQLSchema,
  transformations: OutputTransformation[]
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;

  for (const transformation of transformations) {
    const transformationFn = await getPackage<OutputTransformationFn>(
      transformation.type,
      'transformation'
    );

    resultSchema = await transformationFn(schema);
  }

  return resultSchema;
}

async function getPackage<T>(name: string, type: string): Promise<T> {
  const possibleNames = [
    `@graphql-mesh/${name}`,
    `@graphql-mesh/${name}-${type}`,
    name
  ];
  const possibleModules = possibleNames.concat(resolve(process.cwd(), name));

  for (const moduleName of possibleModules) {
    try {
      const exported = await import(moduleName);

      return (exported.default || exported.parser || exported) as T;
    } catch (err) {
      if (err.message.indexOf(`Cannot find module '${moduleName}'`) === -1) {
        throw new Error(
          `Unable to load ${type} matching ${name}: ${err.message}`
        );
      }
    }
  }

  throw new Error(`Unable to find ${type} matching ${name}`);
}
