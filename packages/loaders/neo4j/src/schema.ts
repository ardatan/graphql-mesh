import { ASTNode, ConstDirectiveNode, DefinitionNode, DocumentNode, parse, visit } from 'graphql';
import { GraphQLBigInt } from 'graphql-scalars';
import neo4j, { Driver } from 'neo4j-driver';
import { Logger, MeshPubSub } from '@graphql-mesh/types';
import { mergeSchemas } from '@graphql-tools/schema';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { Neo4jFeaturesSettings } from '@neo4j/graphql/dist/types';
import { toGraphQLTypeDefs } from '@neo4j/introspector';
import { Neo4JAuthOpts } from './auth.js';
import { getDriverFromOpts } from './driver.js';
import { getEventEmitterFromPubSub } from './eventEmitterForPubSub.js';
import { polyfillStrReplaceAll, revertStrReplaceAllPolyfill } from './strReplaceAllPolyfill.js';

function createAddIntrospectionDirective(subgraph: string) {
  return function addIntrospectionDirective<
    TASTNode extends ASTNode & { directives?: readonly ConstDirectiveNode[] },
  >(node: TASTNode): TASTNode | void {
    if (!node.directives?.some(directive => directive.name.value === 'introspection')) {
      return {
        ...node,
        directives: [
          ...(node.directives || []),
          {
            kind: 'Directive',
            name: {
              kind: 'Name',
              value: 'introspection',
              arguments: [
                {
                  kind: 'Argument',
                  name: {
                    kind: 'Name',
                    value: 'subgraph',
                  },
                  value: {
                    kind: 'StringValue',
                    value: subgraph,
                  },
                },
              ],
            },
          },
        ],
      };
    }
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
  logger?.info('Inferring the schema from the database: ', `"${database}"`);
  let closeDriverAfter = false;
  if (!driver) {
    closeDriverAfter = !pubsub;
    driver = getDriverFromOpts({
      endpoint,
      auth,
      logger,
    });
  }
  polyfillStrReplaceAll();
  const typeDefsStr = await toGraphQLTypeDefs(() =>
    driver.session({
      database,
      defaultAccessMode: neo4j.session.READ,
    }),
  );
  let typeDefs = parse(typeDefsStr, { noLocation: true });
  const addIntrospectionDirective = createAddIntrospectionDirective(subgraphName);
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
  (typeDefs.definitions as DefinitionNode[]).push(
    ...parse(
      /* GraphQL */ `
        directive @relationshipProperties on OBJECT
        directive @relationship(type: String, direction: _RelationDirections) on FIELD_DEFINITION
        enum _RelationDirections {
          IN
          OUT
        }
        directive @introspection(
          subgraph: String
        ) on ENUM | OBJECT | INTERFACE | UNION | INPUT_OBJECT | FIELD_DEFINITION | SCALAR | ENUM_VALUE | INPUT_FIELD_DEFINITION
      `,
      {
        noLocation: true,
      },
    ).definitions,
  );
  revertStrReplaceAllPolyfill();

  const schema = await getExecutableSchemaFromTypeDefsAndDriver({
    driver,
    logger,
    pubsub,
    typeDefs,
  });

  if (closeDriverAfter) {
    await driver.close();
  }

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
    typeDefs: [
      typeDefs,
      `
        scalar Any
        directive @transport(kind: String, subgraph: String, location: String, options: Any) on SCHEMA
      `,
    ],
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
