import type {
  ConstDirectiveNode,
  DefinitionNode,
  DocumentNode,
  FieldDefinitionNode,
  GraphQLSchema,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { extendSchema, Kind, parse, visit } from 'graphql';
import type { Driver } from 'neo4j-driver';
import { type Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';
import { createDefaultExecutor, type DisposableExecutor } from '@graphql-mesh/transport-common';
import { asArray, getDirectiveExtensions, getDocumentNodeFromSchema } from '@graphql-tools/utils';
import { Neo4jGraphQL } from '@neo4j/graphql';
import { DisposableSymbols } from '@whatwg-node/disposablestack';
import {
  getDirectiveSubgraph,
  getNeo4jDirectiveDefinitions,
  NEO4J_SUBGRAPH_DIRECTIVES,
  stripSubgraphArgsFromNeo4jDirectives,
} from './directives.js';
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

function belongsToSubgraph(
  node: { directives?: readonly ConstDirectiveNode[] },
  directiveName: string,
  subgraphName: string | undefined,
): boolean {
  if (!hasDirective(node, directiveName)) {
    return false;
  }
  const stamped = getDirectiveSubgraph(node, directiveName);
  // Missing subgraph arg: single-source author SDL; include for this transport.
  if (stamped == null) {
    return true;
  }
  if (subgraphName == null) {
    return true;
  }
  return stamped === subgraphName;
}

function isNeo4jModelType(
  node: { directives?: readonly ConstDirectiveNode[] },
  subgraphName: string | undefined,
): boolean {
  return (
    belongsToSubgraph(node, 'node', subgraphName) ||
    belongsToSubgraph(node, 'relationshipProperties', subgraphName)
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
  'introspection',
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
    Directive(node) {
      if (
        STRIP_SCHEMA_DIRECTIVES.has(node.name.value) ||
        STRIP_DIRECTIVE_DEFINITIONS.has(node.name.value)
      ) {
        return null;
      }
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

const ROOT_OPERATION_NAMES = new Set(['Query', 'Mutation', 'Subscription']);

function fieldBelongsToSubgraph(
  field: FieldDefinitionNode,
  subgraphName: string | undefined,
): boolean {
  for (const name of NEO4J_SUBGRAPH_DIRECTIVES) {
    if (belongsToSubgraph(field, name, subgraphName)) {
      return true;
    }
  }
  return false;
}

/**
 * Keep unstamped fields and fields stamped for this subgraph; drop fields whose
 * Neo4j directive `subgraph:` names another source.
 */
function fieldOwnedByThisSubgraph(
  field: FieldDefinitionNode,
  subgraphName: string | undefined,
): boolean {
  for (const name of NEO4J_SUBGRAPH_DIRECTIVES) {
    if (!hasDirective(field, name)) {
      continue;
    }
    const stamped = getDirectiveSubgraph(field, name);
    if (stamped != null && subgraphName != null && stamped !== subgraphName) {
      return false;
    }
  }
  return true;
}

function isForeignOwnedModelType(
  node: { directives?: readonly ConstDirectiveNode[] },
  subgraphName: string | undefined,
): boolean {
  for (const directiveName of ['node', 'relationshipProperties'] as const) {
    if (!hasDirective(node, directiveName)) {
      continue;
    }
    const stamped = getDirectiveSubgraph(node, directiveName);
    if (stamped != null && subgraphName != null && stamped !== subgraphName) {
      return true;
    }
  }
  return false;
}

function stripForeignModelOwnershipDirectives<
  T extends { directives?: readonly ConstDirectiveNode[] },
>(node: T): T {
  if (!node.directives?.length) {
    return node;
  }
  const directives = node.directives.filter(
    directive =>
      directive.name.value !== 'node' && directive.name.value !== 'relationshipProperties',
  );
  if (directives.length === node.directives.length) {
    return node;
  }
  return { ...node, directives };
}

function collectInterfaceClosure(
  typeName: string,
  interfaceImplements: Map<string, string[]>,
  into: Set<string>,
): void {
  for (const iface of interfaceImplements.get(typeName) || []) {
    if (into.has(iface)) {
      continue;
    }
    into.add(iface);
    collectInterfaceClosure(iface, interfaceImplements, into);
  }
}

function collectNamedTypesFromField(
  field: FieldDefinitionNode,
  into: Set<string>,
  opts?: { includeArgs?: boolean },
): void {
  const returnName = namedTypeNameFromTypeNode(field.type);
  if (returnName) {
    into.add(returnName);
  }
  if (opts?.includeArgs === false) {
    return;
  }
  for (const arg of field.arguments || []) {
    const argName = namedTypeNameFromTypeNode(arg.type);
    if (argName) {
      into.add(argName);
    }
  }
}

/**
 * Keep Neo4j author/model types for re-augmentation.
 * Uses `@node` / `@relationshipProperties` / root `@cypher`, scoped by Mesh `subgraph:`
 * when multiple Neo4j sources are composed. Does not use Mesh `@introspection`.
 *
 * Drops generated connection fields / filter args that reference types omitted from the
 * rebuild, while retaining authored properties, relationships, `@cypher` fields, and
 * interfaces required by selected models (including transitive implements).
 */
export function extractNeo4jModelTypeDefs(
  typeDefs: DocumentNode,
  subgraphName?: string,
): DocumentNode {
  const modelTypeNames = new Set<string>();
  const interfaceImplements = new Map<string, string[]>();
  const objectOrInterfaceNames = new Set<string>();
  const inputObjectNames = new Set<string>();

  for (const def of typeDefs.definitions) {
    if (def.kind === Kind.OBJECT_TYPE_DEFINITION || def.kind === Kind.INTERFACE_TYPE_DEFINITION) {
      objectOrInterfaceNames.add(def.name.value);
      if (def.interfaces?.length) {
        interfaceImplements.set(
          def.name.value,
          def.interfaces.map(iface => iface.name.value),
        );
      }
      if (isNeo4jModelType(def, subgraphName)) {
        modelTypeNames.add(def.name.value);
      }
    }
    if (
      def.kind === Kind.OBJECT_TYPE_DEFINITION &&
      ROOT_OPERATION_NAMES.has(def.name.value) &&
      def.fields?.some(field => belongsToSubgraph(field, 'cypher', subgraphName))
    ) {
      modelTypeNames.add(def.name.value);
    }
    if (def.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) {
      inputObjectNames.add(def.name.value);
    }
  }

  const keepTypeNames = new Set(modelTypeNames);
  for (const modelName of modelTypeNames) {
    collectInterfaceClosure(modelName, interfaceImplements, keepTypeNames);
  }

  /** Spatial object types Neo4j regenerates from retained attributes. */
  const NEO4J_REGENERATED_OBJECT_TYPES = new Set(['Point', 'CartesianPoint']);

  function isRetainedModelField(field: FieldDefinitionNode): boolean {
    // Authored `@cypher` may return non-`@node` object types (e.g. `Stats`); keep the field.
    if (hasDirective(field, 'cypher')) {
      return true;
    }
    if (hasDirective(field, 'relationship')) {
      const returnName = namedTypeNameFromTypeNode(field.type);
      if (!returnName) {
        return true;
      }
      if (objectOrInterfaceNames.has(returnName)) {
        return keepTypeNames.has(returnName);
      }
      return true;
    }
    const returnName = namedTypeNameFromTypeNode(field.type);
    if (!returnName) {
      return true;
    }
    if (NEO4J_REGENERATED_OBJECT_TYPES.has(returnName)) {
      return true;
    }
    // Drop generated connection / aggregate object fields not in the model set.
    if (objectOrInterfaceNames.has(returnName) && !keepTypeNames.has(returnName)) {
      return false;
    }
    return true;
  }

  function scrubGeneratedArgs(field: FieldDefinitionNode): FieldDefinitionNode {
    if (!field.arguments?.length) {
      return field;
    }
    // Relationship filter/pagination args are regenerated; keep authored `@cypher` args.
    if (hasDirective(field, 'relationship')) {
      return { ...field, arguments: [] };
    }
    if (!hasDirective(field, 'cypher')) {
      // Property fields: drop args that point at input objects we will not keep unless referenced.
      const arguments_ = field.arguments.filter(arg => {
        const argType = namedTypeNameFromTypeNode(arg.type);
        if (!argType || !inputObjectNames.has(argType)) {
          return true;
        }
        return false;
      });
      return arguments_.length === field.arguments.length
        ? field
        : { ...field, arguments: arguments_ };
    }
    return field;
  }

  const referenced = new Set<string>();
  const retainedFieldsByType = new Map<string, readonly FieldDefinitionNode[]>();
  /** Non-`@node` object/interface outputs reachable from retained `@cypher` fields. */
  const authoredOutputTypeNames = new Set<string>();

  for (const def of typeDefs.definitions) {
    if (
      (def.kind === Kind.OBJECT_TYPE_DEFINITION || def.kind === Kind.INTERFACE_TYPE_DEFINITION) &&
      keepTypeNames.has(def.name.value)
    ) {
      const sourceFields =
        ROOT_OPERATION_NAMES.has(def.name.value) && def.kind === Kind.OBJECT_TYPE_DEFINITION
          ? def.fields?.filter(field => fieldBelongsToSubgraph(field, subgraphName))
          : def.fields?.filter(field => fieldOwnedByThisSubgraph(field, subgraphName));
      const fields: FieldDefinitionNode[] = (sourceFields || [])
        .filter(isRetainedModelField)
        .map(scrubGeneratedArgs);
      retainedFieldsByType.set(def.name.value, fields);
      for (const field of fields) {
        collectNamedTypesFromField(field, referenced, {
          includeArgs: hasDirective(field, 'cypher') || !hasDirective(field, 'relationship'),
        });
        if (hasDirective(field, 'cypher')) {
          const returnName = namedTypeNameFromTypeNode(field.type);
          if (
            returnName &&
            objectOrInterfaceNames.has(returnName) &&
            !keepTypeNames.has(returnName) &&
            !NEO4J_REGENERATED_OBJECT_TYPES.has(returnName)
          ) {
            authoredOutputTypeNames.add(returnName);
          }
        }
      }
    }
  }

  // Expand authored cypher output object graphs (fields → nested objects/enums/inputs).
  let authoredGrew = true;
  while (authoredGrew) {
    authoredGrew = false;
    for (const def of typeDefs.definitions) {
      if (
        (def.kind !== Kind.OBJECT_TYPE_DEFINITION && def.kind !== Kind.INTERFACE_TYPE_DEFINITION) ||
        !authoredOutputTypeNames.has(def.name.value)
      ) {
        continue;
      }
      for (const field of def.fields || []) {
        collectNamedTypesFromField(field, referenced, { includeArgs: true });
        const nested = namedTypeNameFromTypeNode(field.type);
        if (!nested) {
          continue;
        }
        if (
          objectOrInterfaceNames.has(nested) &&
          !keepTypeNames.has(nested) &&
          !NEO4J_REGENERATED_OBJECT_TYPES.has(nested) &&
          !authoredOutputTypeNames.has(nested)
        ) {
          authoredOutputTypeNames.add(nested);
          authoredGrew = true;
        }
      }
    }
  }

  // Authored inputs / enums / scalars reachable from retained fields (incl. `@cypher` args).
  // Generated filter inputs are typically only reachable from scrubbed relationship args.
  const keepInputs = new Set<string>();
  for (const name of referenced) {
    if (inputObjectNames.has(name)) {
      keepInputs.add(name);
    }
  }
  // Nested fields of retained authored inputs.
  let inputGrew = true;
  while (inputGrew) {
    inputGrew = false;
    for (const def of typeDefs.definitions) {
      if (def.kind !== Kind.INPUT_OBJECT_TYPE_DEFINITION || !keepInputs.has(def.name.value)) {
        continue;
      }
      for (const field of def.fields || []) {
        const nested = namedTypeNameFromTypeNode(field.type);
        if (!nested) {
          continue;
        }
        referenced.add(nested);
        if (inputObjectNames.has(nested) && !keepInputs.has(nested)) {
          keepInputs.add(nested);
          inputGrew = true;
        }
      }
    }
  }

  return {
    ...typeDefs,
    definitions: typeDefs.definitions.flatMap((def): DefinitionNode[] => {
      switch (def.kind) {
        case Kind.OBJECT_TYPE_DEFINITION:
        case Kind.INTERFACE_TYPE_DEFINITION: {
          if (authoredOutputTypeNames.has(def.name.value) && !keepTypeNames.has(def.name.value)) {
            // Foreign `@node` / `@relationshipProperties` must not augment as this transport's model.
            let authored = isForeignOwnedModelType(def, subgraphName)
              ? stripForeignModelOwnershipDirectives(def)
              : def;
            const authoredFields = (authored.fields || []).filter(field =>
              fieldOwnedByThisSubgraph(field, subgraphName),
            );
            if (authoredFields.length !== (authored.fields || []).length) {
              authored = { ...authored, fields: authoredFields };
            }
            return [authored];
          }
          if (!keepTypeNames.has(def.name.value)) {
            return [];
          }
          const fields = retainedFieldsByType.get(def.name.value) || [];
          if (
            def.kind === Kind.OBJECT_TYPE_DEFINITION &&
            ROOT_OPERATION_NAMES.has(def.name.value)
          ) {
            if (!fields.length) {
              return [];
            }
            return [{ ...(def as ObjectTypeDefinitionNode), fields: [...fields] }];
          }
          return [{ ...def, fields: [...fields] } as typeof def];
        }
        case Kind.ENUM_TYPE_DEFINITION:
        case Kind.SCALAR_TYPE_DEFINITION:
        case Kind.UNION_TYPE_DEFINITION:
          return referenced.has(def.name.value) ? [def] : [];
        case Kind.INPUT_OBJECT_TYPE_DEFINITION:
          return keepInputs.has(def.name.value) ? [def] : [];
        case Kind.DIRECTIVE_DEFINITION:
          return STRIP_DIRECTIVE_DEFINITIONS.has(def.name.value) ? [] : [def];
        case Kind.SCHEMA_DEFINITION:
        case Kind.SCHEMA_EXTENSION:
          return [def];
        default:
          return [def];
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
            subgraph: String
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
    subgraph: transportSubgraph,
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
  typeDefs = extractNeo4jModelTypeDefs(typeDefs, transportSubgraph);
  typeDefs = stripMeshTransportFromTypeDefs(typeDefs);
  typeDefs = stripSubgraphArgsFromNeo4jDirectives(typeDefs);
  (typeDefs.definitions as DefinitionNode[]).push(...getNeo4jDirectiveDefinitions());
  typeDefs = stripSubgraphArgsFromNeo4jDirectives(typeDefs);
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
  const extendedTypeDefs = asArray(typeDefs).map(defs => {
    if (typeof defs === 'string') {
      return defs;
    }
    return stripSubgraphArgsFromNeo4jDirectives(stripMeshTransportFromTypeDefs(defs));
  });
  const neo4jGraphQL = new Neo4jGraphQL({
    typeDefs: extendedTypeDefs,
    driver,
    validate: false,
    debug: !!globalThis.process?.env?.DEBUG,
    features,
  });

  return neo4jGraphQL.getSchema();
}
