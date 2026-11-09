import type { DefinitionNode, DirectiveNode, DocumentNode, GraphQLSchema } from 'graphql';
import { extendSchema, parse, visit } from 'graphql';
import type { Driver } from 'neo4j-driver';
import { type Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { asArray, getDirectiveExtensions, getDocumentNodeFromSchema } from '@graphql-tools/utils';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { getDriverFromOpts } from './driver.js';
import { getEventEmitterFromPubSub } from './eventEmitterForPubSub.js';

// TODO: Neo4jFeaturesSettings cannot be imported because of exports field in neo4j package.json
// import type { Neo4jFeaturesSettings } from '@neo4j/graphql/dist/types/index.js';
type Neo4jFeaturesSettings = any;

export interface Neo4JExecutorOpts {
  schema: GraphQLSchema;
  driver?: Driver;
  pubsub?: PubSub;
  log?: Logger;
}

function filterIntrospectionDefinitions<TASTNode extends { directives?: readonly DirectiveNode[] }>(
  node: TASTNode,
): TASTNode | null {
  if (!node.directives?.some(directive => directive.name.value === 'introspection')) {
    return null;
  }
  return node;
}

const MESH_NEO4J_SCHEMA_DIRECTIVES = new Set(['transport']);
const MESH_NEO4J_ONLY_TYPE_NAMES = new Set(['TransportOptions']);

/**
 * @neo4j/graphql >= 7.6.6 keeps SCHEMA_DEFINITION directives when augmenting.
 * Mesh @transport is not a Neo4j directive — strip it (and its helper scalar)
 * before handing typeDefs to Neo4jGraphQL, or schema build fails with
 * "Unknown argument ... on directive @transport".
 */
export function stripMeshTransportFromTypeDefs(typeDefs: DocumentNode): DocumentNode {
  return visit(typeDefs, {
    SchemaDefinition(node) {
      return {
        ...node,
        directives: node.directives?.filter(
          directive => !MESH_NEO4J_SCHEMA_DIRECTIVES.has(directive.name.value),
        ),
      };
    },
    SchemaExtension(node) {
      return {
        ...node,
        directives: node.directives?.filter(
          directive => !MESH_NEO4J_SCHEMA_DIRECTIVES.has(directive.name.value),
        ),
      };
    },
    DirectiveDefinition(node) {
      if (MESH_NEO4J_SCHEMA_DIRECTIVES.has(node.name.value)) {
        return null;
      }
    },
    ScalarTypeDefinition(node) {
      if (MESH_NEO4J_ONLY_TYPE_NAMES.has(node.name.value)) {
        return null;
      }
    },
  });
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
      log: opts.log,
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
  typeDefs = stripMeshTransportFromTypeDefs(typeDefs);
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

  function neo4JExecutor(args) {
    return defaultExecutor({
      ...args,
      context: {
        ...args.context,
        sessionConfig,
      },
    });
  }
  neo4JExecutor[DisposableSymbols.asyncDispose] = () => driver.close();
  return neo4JExecutor as DisposableExecutor;
}

interface GetExecutableSchemaFromTypeDefs {
  driver: Driver;
  pubsub?: PubSub;
  typeDefs?: string | DocumentNode;
}

export function getExecutableSchemaFromTypeDefsAndDriver({
  driver,
  pubsub: meshOrPubSub,
  typeDefs,
}: GetExecutableSchemaFromTypeDefs) {
  let features: Neo4jFeaturesSettings;
  if (meshOrPubSub) {
    const pubsub = meshOrPubSub;
    features = {
      subscriptions: {
        events: getEventEmitterFromPubSub(pubsub),
        publish: eventMeta => pubsub.publish(eventMeta.event, eventMeta),
        close: () => {},
      },
    };
  }
  const extendedTypeDefs = asArray(typeDefs).map(defs =>
    typeof defs === 'string' ? defs : stripMeshTransportFromTypeDefs(defs),
  );
  extendedTypeDefs.push(/* GraphQL */ `
    directive @introspection(
      subgraph: String
    ) on ENUM | OBJECT | INTERFACE | UNION | INPUT_OBJECT | FIELD_DEFINITION | SCALAR | ENUM_VALUE | INPUT_FIELD_DEFINITION
  `);
  const neo4jGraphQL = new Neo4jGraphQL({
    typeDefs: extendedTypeDefs,
    driver,
    validate: false,
    debug: !!globalThis.process?.env?.DEBUG,
    features,
  });

  return neo4jGraphQL.getSchema();
}
