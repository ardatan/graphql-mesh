import { GraphQLSchema } from 'graphql';
import {
  MeshConfig,
  APISource,
  SchemaTransformation,
  OutputTransformation
} from './config';
import { resolve } from 'path';
import { mergeSchemas } from '@graphql-toolkit/schema-merging';

export type HandlerFn = (
  name: string,
  outputPath: string,
  source: string
) => Promise<{ schema: GraphQLSchema }>;
export type SchemaTransformationFn = (
  name: string,
  schema: GraphQLSchema
) => Promise<GraphQLSchema>;
export type OutputTransformationFn = (
  schema: GraphQLSchema
) => Promise<GraphQLSchema>;

export async function executeHandler(outDir: string, source: APISource): Promise<any> {
  const {
    name: sourceName,
    handler: schemaHandlerName,
    source: schemaSourceFilePath
  } = source;
  console.info(
    `\tLoading API schema ${sourceName} from source "${schemaSourceFilePath}" using handler ${schemaHandlerName}...`
  );

  const handlerFn = await getPackage<HandlerFn>(schemaHandlerName, 'handler');

  return await handlerFn(sourceName, outDir, schemaSourceFilePath);
}

export async function executeMesh(config: MeshConfig): Promise<void> {
  // TODO: Improve and run in parallel // Dotan
  // TODO: Report nice CLI output (listr?) // Dotan
  for (const output of config) {
    const schemas: Record<string, GraphQLSchema> = {};
    const outputPath = output.output;
    console.info(`Generating output to ${outputPath}...`);

    for (const source of output.sources) {
      let schema = await executeHandler(outputPath, source);

      if (source.transformations && source.transformations.length > 0) {
        schema = await applySchemaTransformations(
          source.name,
          schema,
          source.transformations
        );
      }

      schemas[source.name] = schema;
    }

    let resultSchema = mergeSchemas({
      schemas: Object.keys(schemas).map(key => schemas[key])
    });

    if (output.transformations && output.transformations.length > 0) {
      resultSchema = await applyOutputTransformations(
        resultSchema,
        output.transformations
      );
    }

    // const server = new ApolloServer({
    //   cors: true,
    //   schema: resultSchema
    // });

    // server.listen().then(s => {
    //   console.log(s.port);
    // });

    // await generate(outputPath, resultSchema);
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
        throw new Error(`Unable to load ${type} matching ${name}`);
      }
    }
  }

  throw new Error(`Unable to find ${type} matching ${name}`);
}
