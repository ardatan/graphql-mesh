import {
  concatAST,
  extendSchema,
  getNamedType,
  GraphQLSchema,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isSpecifiedDirective,
  specifiedDirectives,
  type GraphQLDirective,
  type GraphQLFieldResolver,
  type GraphQLNamedType,
  type GraphQLObjectType,
} from 'graphql';
import {
  getSubschema,
  getUnpathedErrors,
  isExternalObject,
  isSubschemaConfig,
  resolveExternalValue,
  Subschema,
  type StitchingInfo,
  type SubschemaConfig,
} from '@graphql-tools/delegate';
import { applyExtensions, mergeExtensions, mergeResolvers } from '@graphql-tools/merge';
import {
  addResolversToSchema,
  assertResolversPresent,
  extendResolversFromInterfaces,
} from '@graphql-tools/schema';
import { inspect, type IResolvers } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import { attachBackboneExecutor } from './backbone/attachBackboneExecutor.js';
import { defaultMergedResolver as backboneDefaultMergedResolver } from './backbone/defaultMergedResolver.js';
import { BACKBONE_EXECUTING } from './backbone/rootProxyingResolvers.js';
import { resolveLocalFieldResult } from './resolveLocalFieldResult.js';
import { addStitchingInfo, completeStitchingInfo, createStitchingInfo } from './stitchingInfo.js';
import {
  deferComputedFieldsTransformer,
  splitMergedTypeEntryPointsTransformer,
} from './subschemaConfigTransforms/index.js';
import { buildTypeCandidates, buildTypes } from './typeCandidates.js';
import {
  type IStitchSchemasOptions,
  type MergeTypeCandidate,
  type SubschemaConfigTransform,
} from './types.js';

const BACKBONE_HYDRATED = Symbol.for('graphql-tools.stitch.backboneHydrated');
const BACKBONE_EXECUTING_SYM = Symbol.for('graphql-tools.stitch.backboneExecuting');

export function stitchSchemas<TContext extends Record<string, any> = Record<string, any>>(
  options: IStitchSchemasOptions<TContext>,
): GraphQLSchema {
  const {
    resolvers = {},
    inheritResolversFromInterfaces = false,
    resolverValidationOptions = {},
    updateResolversInPlace = true,
    schemaExtensions,
    contextProviders: contextProvidersOption,
    ...rest
  } = options;
  let {
    typeCandidates,
    newTypeMap,
    newDirectives,
    rootTypeNameMap,
    stitchingInfo,
    schemaDefs,
    extensions,
    mergeDirectives,
  } = prepareStitchingData(options);

  let schema: GraphQLSchema;
  {
    // try to optimize memory...
    // allocate inside scope to allow freeing after.
    const finalTypes = Object.values(newTypeMap);

    if (!mergeDirectives) {
      stripCustomDirectiveUsages(finalTypes);
    }

    schema = new GraphQLSchema({
      query: newTypeMap[rootTypeNameMap.query] as GraphQLObjectType,
      mutation: newTypeMap[rootTypeNameMap.mutation] as GraphQLObjectType,
      subscription: newTypeMap[rootTypeNameMap.subscription] as GraphQLObjectType,
      types: finalTypes,
      directives: newDirectives,
      astNode: schemaDefs.schemaDef,
      extensionASTNodes: schemaDefs.schemaExtensions,
      extensions: null,
      assumeValid: rest.assumeValid,
    });
  }

  if (extensions.length > 0) {
    const mergedExtensions = concatAST(extensions);
    schema = extendSchema(schema, mergedExtensions);
  }

  // addLocalFieldResolvers writes the wrappers it builds back into this map, so
  // clone it two levels first and leave the caller's resolver objects untouched.
  // A resolver map reused across stitchSchemas calls (a gateway's additional
  // resolvers on every schema reload) would otherwise gain one wrapper per call,
  // each closing over that call's stitchingInfo and keeping the whole superseded
  // schema alive.
  const resolverMap: IResolvers = cloneResolverMap(mergeResolvers(resolvers), schema);

  const finalResolvers = inheritResolversFromInterfaces
    ? extendResolversFromInterfaces(schema, resolverMap)
    : resolverMap;

  stitchingInfo = completeStitchingInfo(stitchingInfo, finalResolvers, schema);

  // Slim stitch defaultMergedResolver: plan owns entity hops.
  const gatewayDefaultFieldResolver = backboneDefaultMergedResolver;

  addLocalFieldResolvers(
    schema,
    finalResolvers,
    stitchingInfo,
    typeCandidates,
    gatewayDefaultFieldResolver,
  );

  schema = addResolversToSchema({
    schema,
    defaultFieldResolver: gatewayDefaultFieldResolver,
    resolvers: finalResolvers,
    resolverValidationOptions,
    inheritResolversFromInterfaces: false,
    updateResolversInPlace,
  });

  wrapMergedTypeResolversForBackboneHydration(schema, stitchingInfo);

  const resolverValidationOptionsEntries = Object.entries(resolverValidationOptions);

  if (
    resolverValidationOptionsEntries.length > 0 &&
    resolverValidationOptionsEntries.some(([, o]) => o !== 'ignore')
  ) {
    assertResolversPresent(schema, resolverValidationOptions);
  }

  addStitchingInfo(schema, stitchingInfo);

  if (schemaExtensions) {
    const mergedSchemaExtensions = Array.isArray(schemaExtensions)
      ? mergeExtensions(schemaExtensions)
      : schemaExtensions;

    applyExtensions(schema, mergedSchemaExtensions);
  }

  if (contextProvidersOption && schema.extensions?.stitchingInfo) {
    (
      schema.extensions.stitchingInfo as { contextProviders?: Record<string, string[]> }
    ).contextProviders = contextProvidersOption;
  }

  // Backbone executor + root proxying resolvers on the stitched schema.
  // Callers that mapSchema afterward (e.g. federation filter) must re-attach
  // on the new instance.
  return attachBackboneExecutor(schema);
}

function stripCustomDirectiveUsages(types: GraphQLNamedType[]): void {
  const isBuiltin = (d: { name: { value: string } }) =>
    isSpecifiedDirective(
      // @ts-expect-error it's ok to use just the name, isSpecifiedDirective does the same internally
      { name: d.name.value },
    );

  for (const type of types) {
    if (type.astNode?.directives?.length) {
      type.astNode = {
        ...type.astNode,
        directives: type.astNode.directives.filter(isBuiltin),
      };
    }
    if (isObjectType(type) || isInterfaceType(type)) {
      for (const field of Object.values(type.getFields())) {
        if (field.astNode?.directives?.length) {
          field.astNode = {
            ...field.astNode,
            directives: field.astNode.directives.filter(isBuiltin),
          };
        }
      }
    } else if (isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        if (field.astNode?.directives?.length) {
          field.astNode = {
            ...field.astNode,
            directives: field.astNode.directives.filter(isBuiltin),
          };
        }
      }
    } else if (isEnumType(type)) {
      for (const value of type.getValues()) {
        if (value.astNode?.directives?.length) {
          value.astNode = {
            ...value.astNode,
            directives: value.astNode.directives.filter(isBuiltin),
          };
        }
      }
    }
  }
}

function isResolverRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Copies the resolver map one level, and the field configs of object and
 * interface types one level more, so addLocalFieldResolvers can write its
 * wrappers into the copy. Every other entry (enum value maps, scalar
 * instances or configs, union and input type resolvers, functions) is passed
 * through by reference: it is never mutated, and enum internal values in
 * particular must keep their identity.
 */
function cloneResolverMap(resolverMap: IResolvers, schema: GraphQLSchema): IResolvers {
  const cloned: IResolvers = {};
  for (const typeName in resolverMap) {
    const typeResolvers = resolverMap[typeName];
    if (typeResolvers === undefined) {
      continue;
    }
    const type = schema.getType(typeName);
    if (!isResolverRecord(typeResolvers) || (!isObjectType(type) && !isInterfaceType(type))) {
      cloned[typeName] = typeResolvers;
      continue;
    }
    const fieldConfigs: Record<string, unknown> = typeResolvers;
    const clonedType: Record<string, unknown> = {};
    for (const fieldName in fieldConfigs) {
      const field = fieldConfigs[fieldName];
      clonedType[fieldName] = isResolverRecord(field) ? { ...field } : field;
    }
    cloned[typeName] = clonedType as IResolvers[string];
  }
  return cloned;
}

/**
 * Lets fields that are not provided by any subschema (introduced through the
 * `typeDefs` or `resolvers` options) return plain objects containing only the
 * key fields of a merged type; those get delegated to the owning subschema so
 * the rest of the fields resolve through regular type merging.
 */
/**
 * Wrap merged-entity field resolvers: when the backbone plan has hydrated the
 * tree (`BACKBONE_HYDRATED`), skip mergeFields on already-present
 * fields. Otherwise call the previous resolver unchanged.
 */
function wrapMergedTypeResolversForBackboneHydration<TContext extends Record<string, any>>(
  schema: GraphQLSchema,
  stitchingInfo: StitchingInfo<TContext>,
): void {
  for (const typeName of Object.keys(stitchingInfo.mergedTypes)) {
    const type = schema.getType(typeName);
    if (!isObjectType(type) && !isInterfaceType(type)) {
      continue;
    }
    const locals = stitchingInfo.localFields?.get(typeName);
    for (const [fieldName, field] of Object.entries(type.getFields())) {
      if (locals?.has(fieldName)) {
        continue;
      }
      const previous = field.resolve;
      if (previous == null) {
        continue;
      }
      field.resolve = function defaultMergedResolver(
        parent: any,
        args: any,
        context: any,
        info: any,
      ) {
        const backboneActive =
          context != null &&
          typeof context === 'object' &&
          ((context as any)[BACKBONE_HYDRATED] || (context as any)[BACKBONE_EXECUTING_SYM]);
        if (backboneActive && parent != null && isExternalObject(parent)) {
          const responseKey = info.fieldNodes[0]?.alias?.value ?? info.fieldName;
          if (Object.prototype.hasOwnProperty.call(parent, responseKey)) {
            return resolveExternalValue(
              parent[responseKey],
              getUnpathedErrors(parent),
              getSubschema(parent, responseKey),
              context,
              info,
              undefined,
              true,
            );
          }
          // Plan still running / already hydrated - do not schedule classic
          // mergeFields DataLoader batches for missing entity fields.
          if (Object.prototype.hasOwnProperty.call(parent, info.fieldName)) {
            return parent[info.fieldName];
          }
          return undefined;
        }
        return previous(parent, args, context, info);
      };
    }
  }
}

function addLocalFieldResolvers<TContext extends Record<string, any>>(
  schema: GraphQLSchema,
  resolvers: IResolvers,
  stitchingInfo: StitchingInfo<TContext>,
  typeCandidates: Record<string, Array<MergeTypeCandidate<TContext>>>,
  gatewayDefaultFieldResolver: GraphQLFieldResolver<any, any>,
): void {
  const subschemaFields = new Set<string>();
  const localFields = new Map<string, Set<string>>();
  for (const typeName in typeCandidates) {
    for (const candidate of typeCandidates[typeName]!) {
      if (!isObjectType(candidate.type) && !isInterfaceType(candidate.type)) {
        continue;
      }
      const fieldNames = Object.keys(candidate.type.getFields()) as string[];
      if (candidate.transformedSubschema != null || candidate.subschema != null) {
        for (const fieldName of fieldNames) {
          subschemaFields.add(`${typeName}.${fieldName}`);
        }
      } else {
        let fields = localFields.get(typeName);
        if (fields == null) {
          fields = new Set();
          localFields.set(typeName, fields);
        }
        for (const fieldName of fieldNames) {
          fields.add(String(fieldName));
        }
      }
    }
  }
  for (const typeName in resolvers) {
    const typeResolvers = resolvers[typeName];
    if (typeResolvers == null || typeof typeResolvers !== 'object') {
      continue;
    }
    let fields = localFields.get(typeName);
    if (fields == null) {
      fields = new Set();
      localFields.set(typeName, fields);
    }
    for (const fieldName in typeResolvers) {
      if (fieldName.startsWith('__')) {
        continue;
      }
      fields.add(String(fieldName));
    }
  }
  // Persist for the backbone planner (Island nodes).
  stitchingInfo.localFields = localFields;

  for (const [typeName, fieldNames] of localFields) {
    const type = schema.getType(typeName);
    if (!isObjectType(type) && !isInterfaceType(type)) {
      continue;
    }
    const fields = type.getFields();
    for (const fieldName of fieldNames) {
      const field = fields[fieldName];
      const existing = (resolvers[typeName] as Record<string, any> | undefined)?.[fieldName];
      if (
        field == null ||
        // subschema-owned fields keep their proxying resolver unless the user overrode it
        (existing == null && subschemaFields.has(`${typeName}.${fieldName}`))
      ) {
        continue;
      }
      const namedType = getNamedType(field.type);
      if (stitchingInfo.mergedTypes[namedType.name] == null) {
        continue;
      }
      const originalResolve = typeof existing === 'function' ? existing : existing?.resolve;
      // Property-only locals use schema defaultFieldResolver (includes
      // resolveLocalFieldResult). Only wrap real user resolvers.
      if (originalResolve == null) {
        continue;
      }
      const namedTypeResolvers = resolvers[namedType.name];
      const providedFields =
        namedTypeResolvers != null && typeof namedTypeResolvers === 'object'
          ? new Set(
              Object.keys(namedTypeResolvers).filter(fieldName => !fieldName.startsWith('__')),
            )
          : undefined;
      // After Island hydration, graphql-js re-walks and would re-invoke user
      // resolvers without selectionSet deps - short-circuit via the gateway
      // default. Otherwise run the user resolve then hydrate.
      const wrappedResolve = (parent: any, args: any, context: any, info: any) => {
        if (
          parent != null &&
          typeof parent === 'object' &&
          info != null &&
          (context == null || typeof context !== 'object' || !(context as any)[BACKBONE_EXECUTING])
        ) {
          const responseKey =
            typeof info.path?.key === 'string'
              ? info.path.key
              : typeof info.fieldName === 'string'
                ? info.fieldName
                : undefined;
          if (responseKey != null && Object.prototype.hasOwnProperty.call(parent, responseKey)) {
            return gatewayDefaultFieldResolver(parent, args, context, info);
          }
        }
        return handleMaybePromise(
          () => originalResolve(parent, args, context, info),
          result => resolveLocalFieldResult(result, context, info, stitchingInfo, providedFields),
        );
      };
      if (existing != null && typeof existing === 'object') {
        existing.resolve = wrappedResolve;
      } else {
        ((resolvers[typeName] ||= {}) as Record<string, any>)[fieldName] = wrappedResolve;
      }
    }
  }
}

// Clone-less computed deferral + entrypoint split (isolation clones removed).
const computedFieldPresets: Array<SubschemaConfigTransform<any>> = [
  deferComputedFieldsTransformer,
  splitMergedTypeEntryPointsTransformer,
];

function applySubschemaConfigTransforms<TContext = Record<string, any>>(
  subschemaConfigTransforms: Array<SubschemaConfigTransform<TContext>>,
  subschemaOrSubschemaConfig: GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
  subschemaMap: Map<
    GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
    Subschema<any, any, any, TContext>
  >,
  originalSubschemaMap: Map<
    Subschema<any, any, any, TContext>,
    GraphQLSchema | SubschemaConfig<any, any, any, TContext>
  >,
): Array<Subschema<any, any, any, TContext>> {
  let subschemaConfig: SubschemaConfig<any, any, any, TContext>;
  if (isSubschemaConfig(subschemaOrSubschemaConfig)) {
    subschemaConfig = subschemaOrSubschemaConfig;
  } else if (subschemaOrSubschemaConfig instanceof GraphQLSchema) {
    subschemaConfig = { schema: subschemaOrSubschemaConfig };
  } else {
    throw new TypeError('Received invalid input.' + inspect(subschemaOrSubschemaConfig));
  }

  const transformedSubschemaConfigs = subschemaConfigTransforms
    .concat(computedFieldPresets)
    .reduce(
      (transformedSubschemaConfigs, subschemaConfigTransform) =>
        transformedSubschemaConfigs.flatMap(ssConfig => subschemaConfigTransform(ssConfig)),
      [subschemaConfig],
    );

  const transformedSubschemas = transformedSubschemaConfigs.map(
    ssConfig => new Subschema<any, any, any, TContext>(ssConfig),
  );

  const baseSubschema = transformedSubschemas[0];

  subschemaMap.set(subschemaOrSubschemaConfig, baseSubschema!);

  for (const subschema of transformedSubschemas) {
    originalSubschemaMap.set(subschema, subschemaOrSubschemaConfig);
  }

  return transformedSubschemas;
}

function prepareStitchingData<TContext extends Record<string, any>>(
  options: IStitchSchemasOptions<TContext>,
) {
  const {
    subschemas = [],
    types = [],
    typeDefs = [],
    onTypeConflict,
    mergeTypes = true,
    typeMergingOptions,
    subschemaConfigTransforms = [],
    ...rest
  } = options;

  const mergeDirectives = rest.mergeDirectives ?? true;
  const transformedSubschemas: Array<Subschema<any, any, any, TContext>> = [];

  // These maps take up a lot of memory during large stitches...
  const subschemaMap = new Map();
  const originalSubschemaMap = new Map();

  for (const subschema of subschemas) {
    for (const transformedSubschemaConfig of applySubschemaConfigTransforms(
      subschemaConfigTransforms,
      subschema,
      subschemaMap,
      originalSubschemaMap,
    )) {
      transformedSubschemas.push(transformedSubschemaConfig);
    }
  }

  const directiveMap: Record<string, GraphQLDirective> = Object.create(null);
  for (const directive of specifiedDirectives) {
    directiveMap[directive.name] = directive;
  }
  const schemaDefs = Object.create(null);

  // note that typeCandidates is usually a massive object in large schemas
  const [typeCandidates, rootTypeNameMap, extensions] = buildTypeCandidates({
    subschemas: transformedSubschemas,
    originalSubschemaMap,
    types,
    typeDefs: typeDefs || [],
    parseOptions: rest,
    directiveMap,
    schemaDefs,
    mergeDirectives,
  });

  const stitchingInfo = createStitchingInfo(subschemaMap, typeCandidates, mergeTypes);

  const { typeMap: newTypeMap, directives: newDirectives } = buildTypes({
    typeCandidates,
    directives: Object.values(directiveMap),
    stitchingInfo,
    rootTypeNames: Object.values(rootTypeNameMap),
    onTypeConflict,
    mergeTypes,
    typeMergingOptions,
  });

  // We only return the specific references the main function actually needs.
  // Everything else falls out of scope and gets Garbage Collected.
  // This is critical to optimize memory usage since schemas can be very big.
  return {
    typeCandidates,
    newTypeMap,
    newDirectives,
    rootTypeNameMap,
    stitchingInfo,
    schemaDefs,
    extensions,
    mergeDirectives,
  };
}
