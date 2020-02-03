import { generateSchemaAstFile } from '@graphql-mesh/utils';
import { GraphQLSchema, printSchema } from 'graphql';
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
import { ApolloServer } from 'apollo-server';
import chalk from 'chalk';
import { Logger } from 'winston';

export async function getHandler(
  logger: Logger,
  source: APISource
): Promise<MeshHandlerLibrary> {
  logger.debug(`Loading Mesh handler by name: ${source.handler.name}`);

  const handlerFn = await getPackage<MeshHandlerLibrary>(
    source.handler.name,
    'handler'
  );

  return handlerFn;
}

export interface ExecuteMeshOptions {
  config: MeshConfig;
  serve: boolean;
  logger: Logger;
}

export async function executeMesh({
  config,
  serve = false,
  logger
}: ExecuteMeshOptions): Promise<void> {
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
    logger.info(
      chalk.blueBright(`Generating GraphQL Mesh to directory: ${output.output}`)
    );
    logger.debug(`Resolved output path: ${outputPath}`);

    for (const source of output.sources) {
      logger.info(`[${source.name}] Building GraphQL schema...`);
      const sourceOutputPath = join(outputPath, `./${source.name}/`);
      mkdirp(sourceOutputPath);
      const handlerFn = await getHandler(logger, source);
      logger.debug(`Got handler by name, trying to execute schema builder...`);

      let {
        schema,
        payload: buildSchemaPayload
      } = await handlerFn.buildGraphQLSchema({
        apiName: source.name,
        filePathOrUrl: source.source,
        outputPath: sourceOutputPath
      });

      logger.debug(`Build GraphQL done:\n${printSchema(schema)}`);
      logger.debug(`Build GraphQL payload:`, buildSchemaPayload);

      if (source.transformations && source.transformations.length > 0) {
        logger.info(`[${source.name}] Executing schema tranformations...`);

        schema = await applySchemaTransformations(
          source.name,
          schema,
          source.transformations
        );

        logger.debug(
          `Done with schema transformatiosn, modified schema is:\n${printSchema(
            schema
          )}`
        );
      }

      const schemaPath = join(sourceOutputPath, `./schema.graphql`);
      logger.debug(
        `Writing schema file for ${source.name} to: ${schemaPath}...`
      );
      await generateSchemaAstFile(schema, schemaPath);

      logger.info(`[${source.name}] Executing API services builder...`);
      const apiServicesArgs = {
        apiName: source.name,
        outputPath: sourceOutputPath,
        schema,
        payload: buildSchemaPayload
      };
      logger.debug(`Generating API services args:`, apiServicesArgs);

      let {
        payload: generateServicesPayload
      } = await handlerFn.generateApiServices(apiServicesArgs);
      logger.debug(
        `Done with API services generation, result payload is: `,
        generateServicesPayload
      );

      handlersResults[source.name] = {
        schema,
        buildSchemaPayload,
        generateServicesPayload
      };
    }

    logger.info(`Creating a GraphQL Mesh unified schema...`);

    let unifiedSchema = mergeSchemas({
      schemas: Object.keys(handlersResults).map(
        key => handlersResults[key].schema
      )
    });

    logger.debug(
      `Done with schema merging, result schema is:\n${printSchema(
        unifiedSchema
      )}`
    );

    if (output.transformations && output.transformations.length > 0) {
      logger.info(`Applying unified schema transformations...`);

      unifiedSchema = await applyOutputTransformations(
        unifiedSchema,
        output.transformations
      );
      logger.debug(
        `Done with unified schema transformations, modified schema is:\n${printSchema(
          unifiedSchema
        )}`
      );
    }

    const unifiedSchemaPath = join(outputPath, './unified-schema.graphql');
    logger.info(`Saving unified schema file to: ${unifiedSchemaPath}`);

    await generateSchemaAstFile(unifiedSchema, unifiedSchemaPath);

    // TODO: Generate resolvers signature somewhere, and the use it for the resolvers
    // await generateUnifiedResolversSignature(
    //   unifiedSchema,
    //   join(outputPath, './resolvers-types.ts'),
    //   mappers
    // );

    const generatedIndexFiles = [];

    for (const source of output.sources) {
      const handlerFn = await getHandler(logger, source);
      const sourceOutputPath = join(outputPath, `./${source.name}/`);
      const handlerConfig = source.handler.config || {};

      logger.info(`[${source.name}] Generating resolvers...`);
      const gqlWrapperOptions = {
        handlerConfig,
        apiName: source.name,
        outputPath: sourceOutputPath,
        buildSchemaPayload: handlersResults[source.name].buildSchemaPayload,
        apiServicesPayload:
          handlersResults[source.name].generateServicesPayload,
        schema: handlersResults[source.name].schema
      };
      logger.debug(`generateGqlWrapper options:`, gqlWrapperOptions);
      const { payload } = await handlerFn.generateGqlWrapper(gqlWrapperOptions);
      logger.debug(`generateGqlWrapper result payload:`, payload);
      generatedIndexFiles.push(payload);
    }

    if (serve) {
      logger.debug(
        `Serve flag is set, so trying to load generated resolvers and run GraphiQL...`,
        generatedIndexFiles
      );
      logger.info(
        `Loading generated schema and resolvers, and starting GraphiQL...`
      );

      if (output.additionalResolvers && output.additionalResolvers.length > 0) {
        generatedIndexFiles.push(
          ...output.additionalResolvers.map(relative =>
            resolve(process.cwd(), relative)
          )
        );
      }

      const loadedResolversPackages = generatedIndexFiles.map(p => require(p));
      const resolvers = loadedResolversPackages
        .map(p => p.resolvers)
        .filter(Boolean);
      const context = loadedResolversPackages
        .map(p => p.createContext)
        .filter(Boolean)
        .reduce((prev, contextFn) => {
          return {
            ...prev,
            ...contextFn()
          };
        }, {});

      const server = new ApolloServer({
        typeDefs: printSchema(unifiedSchema),
        resolvers,
        context
      });

      server.listen().then(({ url }) => {
        logger.info(`🚀  Serving GraphQL Mesh in: ${url}`);
      });
    } else {
      logger.info(`Mesh done!`);
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
    const transformationFn = await getPackage<SchemaTransformationFn<any>>(
      transformation.type,
      'transformation'
    );

    resultSchema = await transformationFn({
      apiName: name,
      schema: schema,
      config: transformation
    });
  }

  return resultSchema;
}

async function applyOutputTransformations(
  schema: GraphQLSchema,
  transformations: OutputTransformation[]
): Promise<GraphQLSchema> {
  let resultSchema: GraphQLSchema = schema;

  for (const transformation of transformations) {
    const transformationFn = await getPackage<OutputTransformationFn<any>>(
      transformation.type,
      'transformation'
    );

    resultSchema = await transformationFn({
      schema,
      config: transformation
    });
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
