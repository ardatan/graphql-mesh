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

/**
 * Runtime options for {@link getNeo4JExecutor}.
 *
 * Mesh’s Neo4j transport entry calls this with the composed subgraph schema plus
 * gateway `pubsub` / `log`. Endpoint, database, and auth are read from the schema’s
 * `@transport(kind: "neo4j", …)` extension (written by the Neo4j loader).
 *
 * @example
 * ```ts
 * const executor = await getNeo4JExecutor({
 *   schema: moviesSubgraphSchema,
 *   pubsub,
 *   log,
 * })
 * ```
 */
export interface Neo4JExecutorOpts {
  /**
   * Composed Neo4j subgraph schema that carries `@transport` (location, database, auth)
   * and Neo4j model directives (`@node`, `@relationship`, `@cypher`, …).
   */
  schema: GraphQLSchema;
  /**
   * Optional shared driver. When omitted, a driver is created from `@transport` location/auth
   * and closed when the executor is disposed.
   *
   * @example driverFromPool
   */
  driver?: Driver;
  /**
   * Mesh PubSub used to wire Neo4j GraphQL subscriptions (CDC / reactive features).
   * Omit when the gateway does not need Neo4j subscriptions.
   */
  pubsub?: PubSub;
  /**
   * Optional logger for driver construction and transport diagnostics.
   */
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

  const unionNames = new Set<string>();
  for (const def of typeDefs.definitions) {
    if (def.kind === Kind.UNION_TYPE_DEFINITION) {
      unionNames.add(def.name.value);
    }
  }

  /** Spatial object types Neo4j regenerates from retained model attributes. */
  const NEO4J_REGENERATED_OBJECT_TYPES = new Set(['Point', 'CartesianPoint']);

  function objectTypeFieldNameSet(typeName: string): Set<string> | undefined {
    const def = typeDefs.definitions.find(
      d => d.kind === Kind.OBJECT_TYPE_DEFINITION && d.name.value === typeName,
    );
    if (!def || def.kind !== Kind.OBJECT_TYPE_DEFINITION) {
      return undefined;
    }
    return new Set((def.fields || []).map(field => field.name.value));
  }

  /**
   * Generated connection / aggregate object fields Neo4j re-augments from relationships.
   * Suffix alone is not enough — authored `totalAggregate: Int` and `totalAggregate: Totals`
   * must stay; drop only relationship-originated siblings or Neo4j Connection/Aggregate shapes.
   */
  function isGeneratedConnectionOrAggregateField(
    field: FieldDefinitionNode,
    siblingFields?: readonly FieldDefinitionNode[],
  ): boolean {
    // Authored `@cypher` / `@relationship` fields are never Neo4j-generated connections.
    if (hasDirective(field, 'cypher') || hasDirective(field, 'relationship')) {
      return false;
    }
    const returnName = namedTypeNameFromTypeNode(field.type);
    if (!returnName) {
      return false;
    }
    // Scalars / enums / inputs are never generated Connection/Aggregate objects.
    if (!objectOrInterfaceNames.has(returnName) && !unionNames.has(returnName)) {
      return false;
    }
    const fieldName = field.name.value;
    const connectionBase = fieldName.endsWith('Connection')
      ? fieldName.slice(0, -'Connection'.length)
      : undefined;
    const aggregateBase = fieldName.endsWith('Aggregate')
      ? fieldName.slice(0, -'Aggregate'.length)
      : undefined;
    const base = connectionBase || aggregateBase;
    // Relationship origin: `actors` @relationship → generated `actorsConnection` / `actorsAggregate`.
    if (
      base &&
      siblingFields?.some(
        sibling => sibling.name.value === base && hasDirective(sibling, 'relationship'),
      )
    ) {
      return true;
    }
    const returnFields = objectTypeFieldNameSet(returnName);
    if (!returnFields) {
      return false;
    }
    // Neo4j Connection objects expose `edges` (plus pageInfo / totalCount when fully augmented).
    if ((connectionBase || returnName.endsWith('Connection')) && returnFields.has('edges')) {
      return true;
    }
    // Neo4j Aggregate objects expose `count` with `node` and/or `edge` selections.
    if (
      (aggregateBase || returnName.endsWith('Aggregate')) &&
      returnFields.has('count') &&
      (returnFields.has('node') || returnFields.has('edge'))
    ) {
      return true;
    }
    return false;
  }

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
  // Only walk owned, non-generated fields so foreign unions / connection edges are not kept.
  const authoredOutputReferrers = new Map<string, string[]>();
  /** Types added directly as `@cypher` return types (throw if empty); nested types are dropped. */
  const directCypherReturnTypes = new Set<string>(authoredOutputTypeNames);
  for (const [typeName, fields] of retainedFieldsByType) {
    for (const field of fields) {
      if (!hasDirective(field, 'cypher')) {
        continue;
      }
      const returnName = namedTypeNameFromTypeNode(field.type);
      if (!returnName || !authoredOutputTypeNames.has(returnName)) {
        continue;
      }
      const refs = authoredOutputReferrers.get(returnName) || [];
      refs.push(`${typeName}.${field.name.value}`);
      authoredOutputReferrers.set(returnName, refs);
    }
  }
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
        if (!fieldOwnedByThisSubgraph(field, subgraphName)) {
          continue;
        }
        // Unstamped generated connections on authored outputs must not pull foreign edge/node types.
        if (isGeneratedConnectionOrAggregateField(field, def.fields)) {
          continue;
        }
        collectNamedTypesFromField(field, referenced, { includeArgs: true });
        const nested = namedTypeNameFromTypeNode(field.type);
        if (!nested) {
          continue;
        }
        if (NEO4J_REGENERATED_OBJECT_TYPES.has(nested)) {
          // Spatial types: keep a reference; emission decides regenerate vs retain definition.
          continue;
        }
        if (
          objectOrInterfaceNames.has(nested) &&
          !keepTypeNames.has(nested) &&
          !authoredOutputTypeNames.has(nested)
        ) {
          authoredOutputTypeNames.add(nested);
          const refs = authoredOutputReferrers.get(nested) || [];
          refs.push(`${def.name.value}.${field.name.value}`);
          authoredOutputReferrers.set(nested, refs);
          authoredGrew = true;
        }
      }
    }
  }

  function retainedModelHasSpatialField(spatialName: string): boolean {
    // Neo4j regenerates Point/CartesianPoint from model / relationship attributes, not root
    // operation `@cypher` fields (e.g. `Query.pin: Point` alone does not regenerate Point).
    for (const [typeName, fields] of retainedFieldsByType) {
      if (ROOT_OPERATION_NAMES.has(typeName)) {
        continue;
      }
      for (const field of fields) {
        if (namedTypeNameFromTypeNode(field.type) === spatialName) {
          return true;
        }
      }
    }
    return false;
  }

  function authoredOutputOwnedFields(typeName: string): readonly FieldDefinitionNode[] | undefined {
    const def = typeDefs.definitions.find(
      d =>
        (d.kind === Kind.OBJECT_TYPE_DEFINITION || d.kind === Kind.INTERFACE_TYPE_DEFINITION) &&
        d.name.value === typeName,
    );
    if (
      !def ||
      (def.kind !== Kind.OBJECT_TYPE_DEFINITION && def.kind !== Kind.INTERFACE_TYPE_DEFINITION)
    ) {
      return undefined;
    }
    const siblings = def.fields || [];
    return siblings.filter(
      field =>
        fieldOwnedByThisSubgraph(field, subgraphName) &&
        !isGeneratedConnectionOrAggregateField(field, siblings),
    );
  }

  /**
   * Whether a named type will be available after extract (definition emitted or Neo4j-regenerated).
   * Spatial types stay available when referenced even if a retained model regenerates them
   * (so authored `Person.location: Point` is kept while the Point def may be omitted).
   */
  function typeAvailableInExtract(name: string): boolean {
    if (keepTypeNames.has(name) || authoredOutputTypeNames.has(name)) {
      return true;
    }
    if (NEO4J_REGENERATED_OBJECT_TYPES.has(name)) {
      return referenced.has(name);
    }
    if (unionNames.has(name) && referenced.has(name)) {
      const def = typeDefs.definitions.find(
        d => d.kind === Kind.UNION_TYPE_DEFINITION && d.name.value === name,
      );
      if (def && def.kind === Kind.UNION_TYPE_DEFINITION) {
        return (def.types || []).some(member => typeAvailableInExtract(member.name.value));
      }
    }
    return false;
  }

  function survivingAuthoredFields(typeName: string): FieldDefinitionNode[] {
    return (authoredOutputOwnedFields(typeName) || []).filter(field => {
      const nested = namedTypeNameFromTypeNode(field.type);
      if (!nested) {
        return true;
      }
      if (
        objectOrInterfaceNames.has(nested) ||
        unionNames.has(nested) ||
        NEO4J_REGENERATED_OBJECT_TYPES.has(nested)
      ) {
        return typeAvailableInExtract(nested);
      }
      return true;
    });
  }

  // Iteratively drop nested authored types that would emit empty after nested availability.
  let prunedAuthored = true;
  while (prunedAuthored) {
    prunedAuthored = false;
    for (const name of [...authoredOutputTypeNames]) {
      if (directCypherReturnTypes.has(name)) {
        continue;
      }
      if (survivingAuthoredFields(name).length === 0) {
        authoredOutputTypeNames.delete(name);
        prunedAuthored = true;
      }
    }
  }

  // Unions collected while walking pruned paths must not stay in `referenced` — otherwise
  // emission throws on memberless foreign unions even when surviving fields (e.g. Stats.count) are fine.
  for (const unionName of unionNames) {
    if (!referenced.has(unionName)) {
      continue;
    }
    let stillUsed = false;
    for (const fields of retainedFieldsByType.values()) {
      if (stillUsed) {
        break;
      }
      for (const field of fields) {
        if (namedTypeNameFromTypeNode(field.type) === unionName) {
          stillUsed = true;
          break;
        }
      }
    }
    if (!stillUsed) {
      for (const outName of authoredOutputTypeNames) {
        if (
          survivingAuthoredFields(outName).some(
            field => namedTypeNameFromTypeNode(field.type) === unionName,
          )
        ) {
          stillUsed = true;
          break;
        }
      }
    }
    if (!stillUsed) {
      referenced.delete(unionName);
    }
  }

  function interfaceHasSurvivingFields(ifaceName: string): boolean {
    if (keepTypeNames.has(ifaceName)) {
      return (retainedFieldsByType.get(ifaceName) || []).length > 0;
    }
    if (authoredOutputTypeNames.has(ifaceName)) {
      return survivingAuthoredFields(ifaceName).length > 0;
    }
    return false;
  }

  function findInterfaceReferrer(ifaceName: string): string {
    for (const [typeName, fields] of retainedFieldsByType) {
      for (const field of fields) {
        if (namedTypeNameFromTypeNode(field.type) === ifaceName) {
          return `${typeName}.${field.name.value}`;
        }
      }
    }
    for (const outName of authoredOutputTypeNames) {
      for (const field of survivingAuthoredFields(outName)) {
        if (namedTypeNameFromTypeNode(field.type) === ifaceName) {
          return `${outName}.${field.name.value}`;
        }
      }
    }
    return 'unknown field';
  }

  function typeEmittedInExtract(name: string): boolean {
    if (keepTypeNames.has(name) || authoredOutputTypeNames.has(name)) {
      return true;
    }
    // Emit Point/CartesianPoint defs only when referenced and no retained model regenerates them.
    if (NEO4J_REGENERATED_OBJECT_TYPES.has(name)) {
      return referenced.has(name) && !retainedModelHasSpatialField(name);
    }
    if (unionNames.has(name) && referenced.has(name)) {
      return typeAvailableInExtract(name);
    }
    return false;
  }

  function findUnionReferrer(unionName: string): string {
    for (const [typeName, fields] of retainedFieldsByType) {
      for (const field of fields) {
        if (namedTypeNameFromTypeNode(field.type) === unionName) {
          return `${typeName}.${field.name.value}`;
        }
      }
    }
    for (const outName of authoredOutputTypeNames) {
      for (const field of authoredOutputOwnedFields(outName) || []) {
        if (namedTypeNameFromTypeNode(field.type) === unionName) {
          return `${outName}.${field.name.value}`;
        }
      }
    }
    return 'unknown field';
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
          if (NEO4J_REGENERATED_OBJECT_TYPES.has(def.name.value)) {
            // Neo4j regenerates Point from retained model attributes; keep the definition
            // only when authored outputs need it and no retained model can regenerate it.
            if (referenced.has(def.name.value) && !retainedModelHasSpatialField(def.name.value)) {
              return [def];
            }
            return [];
          }
          if (authoredOutputTypeNames.has(def.name.value) && !keepTypeNames.has(def.name.value)) {
            // Foreign `@node` / `@relationshipProperties` must not augment as this transport's model.
            let authored = isForeignOwnedModelType(def, subgraphName)
              ? stripForeignModelOwnershipDirectives(def)
              : def;
            const siblings = authored.fields || [];
            const authoredFields = siblings.filter(field => {
              if (!fieldOwnedByThisSubgraph(field, subgraphName)) {
                return false;
              }
              if (isGeneratedConnectionOrAggregateField(field, siblings)) {
                return false;
              }
              const nested = namedTypeNameFromTypeNode(field.type);
              if (
                nested &&
                (objectOrInterfaceNames.has(nested) ||
                  unionNames.has(nested) ||
                  NEO4J_REGENERATED_OBJECT_TYPES.has(nested)) &&
                !typeAvailableInExtract(nested)
              ) {
                return false;
              }
              return true;
            });
            if (!authoredFields.length) {
              if (def.kind === Kind.INTERFACE_TYPE_DEFINITION) {
                if (referenced.has(def.name.value)) {
                  throw new Error(
                    `Neo4j model extract: interface "${def.name.value}" has no surviving fields (referenced from ${findInterfaceReferrer(def.name.value)})`,
                  );
                }
                return [];
              }
              if (directCypherReturnTypes.has(def.name.value)) {
                const refs =
                  authoredOutputReferrers.get(def.name.value)?.join(', ') || 'unknown field';
                throw new Error(
                  `Neo4j model extract: Cypher return type "${def.name.value}" has no fields owned by subgraph "${subgraphName ?? ''}" (referenced from ${refs})`,
                );
              }
              // Nested type reached only via dropped paths — omit rather than abort the transport.
              return [];
            }
            if (authoredFields.length !== siblings.length) {
              authored = { ...authored, fields: authoredFields };
            }
            // Interface conformance against the *projected* interface fields extraction emits.
            // Drop empty interface edges; keep nonempty conformance checks.
            if (authored.kind === Kind.OBJECT_TYPE_DEFINITION && authored.interfaces?.length) {
              const projected = new Set(authoredFields.map(field => field.name.value));
              const nextInterfaces = [];
              for (const iface of authored.interfaces) {
                const ifaceName = iface.name.value;
                if (!keepTypeNames.has(ifaceName) && !authoredOutputTypeNames.has(ifaceName)) {
                  continue;
                }
                if (!interfaceHasSurvivingFields(ifaceName)) {
                  continue;
                }
                const projectedIfaceFields = keepTypeNames.has(ifaceName)
                  ? retainedFieldsByType.get(ifaceName) || []
                  : survivingAuthoredFields(ifaceName);
                const requiredNames = projectedIfaceFields.map(field => field.name.value);
                const missing = requiredNames.filter(name => !projected.has(name));
                if (missing.length) {
                  const refs =
                    authoredOutputReferrers.get(def.name.value)?.join(', ') || 'unknown field';
                  throw new Error(
                    `Neo4j model extract: Cypher return type "${def.name.value}" cannot implement "${ifaceName}" after ownership filtering (missing ${missing.join(', ')}; referenced from ${refs})`,
                  );
                }
                nextInterfaces.push(iface);
              }
              if (nextInterfaces.length !== authored.interfaces.length) {
                authored = { ...authored, interfaces: nextInterfaces };
              }
            }
            return [authored];
          }
          if (!keepTypeNames.has(def.name.value)) {
            return [];
          }
          const fields = retainedFieldsByType.get(def.name.value) || [];
          if (def.kind === Kind.INTERFACE_TYPE_DEFINITION && !fields.length) {
            if (referenced.has(def.name.value)) {
              throw new Error(
                `Neo4j model extract: interface "${def.name.value}" has no surviving fields (referenced from ${findInterfaceReferrer(def.name.value)})`,
              );
            }
            return [];
          }
          if (
            def.kind === Kind.OBJECT_TYPE_DEFINITION &&
            ROOT_OPERATION_NAMES.has(def.name.value)
          ) {
            if (!fields.length) {
              return [];
            }
            return [{ ...(def as ObjectTypeDefinitionNode), fields: [...fields] }];
          }
          if (def.kind === Kind.OBJECT_TYPE_DEFINITION && def.interfaces?.length) {
            const nextInterfaces = def.interfaces.filter(iface =>
              interfaceHasSurvivingFields(iface.name.value),
            );
            if (nextInterfaces.length !== def.interfaces.length) {
              return [{ ...def, fields: [...fields], interfaces: nextInterfaces }];
            }
          }
          return [{ ...def, fields: [...fields] } as typeof def];
        }
        case Kind.ENUM_TYPE_DEFINITION:
        case Kind.SCALAR_TYPE_DEFINITION:
          return referenced.has(def.name.value) ? [def] : [];
        case Kind.UNION_TYPE_DEFINITION: {
          if (!referenced.has(def.name.value)) {
            return [];
          }
          const members = (def.types || []).filter(member =>
            typeEmittedInExtract(member.name.value),
          );
          if (!members.length) {
            throw new Error(
              `Neo4j model extract: union "${def.name.value}" has no retained members (referenced from ${findUnionReferrer(def.name.value)})`,
            );
          }
          if (members.length === (def.types || []).length) {
            return [def];
          }
          return [{ ...def, types: members }];
        }
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

/**
 * Create a disposable Neo4j subgraph executor for Mesh.
 *
 * Extracts Neo4j model SDL for this transport’s subgraph, rebuilds an executable
 * schema with `@neo4j/graphql`, and runs operations with `sessionConfig.database`
 * from `@transport.options`.
 *
 * @param opts - {@link Neo4JExecutorOpts}
 */
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

/**
 * Options for building an executable schema via `@neo4j/graphql` from SDL + a driver.
 * Used by the Neo4j loader (compose time) and {@link getNeo4JExecutor} (runtime rebuild).
 *
 * @example
 * ```ts
 * const schema = await getExecutableSchemaFromTypeDefsAndDriver({
 *   driver,
 *   pubsub,
 *   typeDefs: 'type Movie @node { title: String! }',
 * })
 * ```
 */
export interface GetExecutableSchemaFromTypeDefs {
  /**
   * Connected Neo4j driver passed to `Neo4jGraphQL`.
   */
  driver: Driver;
  /**
   * When set, enables Neo4j GraphQL subscription features backed by Mesh PubSub.
   */
  pubsub?: PubSub;
  /**
   * Neo4j GraphQL type definitions (string or DocumentNode). Mesh `@transport` / subgraph
   * args are stripped before Neo4j validates the SDL.
   *
   * @example 'type Movie @node { title: String! }'
   */
  typeDefs?: string | DocumentNode;
}

/**
 * Build an executable GraphQL schema with `@neo4j/graphql` from typeDefs and a driver.
 */
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
