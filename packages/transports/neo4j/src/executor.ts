import type { DefinitionNode, DirectiveNode, DocumentNode, GraphQLSchema } from 'graphql';
import { extendSchema, parse, visit } from 'graphql';
import { GraphQLBigInt } from 'graphql-scalars';
import type { Driver } from 'neo4j-driver';
import type { DisposableExecutor } from '@graphql-mesh/transport-common';
import type { Logger, MeshPubSub } from '@graphql-mesh/types';
import { makeAsyncDisposable } from '@graphql-mesh/utils';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import {
  asArray,
  getDirectiveExtensions,
  getDocumentNodeFromSchema,
  type ExecutionRequest,
} from '@graphql-tools/utils';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { getDriverFromOpts } from './driver.js';
import { getEventEmitterFromPubSub } from './eventEmitterForPubSub.js';

// TODO: Neo4jFeaturesSettings cannot be imported because of exports field in neo4j package.json
// import type { Neo4jFeaturesSettings } from '@neo4j/graphql/dist/types/index.js';
type Neo4jFeaturesSettings = any;

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

export async function getNeo4JExecutor(opts: Neo4JExecutorOpts): Promise<DisposableExecutor> {
  const schemaDirectives = getDirectiveExtensions(opts.schema);
  if (!opts.schema.getDirective('relationship')) {
    opts.schema = extendSchema(
      opts.schema,
      parse(
        /* GraphQL */ `
          directive @relationship(
            type: String
            direction: _RelationDirections
            properties: String
          ) on FIELD_DEFINITION
        `,
        { noLocation: true },
      ),
    );
  }
  const transportDirectives = schemaDirectives?.transport;
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
    pubsub: opts.pubsub,
    typeDefs,
  });
  const defaultExecutor = createDefaultExecutor(executableSchema);
  const sessionConfig = {
    database,
  };

  return makeAsyncDisposable(
    function neo4JExecutor(args: ExecutionRequest) {
      return defaultExecutor({
        ...args,
        context: {
          ...args.context,
          sessionConfig,
        },
      });
    },
    () => driver.close(),
  );
}

interface GetExecutableSchemaFromTypeDefs {
  driver: Driver;
  pubsub?: MeshPubSub;
  typeDefs?: string | DocumentNode;
}

export function getExecutableSchemaFromTypeDefsAndDriver({
  driver,
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
  }
  const extendedTypeDefs = [
    ...asArray(typeDefs),
    /* GraphQL */ `
      directive @introspection(
        subgraph: String
      ) on ENUM | OBJECT | INTERFACE | UNION | INPUT_OBJECT | FIELD_DEFINITION | SCALAR | ENUM_VALUE | INPUT_FIELD_DEFINITION
    `,
  ];
  const neo4jGraphQL = new Neo4jGraphQL({
    typeDefs: extendedTypeDefs,
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
