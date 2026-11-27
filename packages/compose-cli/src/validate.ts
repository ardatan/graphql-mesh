import {
  buildSchema,
  GraphQLError,
  isEnumType,
  isInterfaceType,
  isObjectType,
  type ASTNode,
  type FieldDefinitionNode,
  type GraphQLField,
  type GraphQLInterfaceType,
  type GraphQLObjectType,
} from 'graphql';
import {
  suggestionList,
  validateFederationLookupDirectives,
} from '@graphql-mesh/fusion-composition';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import type { ServiceDefinition } from '@theguild/federation-composition';

export class FatalCompositionError extends Error {
  constructor(message: string) {
    super(`Fatal composition error: ${message}`);
    this.name = 'FatalCompositionError';
    Error.captureStackTrace(this, this.constructor);
  }
}

type MergeLike = {
  subgraph?: string;
  /** join__Graph enum values when carried as `@join__directive(graphs:)` */
  graphs?: string[];
  keyField?: string;
  keyArg?: string;
  key?: string[];
  argsExpr?: string;
};

type ResolveToLike = {
  sourceName?: string;
  sourceTypeName?: string;
  sourceFieldName?: string;
  sourceArgs?: Record<string, unknown>;
  /** PubSub / webhook subscription wiring - no subgraph sourceName required. */
  pubsubTopic?: string;
};

/**
 * Compose-time DX checks so bad `@merge` / `@resolveTo` fail before Gateway
 * runtime. Understands both native Mesh apps and finalized
 * `@join__directive(name: "merge")` (graphs: owns subgraph).
 */
export function validateSupergraphSdl(supergraphSdl: string, subgraphs: ServiceDefinition[]) {
  const schema = buildSchema(supergraphSdl, {
    assumeValid: true,
    assumeValidSDL: true,
    noLocation: true,
  });
  const graphEnumToName = readJoinGraphEnumToName(schema);
  const errors: GraphQLError[] = [];
  // Federation Spec draft `@lookup` / `@is` / `@internal` when still native on the SG.
  // Join-rewritten apps are validated earlier on annotated subgraphs during compose.
  // Gate on the parsed schema (not raw SDL) so whitespace variants like `@ is` still run.
  if (schemaHasFederationLookupDirectives(schema)) {
    errors.push(...validateFederationLookupDirectives(schema));
  }
  const typeMap = schema.getTypeMap();
  for (const typeName in typeMap) {
    const type = typeMap[typeName];
    if (!type || typeName.startsWith('__')) {
      continue;
    }

    const typeDirectives = getDirectiveExtensions(type, schema);
    validateMergeDirectives({
      errors,
      locationLabel: `type ${typeName}`,
      mergeDirectives: collectMergeLike(typeDirectives),
      subgraphs,
      graphEnumToName,
      astNode: type.astNode,
    });
    validateResolveToDirectives({
      errors,
      locationLabel: `type ${typeName}`,
      resolveToDirectives: collectResolveToLike(typeDirectives),
      subgraphs,
      astNode: type.astNode,
    });

    if (!isObjectType(type) && !isInterfaceType(type)) {
      continue;
    }

    const fields = (type as GraphQLObjectType | GraphQLInterfaceType).getFields();
    for (const fieldName in fields) {
      const field = fields[fieldName] as GraphQLField<unknown, unknown>;
      const fieldDirectives = getDirectiveExtensions(field, schema);
      validateMergeDirectives({
        errors,
        locationLabel: `field ${typeName}.${fieldName}`,
        mergeDirectives: collectMergeLike(fieldDirectives),
        subgraphs,
        graphEnumToName,
        astNode: field.astNode,
        field,
        fieldTypeName: typeName,
      });
      validateResolveToDirectives({
        errors,
        locationLabel: `field ${typeName}.${fieldName}`,
        resolveToDirectives: collectResolveToLike(fieldDirectives),
        subgraphs,
        astNode: field.astNode,
      });
    }
  }

  return errors;
}

function collectResolveToLike(
  directives: Record<string, Array<Record<string, unknown>>> | undefined,
): ResolveToLike[] {
  const out: ResolveToLike[] = [];
  for (const d of directives?.resolveTo || []) {
    out.push(d as ResolveToLike);
  }
  // Finalized Mesh Compose: `@join__directive(name: "resolveTo", args:)`
  for (const d of directives?.join__directive || []) {
    if (d?.name === 'resolveTo') {
      const args = (d.args && typeof d.args === 'object' ? d.args : {}) as Record<string, unknown>;
      out.push({
        sourceName: typeof args.sourceName === 'string' ? args.sourceName : undefined,
        sourceTypeName: typeof args.sourceTypeName === 'string' ? args.sourceTypeName : undefined,
        sourceFieldName:
          typeof args.sourceFieldName === 'string' ? args.sourceFieldName : undefined,
        sourceArgs:
          args.sourceArgs && typeof args.sourceArgs === 'object'
            ? (args.sourceArgs as Record<string, unknown>)
            : undefined,
        pubsubTopic: typeof args.pubsubTopic === 'string' ? args.pubsubTopic : undefined,
      });
    }
  }
  return out;
}

function collectMergeLike(
  directives: Record<string, Array<Record<string, unknown>>> | undefined,
): MergeLike[] {
  const out: MergeLike[] = [];
  for (const d of directives?.merge || []) {
    out.push(d as MergeLike);
  }
  // Finalized Mesh Compose: `@join__directive(name: "merge", graphs:, args:)`
  for (const d of directives?.join__directive || []) {
    if (d?.name === 'merge') {
      const args = (d.args && typeof d.args === 'object' ? d.args : {}) as Record<string, unknown>;
      out.push({
        graphs: Array.isArray(d.graphs) ? (d.graphs as string[]) : undefined,
        subgraph: typeof args.subgraph === 'string' ? args.subgraph : undefined,
        keyField: typeof args.keyField === 'string' ? args.keyField : undefined,
        keyArg: typeof args.keyArg === 'string' ? args.keyArg : undefined,
        key: Array.isArray(args.key) ? (args.key as string[]) : undefined,
        argsExpr: typeof args.argsExpr === 'string' ? args.argsExpr : undefined,
      });
    }
  }
  return out;
}

function validateMergeDirectives(opts: {
  errors: GraphQLError[];
  locationLabel: string;
  mergeDirectives: MergeLike[];
  subgraphs: ServiceDefinition[];
  graphEnumToName: Map<string, string>;
  astNode?: ASTNode | null;
  field?: GraphQLField<unknown, unknown>;
  fieldTypeName?: string;
}) {
  const { errors, locationLabel, mergeDirectives, subgraphs, graphEnumToName, astNode, field } =
    opts;
  for (const mergeDirective of mergeDirectives) {
    const subgraphNames = resolveMergeSubgraphNames(mergeDirective, graphEnumToName);
    if (subgraphNames.length === 0) {
      errors.push(
        new GraphQLError(
          `Expected @merge on ${locationLabel} to name a subgraph (subgraph: or join__directive graphs:)`,
          { nodes: astNode || undefined },
        ),
      );
      continue;
    }
    for (const subgraphName of subgraphNames) {
      const subgraph = subgraphs.find(s => s.name === subgraphName);
      if (!subgraph) {
        errors.push(
          new GraphQLError(
            `@merge on ${locationLabel} references unknown subgraph ${subgraphName}`,
            { nodes: astNode || undefined },
          ),
        );
        continue;
      }
      // When merge is on a Query field, keyArg should exist on that field if set.
      if (field && mergeDirective.keyArg) {
        const argNames = field.args.map(a => a.name);
        if (!argNames.includes(mergeDirective.keyArg)) {
          const suggestions = suggestionList(mergeDirective.keyArg, argNames);
          const suggestionStr = suggestions.length
            ? ` Did you mean "${suggestions.join(' or ')}"?`
            : '';
          errors.push(
            new GraphQLError(
              `@merge on ${locationLabel} references unknown argument ${mergeDirective.keyArg}${suggestionStr}`,
              { nodes: astNode || undefined },
            ),
          );
        }
      }
    }
  }
}

function resolveMergeSubgraphNames(
  mergeDirective: MergeLike,
  graphEnumToName: Map<string, string>,
): string[] {
  if (typeof mergeDirective.subgraph === 'string' && mergeDirective.subgraph) {
    return [mergeDirective.subgraph];
  }
  if (!mergeDirective.graphs?.length) {
    return [];
  }
  return mergeDirective.graphs.map(g => graphEnumToName.get(g) || g);
}

function validateResolveToDirectives(opts: {
  errors: GraphQLError[];
  locationLabel: string;
  resolveToDirectives: ResolveToLike[];
  subgraphs: ServiceDefinition[];
  astNode?: ASTNode | null;
}) {
  const { errors, locationLabel, resolveToDirectives, subgraphs, astNode } = opts;
  for (const resolveToDirective of resolveToDirectives) {
    const subgraphName = resolveToDirective.sourceName;
    // `@resolveTo(pubsubTopic:)` is valid Mesh subscription wiring (no subgraph target).
    if (!subgraphName && resolveToDirective.pubsubTopic) {
      continue;
    }
    const subgraph = subgraphs.find(s => s.name === subgraphName);
    if (!subgraphName) {
      errors.push(
        new GraphQLError(`Expected @resolveTo on ${locationLabel} to have a sourceName argument`, {
          nodes: astNode ?? undefined,
        }),
      );
      continue;
    }
    if (!subgraph) {
      errors.push(
        new GraphQLError(
          `@resolveTo on ${locationLabel} references unknown subgraph ${subgraphName}`,
          { nodes: astNode || undefined },
        ),
      );
      continue;
    }
    if (resolveToDirective.sourceFieldName && resolveToDirective.sourceTypeName) {
      const typeDef = subgraph.typeDefs.definitions.find(
        def => 'name' in def && def.name.value === resolveToDirective.sourceTypeName,
      );
      if (!typeDef) {
        errors.push(
          new GraphQLError(
            `@resolveTo on ${locationLabel} references unknown type ${resolveToDirective.sourceTypeName} in subgraph ${subgraphName}`,
            { nodes: astNode || undefined },
          ),
        );
        continue;
      }
      // `__typename` is a virtual resolve target used by encapsulate - skip field lookup.
      if (resolveToDirective.sourceFieldName === '__typename') {
        continue;
      }
      const fields = ('fields' in typeDef && typeDef.fields) || ([] as FieldDefinitionNode[]);
      const fieldName = resolveToDirective.sourceFieldName;
      const fieldDef = fields.find(f => f.name.value === fieldName);
      if (!fieldDef) {
        const suggestions = suggestionList(
          fieldName,
          fields.map(f => f.name.value),
        );
        const suggestionStr = suggestions.length
          ? ` Did you mean "${suggestions.join(' or ')}"?`
          : '';
        errors.push(
          new GraphQLError(
            `@resolveTo on ${locationLabel} references unknown field ${fieldName} in subgraph ${subgraphName}${suggestionStr}`,
            { nodes: astNode || undefined },
          ),
        );
        continue;
      }
      if (resolveToDirective.sourceArgs) {
        const argOfFields =
          'arguments' in fieldDef && fieldDef.arguments
            ? fieldDef.arguments.map(arg => arg.name.value)
            : [];
        for (const argName in resolveToDirective.sourceArgs) {
          if (!argOfFields.includes(argName)) {
            const suggestions = suggestionList(argName, argOfFields);
            const suggestionStr = suggestions.length
              ? ` Did you mean "${suggestions.join(' or ')}"?`
              : '';
            errors.push(
              new GraphQLError(
                `@resolveTo on ${locationLabel} references unknown argument ${argName} in field ${fieldName} of subgraph ${subgraphName}${suggestionStr}`,
                { nodes: astNode || undefined },
              ),
            );
          }
        }
      }
    }
  }
}

function readJoinGraphEnumToName(schema: ReturnType<typeof buildSchema>): Map<string, string> {
  const map = new Map<string, string>();
  const joinGraph = schema.getType('join__Graph');
  if (!isEnumType(joinGraph)) {
    return map;
  }
  for (const value of joinGraph.getValues()) {
    const dirs = getDirectiveExtensions(value, schema);
    const joinGraphDir = dirs?.join__graph?.[0] as { name?: string } | undefined;
    if (joinGraphDir?.name) {
      map.set(value.name, joinGraphDir.name);
    }
  }
  return map;
}

/** True when the schema defines or applies Federation Spec draft lookup directives. */
function schemaHasFederationLookupDirectives(schema: ReturnType<typeof buildSchema>): boolean {
  if (
    schema.getDirective('lookup') ||
    schema.getDirective('is') ||
    schema.getDirective('internal')
  ) {
    return true;
  }
  for (const type of Object.values(schema.getTypeMap())) {
    if ((!isObjectType(type) && !isInterfaceType(type)) || type.name.startsWith('__')) {
      continue;
    }
    const typeDirs = getDirectiveExtensions(type, schema);
    if (typeDirs?.internal?.length) {
      return true;
    }
    for (const field of Object.values(type.getFields())) {
      const fieldDirs = getDirectiveExtensions(field, schema);
      if (fieldDirs?.lookup?.length || fieldDirs?.internal?.length) {
        return true;
      }
      for (const arg of field.args) {
        if (getDirectiveExtensions(arg, schema)?.is?.length) {
          return true;
        }
      }
    }
  }
  return false;
}
