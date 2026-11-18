import type { DefinitionNode, DocumentNode, GraphQLSchema } from 'graphql';
import { extendSchema, Kind, parse, visit } from 'graphql';
import type { Driver } from 'neo4j-driver';
import { type Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { asArray, getDirectiveExtensions, getDocumentNodeFromSchema } from '@graphql-tools/utils';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import { getNeo4jDirectiveDefinitions } from './directives.js';
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

function hasDirective(
  node: { directives?: readonly { name: { value: string } }[] },
  name: string,
): boolean {
  return Boolean(node.directives?.some(directive => directive.name.value === name));
}

function isNeo4jModelType(node: { directives?: readonly { name: { value: string } }[] }): boolean {
  return (
    hasDirective(node, 'node') ||
    hasDirective(node, 'relationshipProperties') ||
    hasDirective(node, 'introspection')
  );
}

// Mesh/federation schema artifacts that @neo4j/graphql must not see.
// 7.6.6+ keeps SCHEMA_DEFINITION directives when augmenting; leftover Mesh
// `@transport` / Apollo `@link` usages then fail validation (e.g. unknown
// `url`/`import` on `@link` after helper scalars were filtered out).
const STRIP_SCHEMA_DIRECTIVES = new Set(['transport', 'link']);
const STRIP_DIRECTIVE_DEFINITIONS = new Set([
  'transport',
  'link',
  'extraSchemaDefinitionDirective',
  'join__graph',
  'join__field',
  'join__type',
  'join__implements',
  'join__unionMember',
  'join__enumValue',
  'source',
  'meshSource',
  'merge',
]);
const STRIP_TYPE_NAMES = new Set([
  'TransportOptions',
  'link__Import',
  'link__Purpose',
  'join__FieldSet',
  'join__Graph',
  '_DirectiveExtensions',
]);

/**
 * Strip Mesh/federation schema directives and helper types before Neo4jGraphQL.
 */
export function stripMeshTransportFromTypeDefs(typeDefs: DocumentNode): DocumentNode {
  return visit(typeDefs, {
    SchemaDefinition(node) {
      return {
        ...node,
        directives: node.directives?.filter(
          directive => !STRIP_SCHEMA_DIRECTIVES.has(directive.name.value),
        ),
      };
    },
    SchemaExtension(node) {
      return {
        ...node,
        directives: node.directives?.filter(
          directive => !STRIP_SCHEMA_DIRECTIVES.has(directive.name.value),
        ),
      };
    },
    DirectiveDefinition(node) {
      if (STRIP_DIRECTIVE_DEFINITIONS.has(node.name.value)) {
        return null;
      }
    },
    ScalarTypeDefinition(node) {
      if (STRIP_TYPE_NAMES.has(node.name.value)) {
        return null;
      }
    },
    EnumTypeDefinition(node) {
      if (STRIP_TYPE_NAMES.has(node.name.value)) {
        return null;
      }
    },
  });
}

function namedTypeNameFromTypeNode(typeNode: {
  kind: string;
  name?: { value: string };
  type?: any;
}): string | undefined {
  if (typeNode.kind === Kind.NAMED_TYPE) {
    return typeNode.name?.value;
  }
  if ('type' in typeNode && typeNode.type) {
    return namedTypeNameFromTypeNode(typeNode.type);
  }
  return undefined;
}

/**
 * Keep Neo4j author/model types for re-augmentation.
 * Prefers `@node` / `@relationshipProperties` (native dialect); also accepts Mesh
 * `@introspection` stamps from the introspector / loader round-trip.
 * Does not strip fields of kept types (author property fields need no Mesh stamp).
 */
const ROOT_OPERATION_NAMES = new Set(['Query', 'Mutation', 'Subscription']);

export function extractNeo4jModelTypeDefs(typeDefs: DocumentNode): DocumentNode {
  const modelTypeNames = new Set<string>();
  for (const def of typeDefs.definitions) {
    if (
      (def.kind === Kind.OBJECT_TYPE_DEFINITION || def.kind === Kind.INTERFACE_TYPE_DEFINITION) &&
      isNeo4jModelType(def)
    ) {
      modelTypeNames.add(def.name.value);
    }
    // Author root fields with `@cypher` are Neo4j model surface (not CRUD-generated).
    if (
      def.kind === Kind.OBJECT_TYPE_DEFINITION &&
      ROOT_OPERATION_NAMES.has(def.name.value) &&
      def.fields?.some(field => hasDirective(field, 'cypher'))
    ) {
      modelTypeNames.add(def.name.value);
    }
  }
  // Author enums / scalars / unions referenced by model fields must survive re-augment.
  const referenced = new Set<string>();
  for (const def of typeDefs.definitions) {
    if (
      (def.kind === Kind.OBJECT_TYPE_DEFINITION || def.kind === Kind.INTERFACE_TYPE_DEFINITION) &&
      modelTypeNames.has(def.name.value)
    ) {
      for (const field of def.fields || []) {
        const name = namedTypeNameFromTypeNode(field.type);
        if (name) {
          referenced.add(name);
        }
      }
    }
  }
  return {
    ...typeDefs,
    definitions: typeDefs.definitions.filter(def => {
      switch (def.kind) {
        case Kind.OBJECT_TYPE_DEFINITION:
        case Kind.INTERFACE_TYPE_DEFINITION:
          return modelTypeNames.has(def.name.value);
        case Kind.ENUM_TYPE_DEFINITION:
        case Kind.SCALAR_TYPE_DEFINITION:
        case Kind.UNION_TYPE_DEFINITION:
          return hasDirective(def, 'introspection') || referenced.has(def.name.value);
        case Kind.INPUT_OBJECT_TYPE_DEFINITION:
          // Filter/create inputs are regenerated by Neo4jGraphQL.
          return hasDirective(def, 'introspection');
        case Kind.DIRECTIVE_DEFINITION:
          return !STRIP_DIRECTIVE_DEFINITIONS.has(def.name.value);
        case Kind.SCHEMA_DEFINITION:
        case Kind.SCHEMA_EXTENSION:
          return true;
        default:
          return true;
      }
    }),
  };
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
  typeDefs = extractNeo4jModelTypeDefs(typeDefs);
  typeDefs = stripMeshTransportFromTypeDefs(typeDefs);
  (typeDefs.definitions as DefinitionNode[]).push(...getNeo4jDirectiveDefinitions());
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
