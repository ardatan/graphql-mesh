import { GraphQLSchema, printSchema } from 'graphql';
import { MeshConfig } from './config';
import { resolve, join } from 'path';
import { mergeSchemas } from '@graphql-toolkit/schema-merging';
import { sync as mkdirp } from 'mkdirp';
import { ApolloServer } from 'apollo-server';
import chalk from 'chalk';
import { Logger } from 'winston';
import {
  applySchemaTransformations,
  getHandler,
  applyOutputTransformations
} from './utils';
import { writeFileSync } from 'fs';

export interface ExecuteMeshOptions {
  output: MeshConfig;
  serve: boolean;
  logger: Logger;
}

export async function executeMesh({
  output,
  serve = false,
  logger
}: ExecuteMeshOptions): Promise<void> {
  // const handlersResults: Record<
  //   string,
  //   {
  //     buildSchemaPayload: any;
  //     generateServicesPayload: any;
  //     schema: GraphQLSchema;
  //     indexFile?: string;
  //   }
  // > = {};
  // const outputPath = resolve(process.cwd(), join(output.output, './schema/'));
  // logger.info(
  //   chalk.blueBright(`Generating GraphQL Mesh to directory: ${output.output}`)
  // );
  // logger.debug(`Resolved output path: ${outputPath}`);

  // for (const source of output.sources) {
  //   logger.info(`[${source.name}] Building GraphQL schema...`);
  //   const sourceOutputPath = join(outputPath, `./${source.name}/`);
  //   mkdirp(sourceOutputPath);
  //   const handlerFn = await getHandler(logger, source);
  //   logger.debug(`Got handler by name, trying to execute schema builder...`);

  //   let {
  //     schema,
  //     payload: buildSchemaPayload
  //   } = await handlerFn.buildGraphQLSchema({
  //     apiName: source.name,
  //     filePathOrUrl: source.source,
  //     outputPath: sourceOutputPath
  //   });

  //   logger.debug(`Build GraphQL done:\n${printSchema(schema)}`);
  //   logger.debug(`Build GraphQL payload:`, buildSchemaPayload);

  //   if (source.transformations && source.transformations.length > 0) {
  //     logger.info(`[${source.name}] Executing schema tranformations...`);

  //     schema = await applySchemaTransformations(
  //       source.name,
  //       schema,
  //       source.transformations
  //     );

  //     logger.debug(
  //       `Done with schema transformatiosn, modified schema is:\n${printSchema(
  //         schema
  //       )}`
  //     );
  //   }

  //   logger.info(`[${source.name}] Executing API services builder...`);
  //   const apiServicesArgs = {
  //     apiName: source.name,
  //     outputPath: sourceOutputPath,
  //     schema,
  //     payload: buildSchemaPayload
  //   };
  //   logger.debug(`Generating API services args:`, apiServicesArgs);

  //   let {
  //     payload: generateServicesPayload
  //   } = await handlerFn.generateApiServices(apiServicesArgs);
  //   logger.debug(
  //     `Done with API services generation, result payload is: `,
  //     generateServicesPayload
  //   );

  //   handlersResults[source.name] = {
  //     schema,
  //     buildSchemaPayload,
  //     generateServicesPayload
  //   };
  // }

  // logger.info(`Creating a GraphQL Mesh unified schema...`);

  // let unifiedSchema = mergeSchemas({
  //   schemas: Object.keys(handlersResults).map(
  //     key => handlersResults[key].schema
  //   )
  // });

  // logger.debug(
  //   `Done with schema merging, result schema is:\n${printSchema(unifiedSchema)}`
  // );

  // if (output.transformations && output.transformations.length > 0) {
  //   logger.info(`Applying unified schema transformations...`);

  //   unifiedSchema = await applyOutputTransformations(
  //     unifiedSchema,
  //     output.transformations
  //   );
  //   logger.debug(
  //     `Done with unified schema transformations, modified schema is:\n${printSchema(
  //       unifiedSchema
  //     )}`
  //   );
  // }

  // const unifiedSchemaPath = join(outputPath, `./schema.graphql`);
  // writeFileSync(unifiedSchemaPath, printSchema(unifiedSchema));

  // const unifiedContextIdentifier = DEFAULT_IDENTIFIER;
  // const unifiedContextFilePath = join(outputPath, './context.ts');
  // const resolversSignaturePath = join(outputPath, `./resolvers.types.ts`);

  // for (const source of output.sources) {
  //   const handlerFn = await getHandler(logger, source);
  //   const sourceOutputPath = join(outputPath, `./${source.name}/`);
  //   const handlerConfig = source.handler.config || {};

  //   logger.info(`[${source.name}] Generating resolvers...`);
  //   const gqlWrapperOptions = {
  //     handlerConfig,
  //     apiName: source.name,
  //     outputPath: sourceOutputPath,
  //     buildSchemaPayload: handlersResults[source.name].buildSchemaPayload,
  //     apiServicesPayload: handlersResults[source.name].generateServicesPayload,
  //     schema: handlersResults[source.name].schema,
  //     signature: {
  //       identifier: 'Resolvers',
  //       filePath: resolversSignaturePath
  //     }
  //   };
  //   logger.debug(`generateGqlWrapper options:`, gqlWrapperOptions);
  //   const { payload, filePath } = await handlerFn.generateGqlWrapper(
  //     gqlWrapperOptions
  //   );
  //   logger.debug(
  //     `generateGqlWrapper result path: ${filePath}, payload:`,
  //     payload
  //   );
  //   handlersResults[source.name].indexFile = filePath;
  // }

  // logger.info(`Generating a unified resolvers signature...`);

  // await generateUnifiedResolversSignature({
  //   outputPath: resolversSignaturePath,
  //   schema: unifiedSchema,
  //   basePath: outputPath,
  //   context: {
  //     identifier: unifiedContextIdentifier,
  //     path: unifiedContextFilePath
  //   }
  // });

  // const apisRootFiles = Object.keys(handlersResults).reduce((prev, apiName) => {
  //   return {
  //     ...prev,
  //     [apiName]: handlersResults[apiName].indexFile
  //   };
  // }, {});

  // logger.info(`Generating a unified context object for all APIs...`);

  // generateUnifiedContext({
  //   basePath: outputPath,
  //   apisRootFiles,
  //   identifier: unifiedContextIdentifier,
  //   outputPath: unifiedContextFilePath
  // });

  // const additionalImports = new Set<string>();

  // if (output.additionalResolvers && output.additionalResolvers.length > 0) {
  //   output.additionalResolvers.forEach(relative => {
  //     additionalImports.add(resolve(process.cwd(), relative));
  //   });
  // }

  // const {
  //   filePath: executableSchemaFilePath
  // } = generateRootExecutableSchemaFile({
  //   apisRootFiles,
  //   basePath: outputPath,
  //   additionalImports,
  //   schemaFilePath: unifiedSchemaPath,
  //   unifiedContext: {
  //     path: unifiedContextFilePath,
  //     identifier: unifiedContextIdentifier
  //   }
  // });

  // if (serve) {
  //   logger.info(
  //     `Loading generated schema and resolvers, and starting GraphiQL...`
  //   );

  //   const { schema, contextBuilderFn: context } = await import(
  //     executableSchemaFilePath
  //   );

  //   const server = new ApolloServer({
  //     schema,
  //     context
  //   });

  //   server.listen().then(({ url }) => {
  //     logger.info(`🚀  Serving GraphQL Mesh in: ${url}`);
  //   });
  // } else {
  //   logger.info(`Mesh done!`);
  // }
}
