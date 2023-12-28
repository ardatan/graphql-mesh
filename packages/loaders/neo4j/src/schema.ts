import { ASTNode, ConstDirectiveNode, DocumentNode, parse, visit } from 'graphql';
import { GraphQLBigInt } from 'graphql-scalars';
import neo4j, { Driver } from 'neo4j-driver';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { mergeSchemas } from '@graphql-tools/schema';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { Neo4jFeaturesSettings } from '@neo4j/graphql/dist/types';
import { toGraphQLTypeDefs } from '@neo4j/introspector';
import { Neo4JAuthOpts } from './auth';
import { getDriverFromOpts } from './driver';
import { getEventEmitterFromPubSub } from './eventEmitterForPubSub';
import { polyfillStrReplaceAll, revertStrReplaceAllPolyfill } from './strReplaceAllPolyfill';

function addIntrospectionDirective<
  TASTNode extends ASTNode & { directives?: readonly ConstDirectiveNode[] },
>(node: TASTNode) {
  return {
    ...node,
    directives: [
      ...(node.directives || []),
      {
        kind: 'Directive',
        name: {
          kind: 'Name',
          value: 'introspection',
        },
      },
    ],
  };
}

export interface LoadGraphQLSchemaFromNeo4JOpts {
  endpoint: string;
  database?: string;
  auth?: Neo4JAuthOpts;
  pubsub?: MeshPubSub;
  logger?: Logger;
  driver?: Driver;
}

export async function loadGraphQLSchemaFromNeo4J(
  subgraphName: string,
  { endpoint, auth, logger, pubsub, database = 'neo4j', driver }: LoadGraphQLSchemaFromNeo4JOpts,
) {
  logger.info('Inferring the schema from the database: ', `"${database}"`);
  polyfillStrReplaceAll();
  let typeDefsStr = await toGraphQLTypeDefs(() =>
    driver.session({
      database,
      defaultAccessMode: neo4j.session.READ,
    }),
  );
  typeDefsStr += `\n directive @introspection on ENUM_VALUE | FIELD_DEFINITION | INPUT_FIELD_DEFINITION | OBJECT | INTERFACE | UNION | INPUT_OBJECT | SCALAR | ENUM \n`;
  let typeDefs = parse(typeDefsStr, { noLocation: true });
  typeDefs = visit(typeDefs, {
    EnumTypeDefinition: addIntrospectionDirective,
    ObjectTypeDefinition: addIntrospectionDirective,
    InterfaceTypeDefinition: addIntrospectionDirective,
    UnionTypeDefinition: addIntrospectionDirective,
    InputObjectTypeDefinition: addIntrospectionDirective,
    FieldDefinition: addIntrospectionDirective,
    // DirectiveDefinition: addIntrospectionDirective,
    ScalarTypeDefinition: addIntrospectionDirective,
    EnumValueDefinition: addIntrospectionDirective,
    InputValueDefinition: addIntrospectionDirective,
  });
  revertStrReplaceAllPolyfill();

  if (!driver) {
    driver = getDriverFromOpts({
      endpoint,
      auth,
      logger,
    });
  }

  const schema = await getExecutableSchemaFromTypeDefsAndDriver({
    driver,
    logger,
    pubsub,
    typeDefs,
  });

  const schemaExtensions: any = (schema.extensions ||= {});
  schemaExtensions.directives = schemaExtensions.directives || {};
  schemaExtensions.directives.transport = {
    kind: 'neo4j',
    subgraph: subgraphName,
    location: endpoint,
    options: {
      database,
      auth,
    },
  };
  return mergeSchemas({
    schemas: [schema],
    typeDefs,
    assumeValid: true,
    assumeValidSDL: true,
  });
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
