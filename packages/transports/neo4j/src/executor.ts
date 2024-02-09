import { DefinitionNode, DirectiveNode, DocumentNode, GraphQLSchema, parse, visit } from 'graphql';
import { GraphQLBigInt } from 'graphql-scalars';
import { Driver } from 'neo4j-driver';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { Executor, getDirective, getDocumentNodeFromSchema } from '@graphql-tools/utils';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { Neo4jFeaturesSettings } from '@neo4j/graphql/dist/types';
import { getDriverFromOpts } from './driver.js';
import { getEventEmitterFromPubSub } from './eventEmitterForPubSub.js';

export interface Neo4JExecutorOpts {
  schema: GraphQLSchema;
  driver?: Driver;
  pubsub?: MeshPubSub;
  logger?: Logger;
}

function filterIntrospectionDefinitions<TASTNode extends { directives?: readonly DirectiveNode[] }>(
  node: TASTNode,
): TASTNode | null {
  if (!node.directives?.some(directive => directive.name.value === 'introspection')) {
    return null;
  }
  return node;
}

export async function getNeo4JExecutor(opts: Neo4JExecutorOpts): Promise<Executor> {
  const transportDirectives = getDirective(opts.schema, opts.schema, 'transport');
  if (!transportDirectives?.length) {
    throw new Error('No transport directive found on the schema!');
  }
  const {
    location: endpoint,
    options: { database, auth },
  } = transportDirectives[0];
  let driver = opts.driver;
  if (!driver) {
    driver = getDriverFromOpts({
      endpoint,
      auth,
      logger: opts.logger,
    });
  }
  let typeDefs = getDocumentNodeFromSchema(opts.schema);
  const astVisitor = {
    enter: filterIntrospectionDefinitions,
  };
  typeDefs = visit(typeDefs, {
    EnumTypeDefinition: astVisitor,
    ObjectTypeDefinition: astVisitor,
    InterfaceTypeDefinition: astVisitor,
    UnionTypeDefinition: astVisitor,
    InputObjectTypeDefinition: astVisitor,
    FieldDefinition: astVisitor,
    // DirectiveDefinition: astVisitor,
    ScalarTypeDefinition: astVisitor,
    EnumValueDefinition: astVisitor,
    InputValueDefinition: astVisitor,
  });
  (typeDefs.definitions as DefinitionNode[]).push(
    ...parse(/* GraphQL */ `
      directive @source(
        subgraph: String
        name: String
        type: String
      ) on ENUM | OBJECT | INTERFACE | UNION | INPUT_OBJECT | FIELD_DEFINITION | SCALAR | ENUM_VALUE | INPUT_FIELD_DEFINITION
    `).definitions,
  );
  const executableSchema = await getExecutableSchemaFromTypeDefsAndDriver({
    driver,
    logger: opts.logger,
    pubsub: opts.pubsub,
    typeDefs,
  });
  const defaultExecutor = createDefaultExecutor(executableSchema);
  const sessionConfig = {
    database,
  };

  return function neo4JExecutor(args) {
    return defaultExecutor({
      ...args,
      context: {
        ...args.context,
        sessionConfig,
      },
    });
  };
}

interface GetExecutableSchemaFromTypeDefs {
  driver: Driver;
  logger?: Logger;
  pubsub?: MeshPubSub;
  typeDefs?: string | DocumentNode;
}

export function getExecutableSchemaFromTypeDefsAndDriver({
  driver,
  logger,
  pubsub,
  typeDefs,
}: GetExecutableSchemaFromTypeDefs) {
  let features: Neo4jFeaturesSettings;
  if (pubsub) {
    features = {
      subscriptions: {
        events: getEventEmitterFromPubSub(pubsub),
        publish: eventMeta => pubsub.publish(eventMeta.event, eventMeta),
        close: () => {},
      },
    };
    const id = pubsub.subscribe('destroy', async () => {
      pubsub.unsubscribe(id);
      logger?.debug('Closing Neo4j');
      await driver.close();
      logger?.debug('Neo4j closed');
    });
  }
  const neo4jGraphQL = new Neo4jGraphQL({
    typeDefs,
    driver,
    validate: false,
    debug: !!process.env.DEBUG,
    resolvers: {
      BigInt: GraphQLBigInt,
    },
    features,
  });

  return neo4jGraphQL.getSchema();
}
