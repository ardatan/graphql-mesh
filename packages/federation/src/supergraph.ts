import { constantCase } from 'change-case';
import {
  buildASTSchema,
  GraphQLError,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  Kind,
  parse,
  parseType,
  print,
  visit,
  visitWithTypeInfo,
  type ConstArgumentNode,
  type ConstDirectiveNode,
  type DefinitionNode,
  type DirectiveDefinitionNode,
  type DirectiveNode,
  type DocumentNode,
  type EnumTypeDefinitionNode,
  type EnumValueDefinitionNode,
  type FieldDefinitionNode,
  type FieldNode,
  type GraphQLFieldResolver,
  type GraphQLInterfaceType,
  type GraphQLOutputType,
  type GraphQLSchema,
  type InputValueDefinitionNode,
  type InterfaceTypeDefinitionNode,
  type InterfaceTypeExtensionNode,
  type NamedTypeNode,
  type ObjectTypeDefinitionNode,
  type ObjectTypeExtensionNode,
  type OperationTypeNode,
  type ScalarTypeDefinitionNode,
  type SelectionNode,
  type SelectionSetNode,
  type TypeDefinitionNode,
  type UnionTypeDefinitionNode,
} from 'graphql';
import {
  delegateToSchema,
  extractUnavailableFieldsFromSelectionSet,
  FIELD_SUBSCHEMA_MAP_SYMBOL,
  getTypeInfo,
  handleOverrideByDelegation,
  isExternalObject,
  OBJECT_SUBSCHEMA_SYMBOL,
  subtractSelectionSets,
  UNPATHED_ERRORS_SYMBOL,
  type BatchingOptions,
  type MergedFieldConfig,
  type MergedTypeConfig,
  type SubschemaConfig,
  type Transform,
} from '@graphql-tools/delegate';
import { CRITICAL_ERROR } from '@graphql-tools/executor';
import { buildHTTPExecutor, type HTTPExecutorOptions } from '@graphql-tools/executor-http';
import {
  calculateSelectionScore,
  getDefaultFieldConfigMerger,
  markChangedRootResolvesAsLocal,
  retargetBackboneToSchema,
  snapshotRootFieldResolves,
  stitchSchemas,
  ValidationLevel,
  type MergeFieldConfigCandidate,
  type TypeMergingOptions,
} from '@graphql-tools/stitch';
import {
  MapperKind,
  mapSchema,
  memoize1,
  mergeDeep,
  parseSelectionSet,
  type ASTVisitorKeyMap,
  type Executor,
  type SchemaExtensions,
} from '@graphql-tools/utils';
import { handleMaybePromise, isPromise } from '@whatwg-node/promise-helpers';
import {
  createComplementaryPercentOverrideHandlers,
  extractPercentageFromLabel,
  filterDirectivesByGraph,
  filterInternalFieldsAndTypes,
  getArgsFromKeysForFederation,
  getCacheKeyFnFromKey,
  getKeyFnForFederation,
  getNamedTypeNode,
  parseJoinDirective,
  progressiveOverridePossibilityHandler,
  type ProgressiveOverrideHandler,
} from './utils.js';

function keySelectionIncludesAllFields(
  keyFieldSet: string,
  fieldDefinitionNodesOfSubgraph: ReadonlyArray<FieldDefinitionNode>,
): boolean {
  let selectionSet: SelectionSetNode;
  try {
    // `keyFieldSet` is a federation field set string (e.g. "id", "id orderId").
    // Wrap it in braces so it can be parsed as a GraphQL selection set.
    selectionSet = parseSelectionSet(`{ ${keyFieldSet} }`);
  } catch {
    // If the key cannot be parsed, conservatively report that not all fields are included.
    return false;
  }

  const topLevelFieldNames = new Set<string>();
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      topLevelFieldNames.add(selection.name.value);
    }
  }

  return fieldDefinitionNodesOfSubgraph.every(fieldDefNode =>
    topLevelFieldNames.has(fieldDefNode.name.value),
  );
}

export function ensureSupergraphSDLAst(supergraphSdl: string | DocumentNode): DocumentNode {
  if (typeof supergraphSdl === 'string') {
    return parse(supergraphSdl, { noLocation: true });
  }
  // Clone so visitors never mutate the caller's DocumentNode across repeated builds.
  return JSON.parse(JSON.stringify(supergraphSdl)) as DocumentNode;
}

const rootTypeMap = new Map<string, OperationTypeNode>([
  ['Query', 'query' as OperationTypeNode],
  ['Mutation', 'mutation' as OperationTypeNode],
  ['Subscription', 'subscription' as OperationTypeNode],
]);

const memoizedASTPrint = memoize1(print);
const memoizedTypePrint = memoize1((type: GraphQLOutputType) => type.toString());

export interface FederationSubschemaConfig extends Omit<SubschemaConfig, 'executor' | 'name'> {
  executor: Executor;
  name: string;
  endpoint: string;
}

export interface GetStitchingOptionsFromSupergraphSdlOpts {
  supergraphSdl: string | DocumentNode;
  httpExecutorOpts?:
    | Partial<HTTPExecutorOptions>
    | ((subgraphInfo: { name: string; endpoint?: string }) => Partial<HTTPExecutorOptions>);
  onSubschemaConfig?: (subschemaConfig: FederationSubschemaConfig) => void;
  onMergedTypeConfig?: (typeName: string, mergedTypeConfig: MergedTypeConfig) => void;
  onSubgraphAST?: (name: string, subgraphAST: DocumentNode) => DocumentNode;
  /**
   * Enable query batching for all subschemas.
   *
   * @default false
   */
  batch?: boolean;
  /**
   * Configure the query batching options for all subschemas.
   */
  batchingOptions?: BatchingOptions;
  /**
   * Forward `@defer` to every subschema (requires a defer-capable executor).
   *
   * @default false
   */
  defer?: boolean;
  /**
   * Configure the batch delegation options for all merged types in all subschemas.
   */
  batchDelegateOptions?: MergedTypeConfig['dataLoaderOptions'];

  handleProgressiveOverride?: ProgressiveOverrideHandler;

  getRng?: () => number;
}

export interface ProgressiveOverrideInfo {
  field: string;
  from: string;
  label: string;
}

export interface ProgressiveOverrideInfoOpposite {
  field: string;
  to: string;
  label: string;
}

export function getStitchingOptionsFromSupergraphSdl(
  opts: GetStitchingOptionsFromSupergraphSdlOpts,
) {
  const supergraphAst = ensureSupergraphSDLAst(opts.supergraphSdl);
  const subgraphEndpointMap = new Map<string, string>();
  /** Declared `@join__graph(name:)` → enum identifier (exact, not constantCase). */
  const subgraphNameToEnumId = new Map<string, string>();
  const subgraphTypesMap = new Map<string, TypeDefinitionNode[]>();
  const typeNameKeysBySubgraphMap = new Map<string, Map<string, Set<string>>>();
  const typeNameFieldsKeyBySubgraphMap = new Map<string, Map<string, Map<string, string>>>();
  const typeNameCanonicalMap = new Map<string, string>();
  const subgraphTypeNameProvidedMap = new Map<string, Map<string, Set<string>>>();
  const subgraphTypeNameFieldProvidedSelectionMap = new Map<
    string,
    Map<string, Map<string, SelectionSetNode>>
  >();
  const orphanTypeMap = new Map<string, TypeDefinitionNode>();
  const typeFieldASTMap = new Map<
    string,
    Map<string, FieldDefinitionNode | InputValueDefinitionNode>
  >();
  const progressiveOverrideInfos = new Map<string, Map<string, ProgressiveOverrideInfo[]>>();
  const progressiveOverrideInfosOpposite = new Map<
    string,
    Map<string, ProgressiveOverrideInfoOpposite[]>
  >();
  const overrideLabels = new Set<string>();
  const subgraphSchemaDefinitionDirectives = new Map<string, ConstDirectiveNode[]>();

  for (const definition of supergraphAst.definitions) {
    if ('fields' in definition) {
      const fieldMap = new Map<string, FieldDefinitionNode | InputValueDefinitionNode>();
      typeFieldASTMap.set(definition.name.value, fieldMap);
      for (const field of definition.fields || []) {
        fieldMap.set(field.name.value, field);
      }
    }
  }

  // To detect unresolvable interface fields
  const subgraphExternalFieldMap = new Map<string, Map<string, Set<string>>>();
  const directiveImports = new Map<string, { url: string; originalName?: string }>();
  const directiveDefinitions = new Map<string, DirectiveDefinitionNode>();
  const inputDefinitions = new Map<string, DefinitionNode>();
  const directiveExtraDefinitions: Map<string, Set<string>> = new Map();

  // TODO: Temporary fix to add missing join__type directives to Query
  const subgraphNames: string[] = [];
  visit(supergraphAst, {
    EnumTypeDefinition(node) {
      if (node.name.value === 'join__Graph') {
        node.values?.forEach(valueNode => {
          subgraphNames.push(valueNode.name.value);
        });
      }
      inputDefinitions.set(node.name.value, node);
    },
    DirectiveDefinition(node) {
      directiveDefinitions.set(node.name.value, node);
      if (node.arguments?.length) {
        const extraDefinitions = new Set<string>();
        for (const arg of node.arguments) {
          const argTypeNode = getNamedTypeNode(arg.type);
          if (!specifiedTypeNames.includes(argTypeNode.name.value)) {
            extraDefinitions.add(argTypeNode.name.value);
          }
        }
        if (extraDefinitions.size > 0) {
          directiveExtraDefinitions.set(node.name.value, extraDefinitions);
        }
      }
    },
    ScalarTypeDefinition(node) {
      inputDefinitions.set(node.name.value, node);
    },
    InputObjectTypeDefinition(node) {
      inputDefinitions.set(node.name.value, node);
    },
    Directive(node) {
      if (node.name.value === 'link') {
        const importedDirectives = node.arguments?.find(arg => arg.name.value === 'import');
        const urlArg = node.arguments?.find(arg => arg.name.value === 'url');
        const urlStr = urlArg?.value?.kind === Kind.STRING ? urlArg.value.value : undefined;
        if (urlStr && importedDirectives?.value?.kind === Kind.LIST) {
          for (const importedDirective of importedDirectives.value.values) {
            if (importedDirective.kind === Kind.STRING) {
              directiveImports.set(importedDirective.value, { url: urlStr });
            } else if (importedDirective.kind === Kind.OBJECT) {
              const nameField = importedDirective.fields.find(field => field.name.value === 'name');
              const asField = importedDirective.fields.find(field => field.name.value === 'as');
              if (nameField?.value?.kind === Kind.STRING && urlStr) {
                const originalName = nameField.value.value;
                const localName =
                  asField?.value?.kind === Kind.STRING ? asField.value.value : originalName;
                directiveImports.set(localName, {
                  url: urlStr,
                  originalName: localName !== originalName ? originalName : undefined,
                });
              }
            }
          }
        }
      }
    },
  });
  // END TODO
  function TypeWithFieldsVisitor(typeNode: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode) {
    // TODO: Temporary fix to add missing join__type directives to Query
    // Use a local directives list so we never mutate the caller's supergraph AST.
    let typeNodeDirectives = typeNode.directives;
    if (
      typeNode.name.value === 'Query' ||
      (typeNode.name.value === 'Mutation' &&
        !typeNode.directives?.some(directiveNode => directiveNode.name.value === 'join__type'))
    ) {
      typeNodeDirectives = [
        ...(typeNode.directives || []),
        ...subgraphNames.map(subgraphName => ({
          kind: Kind.DIRECTIVE,
          name: {
            kind: Kind.NAME,
            value: 'join__type',
          },
          arguments: [
            {
              kind: Kind.ARGUMENT,
              name: {
                kind: Kind.NAME,
                value: 'graph',
              },
              value: {
                kind: Kind.ENUM,
                value: subgraphName,
              },
            },
          ],
        })),
      ] as typeof typeNode.directives;
      typeNode = { ...typeNode, directives: typeNodeDirectives };
    }
    let isOrphan = true;
    // END TODO
    const fieldDefinitionNodesByGraphName = new Map<string, FieldDefinitionNode[]>();
    typeNode.directives?.forEach(directiveNode => {
      if (typeNode.kind === Kind.OBJECT_TYPE_DEFINITION) {
        if (directiveNode.name.value === 'join__owner') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode.value?.kind === Kind.ENUM) {
              typeNameCanonicalMap.set(typeNode.name.value, argumentNode.value.value);
            }
          });
        }
      }
      if (directiveNode.name.value === 'join__type') {
        isOrphan = false;
        const joinTypeGraphArgNode = directiveNode.arguments?.find(
          argumentNode => argumentNode.name.value === 'graph',
        );
        if (joinTypeGraphArgNode?.value?.kind === Kind.ENUM) {
          const graphName = joinTypeGraphArgNode.value.value;
          const fieldDefinitionNodesOfSubgraph: FieldDefinitionNode[] = [];
          typeNode.fields?.forEach(fieldNode => {
            const joinFieldDirectives = fieldNode.directives?.filter(
              directiveNode => directiveNode.name.value === 'join__field',
            );
            let notInSubgraph = true;
            joinFieldDirectives?.forEach(joinFieldDirectiveNode => {
              const joinFieldGraphArgNode = joinFieldDirectiveNode.arguments?.find(
                argumentNode => argumentNode.name.value === 'graph',
              );
              if (
                joinFieldGraphArgNode?.value?.kind === Kind.ENUM &&
                joinFieldGraphArgNode.value.value === graphName
              ) {
                notInSubgraph = false;
                const isExternal = joinFieldDirectiveNode.arguments?.some(
                  argumentNode =>
                    argumentNode.name.value === 'external' &&
                    argumentNode.value?.kind === Kind.BOOLEAN &&
                    argumentNode.value.value === true,
                );
                const isOverridden = joinFieldDirectiveNode.arguments?.some(
                  argumentNode =>
                    argumentNode.name.value === 'usedOverridden' &&
                    argumentNode.value?.kind === Kind.BOOLEAN &&
                    argumentNode.value.value === true,
                );
                if (isExternal) {
                  let externalFieldsByType = subgraphExternalFieldMap.get(graphName);
                  if (!externalFieldsByType) {
                    externalFieldsByType = new Map();
                    subgraphExternalFieldMap.set(graphName, externalFieldsByType);
                  }
                  let externalFields = externalFieldsByType.get(typeNode.name.value);
                  if (!externalFields) {
                    externalFields = new Set();
                    externalFieldsByType.set(typeNode.name.value, externalFields);
                  }
                  externalFields.add(fieldNode.name.value);
                }
                if (!isExternal && !isOverridden) {
                  const typeArg = joinFieldDirectiveNode.arguments?.find(
                    argumentNode => argumentNode.name.value === 'type',
                  );
                  const typeNode =
                    typeArg?.value.kind === Kind.STRING
                      ? parseType(typeArg.value.value)
                      : fieldNode.type;
                  fieldDefinitionNodesOfSubgraph.push({
                    ...fieldNode,
                    type: typeNode,
                    directives: filterDirectivesByGraph(graphName, fieldNode.directives, [
                      'join__field',
                    ]),
                  });
                }

                const overrideFromArg = joinFieldDirectiveNode.arguments?.find(
                  argumentNode => argumentNode.name.value === 'override',
                );
                let overrideFromSubgraph: string | undefined;
                if (overrideFromArg?.value?.kind === Kind.STRING) {
                  overrideFromSubgraph = overrideFromArg.value.value;
                }
                const overrideLabelArg = joinFieldDirectiveNode.arguments?.find(
                  argumentNode => argumentNode.name.value === 'overrideLabel',
                );
                let overrideLabel: string | undefined;
                if (overrideLabelArg?.value?.kind === Kind.STRING) {
                  overrideLabel = overrideLabelArg.value.value;
                }

                if (overrideFromSubgraph && overrideLabel != null) {
                  let subgraphPossibilities = progressiveOverrideInfos.get(graphName);
                  if (!subgraphPossibilities) {
                    subgraphPossibilities = new Map();
                    progressiveOverrideInfos.set(graphName, subgraphPossibilities);
                  }
                  let existingInfos = subgraphPossibilities.get(typeNode.name.value);
                  if (!existingInfos) {
                    existingInfos = [];
                    subgraphPossibilities.set(typeNode.name.value, existingInfos);
                  }
                  existingInfos.push({
                    field: fieldNode.name.value,
                    from: overrideFromSubgraph,
                    label: overrideLabel,
                  });
                  if (!overrideLabel.startsWith('percent(')) {
                    overrideLabels.add(overrideLabel);
                  }
                  const oppositeKey =
                    subgraphNameToEnumId.get(overrideFromSubgraph) ??
                    constantCase(overrideFromSubgraph);
                  let oppositeInfos = progressiveOverrideInfosOpposite.get(oppositeKey);
                  if (!oppositeInfos) {
                    oppositeInfos = new Map();
                    progressiveOverrideInfosOpposite.set(oppositeKey, oppositeInfos);
                  }
                  let existingOppositeInfos = oppositeInfos.get(typeNode.name.value);
                  if (!existingOppositeInfos) {
                    existingOppositeInfos = [];
                    oppositeInfos.set(typeNode.name.value, existingOppositeInfos);
                  }
                  existingOppositeInfos.push({
                    field: fieldNode.name.value,
                    to: graphName,
                    label: overrideLabel,
                  });
                }

                const providedExtraField = joinFieldDirectiveNode.arguments?.find(
                  argumentNode => argumentNode.name.value === 'provides',
                );
                if (providedExtraField?.value?.kind === Kind.STRING) {
                  const providesSelectionSet = parseSelectionSet(
                    /* GraphQL */ `{ ${providedExtraField.value.value} }`,
                  );
                  let typeNameFieldProvidedSelectionMap =
                    subgraphTypeNameFieldProvidedSelectionMap.get(graphName);
                  if (!typeNameFieldProvidedSelectionMap) {
                    typeNameFieldProvidedSelectionMap = new Map();
                    subgraphTypeNameFieldProvidedSelectionMap.set(
                      graphName,
                      typeNameFieldProvidedSelectionMap,
                    );
                  }
                  // Helper used both for the top-level @provides registration
                  // and for nested propagation. We propagate provides info to
                  // every (parentType, field) pair along the path so that the
                  // delegation planner stops re-fetching fields that the
                  // providing subgraph already returned at deeper levels (e.g.
                  // `@provides(fields: "categories { name subCategories { name } }")`).
                  function registerProvidedSelectionForField(
                    parentTypeName: string,
                    fieldName: string,
                    selectionSet: SelectionSetNode,
                  ) {
                    let fieldMap = typeNameFieldProvidedSelectionMap!.get(parentTypeName);
                    if (!fieldMap) {
                      fieldMap = new Map();
                      typeNameFieldProvidedSelectionMap!.set(parentTypeName, fieldMap);
                    }
                    const existing = fieldMap.get(fieldName);
                    if (existing) {
                      // Merge selections from multiple @provides declarations
                      // touching the same (parentType, field). Duplicates are
                      // harmless – stitchingInfo.ts later visits the selection
                      // set and ensures __typename and uniqueness via the
                      // subtraction logic.
                      fieldMap.set(fieldName, {
                        kind: Kind.SELECTION_SET,
                        selections: [...existing.selections, ...selectionSet.selections],
                      });
                    } else {
                      fieldMap.set(fieldName, selectionSet);
                    }
                  }
                  registerProvidedSelectionForField(
                    typeNode.name.value,
                    fieldNode.name.value,
                    providesSelectionSet,
                  );
                  function handleSelection(fieldNodeTypeName: string, selection: SelectionNode) {
                    switch (selection.kind) {
                      case Kind.FIELD:
                        {
                          const extraFieldTypeNode = supergraphAst.definitions.find(
                            def => 'name' in def && def.name?.value === fieldNodeTypeName,
                          ) as ObjectTypeDefinitionNode;
                          const extraFieldNodeInType = extraFieldTypeNode.fields?.find(
                            fieldNode => fieldNode.name.value === selection.name.value,
                          );
                          if (extraFieldNodeInType) {
                            let typeNameProvidedMap = subgraphTypeNameProvidedMap.get(graphName);
                            if (!typeNameProvidedMap) {
                              typeNameProvidedMap = new Map();
                              subgraphTypeNameProvidedMap.set(graphName, typeNameProvidedMap);
                            }
                            let providedFields = typeNameProvidedMap.get(fieldNodeTypeName);
                            if (!providedFields) {
                              providedFields = new Set();
                              typeNameProvidedMap.set(fieldNodeTypeName, providedFields);
                            }
                            providedFields.add(selection.name.value);

                            // Do not register nested provided selections keyed only by
                            // (parentType, field): those apply even when the object was not
                            // resolved through the declaring @provides path. The top-level
                            // registration below carries the full selection for that path;
                            // the stitch planner matches it via parentFieldName.
                            if (selection.selectionSet) {
                              const extraFieldNodeNamedType = getNamedTypeNode(
                                extraFieldNodeInType.type,
                              );
                              const extraFieldNodeTypeName = extraFieldNodeNamedType.name.value;
                              for (const subSelection of selection.selectionSet.selections) {
                                handleSelection(extraFieldNodeTypeName, subSelection);
                              }
                            }
                          }
                        }
                        break;
                      case Kind.INLINE_FRAGMENT:
                        {
                          const fragmentType =
                            selection.typeCondition?.name?.value || fieldNodeType.name.value;
                          if (selection.selectionSet) {
                            for (const subSelection of selection.selectionSet.selections) {
                              handleSelection(fragmentType, subSelection);
                            }
                          }
                        }
                        break;
                    }
                  }
                  const fieldNodeType = getNamedTypeNode(fieldNode.type);
                  const fieldNodeTypeName = fieldNodeType.name.value;
                  for (const selection of providesSelectionSet.selections) {
                    handleSelection(fieldNodeTypeName, selection);
                  }
                }

                const requiresArgumentNode = joinFieldDirectiveNode.arguments?.find(
                  argumentNode => argumentNode.name.value === 'requires',
                );
                if (requiresArgumentNode?.value?.kind === Kind.STRING) {
                  let typeNameFieldsKeyMap = typeNameFieldsKeyBySubgraphMap.get(graphName);
                  if (!typeNameFieldsKeyMap) {
                    typeNameFieldsKeyMap = new Map();
                    typeNameFieldsKeyBySubgraphMap.set(graphName, typeNameFieldsKeyMap);
                  }
                  let fieldsKeyMap = typeNameFieldsKeyMap.get(typeNode.name.value);
                  if (!fieldsKeyMap) {
                    fieldsKeyMap = new Map();
                    typeNameFieldsKeyMap.set(typeNode.name.value, fieldsKeyMap);
                  }
                  fieldsKeyMap.set(fieldNode.name.value, requiresArgumentNode.value.value);
                }
              }
            });
            // Add if no join__field directive
            const keys = typeNameKeysBySubgraphMap.get(graphName)?.get(typeNode.name.value);
            const keysArr = keys && Array.from(keys);
            if (!joinFieldDirectives?.length) {
              fieldDefinitionNodesOfSubgraph.push({
                ...fieldNode,
                directives: filterDirectivesByGraph(graphName, fieldNode.directives, [
                  'join__field',
                ]),
              });
            } else if (
              notInSubgraph &&
              keysArr?.some(key => key.split(' ').includes(fieldNode.name.value))
            ) {
              fieldDefinitionNodesOfSubgraph.push({
                ...fieldNode,
                directives: filterDirectivesByGraph(graphName, fieldNode.directives, [
                  'join__field',
                ]),
              });
            }
          });
          fieldDefinitionNodesByGraphName.set(graphName, fieldDefinitionNodesOfSubgraph);

          if (
            typeNode.kind === Kind.OBJECT_TYPE_DEFINITION ||
            typeNode.kind === Kind.INTERFACE_TYPE_DEFINITION
          ) {
            const keyArgumentNode = directiveNode.arguments?.find(
              argumentNode => argumentNode.name.value === 'key',
            );
            const isResolvable = !directiveNode.arguments?.some(
              argumentNode =>
                argumentNode.name.value === 'resolvable' &&
                argumentNode.value?.kind === Kind.BOOLEAN &&
                argumentNode.value.value === false,
            );

            if (keyArgumentNode?.value?.kind === Kind.STRING) {
              const keyArgVal = keyArgumentNode.value.value;
              if (isResolvable) {
                if (
                  typeNode.kind !== Kind.OBJECT_TYPE_DEFINITION ||
                  !keySelectionIncludesAllFields(keyArgVal, fieldDefinitionNodesOfSubgraph)
                ) {
                  let typeNameKeysMap = typeNameKeysBySubgraphMap.get(graphName);
                  if (!typeNameKeysMap) {
                    typeNameKeysMap = new Map();
                    typeNameKeysBySubgraphMap.set(graphName, typeNameKeysMap);
                  }
                  let keys = typeNameKeysMap.get(typeNode.name.value);
                  if (!keys) {
                    keys = new Set();
                    typeNameKeysMap.set(typeNode.name.value, keys);
                  }
                  keys.add(keyArgVal);
                }
              }
            }
          }
        }
      }
    });
    const joinImplementsDirectives = typeNode.directives?.filter(
      directiveNode => directiveNode.name.value === 'join__implements',
    );
    fieldDefinitionNodesByGraphName.forEach((fieldDefinitionNodesOfSubgraph, graphName) => {
      const interfaces: NamedTypeNode[] = [];
      typeNode.interfaces?.forEach(interfaceNode => {
        const implementedSubgraphs = joinImplementsDirectives?.filter(directiveNode => {
          const argumentNode = directiveNode.arguments?.find(
            argumentNode => argumentNode.name.value === 'interface',
          );
          return (
            argumentNode?.value?.kind === Kind.STRING &&
            argumentNode.value.value === interfaceNode.name.value
          );
        });
        if (
          !implementedSubgraphs?.length ||
          implementedSubgraphs.some(directiveNode => {
            const argumentNode = directiveNode.arguments?.find(
              argumentNode => argumentNode.name.value === 'graph',
            );
            return (
              argumentNode?.value?.kind === Kind.ENUM && argumentNode.value.value === graphName
            );
          })
        ) {
          interfaces.push(interfaceNode);
        }
      });
      if (typeNode.name.value === 'Query') {
        fieldDefinitionNodesOfSubgraph.push(entitiesFieldDefinitionNode);
      }
      const objectTypedDefNodeForSubgraph: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode =
        {
          ...typeNode,
          interfaces,
          fields: fieldDefinitionNodesOfSubgraph,
          directives: filterDirectivesByGraph(graphName, typeNode.directives, [
            'join__type',
            'join__owner',
            'join__implements',
          ]),
        };
      let subgraphTypes = subgraphTypesMap.get(graphName);
      if (!subgraphTypes) {
        subgraphTypes = [];
        subgraphTypesMap.set(graphName, subgraphTypes);
      }
      subgraphTypes.push(objectTypedDefNodeForSubgraph);
    });
    if (isOrphan) {
      orphanTypeMap.set(typeNode.name.value, typeNode);
    }
  }
  // Pre-index join__Graph so progressive-override lookups can resolve declared names
  // before object types are visited (definition order is not guaranteed).
  for (const definition of supergraphAst.definitions) {
    if (definition.kind !== Kind.ENUM_TYPE_DEFINITION || definition.name.value !== 'join__Graph') {
      continue;
    }
    for (const valueNode of definition.values ?? []) {
      for (const directiveNode of valueNode.directives ?? []) {
        if (directiveNode.name.value !== 'join__graph') {
          continue;
        }
        let declaredName: string | undefined;
        let url: string | undefined;
        for (const argumentNode of directiveNode.arguments ?? []) {
          if (argumentNode.name.value === 'url' && argumentNode.value?.kind === Kind.STRING) {
            url = argumentNode.value.value;
          }
          if (argumentNode.name.value === 'name' && argumentNode.value?.kind === Kind.STRING) {
            declaredName = argumentNode.value.value;
          }
        }
        if (url != null) {
          subgraphEndpointMap.set(valueNode.name.value, url);
        }
        if (declaredName != null) {
          subgraphNameToEnumId.set(declaredName, valueNode.name.value);
        }
        subgraphNameToEnumId.set(valueNode.name.value, valueNode.name.value);
      }
    }
  }
  visit(supergraphAst, {
    ScalarTypeDefinition(node) {
      let isOrphan = !node.name.value.startsWith('link__') && !node.name.value.startsWith('join__');
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode?.value?.kind === Kind.ENUM) {
              isOrphan = false;
              const graphName = argumentNode.value.value;
              let subgraphTypes = subgraphTypesMap.get(graphName);
              if (!subgraphTypes) {
                subgraphTypes = [];
                subgraphTypesMap.set(graphName, subgraphTypes);
              }
              subgraphTypes.push({
                ...node,
                directives: filterDirectivesByGraph(graphName, node.directives, ['join__type']),
              });
            }
          });
        }
      });
      if (isOrphan) {
        orphanTypeMap.set(node.name.value, node);
      }
    },
    InputObjectTypeDefinition(node) {
      let isOrphan = true;
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode?.value?.kind === Kind.ENUM) {
              isOrphan = false;
              const graphName = argumentNode.value.value;
              let subgraphTypes = subgraphTypesMap.get(graphName);
              if (!subgraphTypes) {
                subgraphTypes = [];
                subgraphTypesMap.set(graphName, subgraphTypes);
              }
              subgraphTypes.push({
                ...node,
                directives: filterDirectivesByGraph(graphName, node.directives, ['join__type']),
              });
            }
          });
        }
      });
      if (isOrphan) {
        orphanTypeMap.set(node.name.value, node);
      }
    },
    InterfaceTypeDefinition: TypeWithFieldsVisitor,
    UnionTypeDefinition(node) {
      let isOrphan = true;
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode?.value?.kind === Kind.ENUM) {
              isOrphan = false;
              const graphName = argumentNode.value.value;
              const unionMembers: NamedTypeNode[] = [];
              node.directives?.forEach(directiveNode => {
                if (directiveNode.name.value === 'join__unionMember') {
                  const graphArgumentNode = directiveNode.arguments?.find(
                    argumentNode => argumentNode.name.value === 'graph',
                  );
                  const memberArgumentNode = directiveNode.arguments?.find(
                    argumentNode => argumentNode.name.value === 'member',
                  );
                  if (
                    graphArgumentNode?.value?.kind === Kind.ENUM &&
                    graphArgumentNode.value.value === graphName &&
                    memberArgumentNode?.value?.kind === Kind.STRING
                  ) {
                    unionMembers.push({
                      kind: Kind.NAMED_TYPE,
                      name: {
                        kind: Kind.NAME,
                        value: memberArgumentNode.value.value,
                      },
                    });
                  }
                }
              });
              // join v0.2 has no @join__unionMember; recover members from the SDL
              // definition, restricted to types present in this graph.
              let membersForGraph = unionMembers;
              if (membersForGraph.length === 0) {
                const typesInGraph = new Set(
                  (subgraphTypesMap.get(graphName) ?? []).map(t => t.name.value),
                );
                // Also treat the enum/object types already keyed for this graph via join__type
                // on other definitions; fall back to SDL members that appear anywhere in the
                // subgraph type map OR are not yet known (added later) by checking orphan/keys.
                membersForGraph = (node.types ?? []).filter(member => {
                  const memberName = member.name.value;
                  if (typesInGraph.has(memberName)) {
                    return true;
                  }
                  // Include SDL members that this graph owns via join__type on the member type.
                  return supergraphAst.definitions.some(def => {
                    if (
                      !('name' in def) ||
                      def.name?.value !== memberName ||
                      !('directives' in def)
                    ) {
                      return false;
                    }
                    return (def.directives as ConstDirectiveNode[] | undefined)?.some(
                      d =>
                        d.name.value === 'join__type' &&
                        d.arguments?.some(
                          a =>
                            a.name.value === 'graph' &&
                            a.value?.kind === Kind.ENUM &&
                            a.value.value === graphName,
                        ),
                    );
                  });
                });
              }
              if (membersForGraph.length > 0) {
                let subgraphTypes = subgraphTypesMap.get(graphName);
                if (!subgraphTypes) {
                  subgraphTypes = [];
                  subgraphTypesMap.set(graphName, subgraphTypes);
                }
                subgraphTypes.push({
                  ...node,
                  types: membersForGraph,
                  directives: filterDirectivesByGraph(graphName, node.directives, [
                    'join__type',
                    'join__unionMember',
                  ]),
                });
              }
            }
          });
        }
      });
      if (isOrphan && node.name.value !== '_Entity') {
        orphanTypeMap.set(node.name.value, node);
      }
    },
    EnumTypeDefinition(node) {
      let isOrphan = true;
      if (node.name.value === 'join__Graph') {
        node.values?.forEach(valueNode => {
          isOrphan = false;
          valueNode.directives?.forEach(directiveNode => {
            if (directiveNode.name.value === 'join__graph') {
              let declaredName: string | undefined;
              let url: string | undefined;
              directiveNode.arguments?.forEach(argumentNode => {
                if (argumentNode.name.value === 'url' && argumentNode.value?.kind === Kind.STRING) {
                  url = argumentNode.value.value;
                }
                if (
                  argumentNode.name.value === 'name' &&
                  argumentNode.value?.kind === Kind.STRING
                ) {
                  declaredName = argumentNode.value.value;
                }
              });
              if (url != null) {
                subgraphEndpointMap.set(valueNode.name.value, url);
              }
              if (declaredName != null) {
                subgraphNameToEnumId.set(declaredName, valueNode.name.value);
              }
              // Enum identifier also resolves as itself for overrideFrom lookups.
              subgraphNameToEnumId.set(valueNode.name.value, valueNode.name.value);
            }
          });
        });
      }
      node.directives?.forEach(directiveNode => {
        if (directiveNode.name.value === 'join__type') {
          isOrphan = false;
          directiveNode.arguments?.forEach(argumentNode => {
            if (argumentNode.name.value === 'graph' && argumentNode.value?.kind === Kind.ENUM) {
              const graphName = argumentNode.value.value;
              const enumValueNodes: EnumValueDefinitionNode[] = [];
              node.values?.forEach(valueNode => {
                const joinEnumValueDirectives = valueNode.directives?.filter(
                  directiveNode => directiveNode.name.value === 'join__enumValue',
                );
                if (joinEnumValueDirectives?.length) {
                  joinEnumValueDirectives.forEach(joinEnumValueDirectiveNode => {
                    joinEnumValueDirectiveNode.arguments?.forEach(argumentNode => {
                      if (
                        argumentNode.name.value === 'graph' &&
                        argumentNode.value?.kind === Kind.ENUM &&
                        argumentNode.value.value === graphName
                      ) {
                        enumValueNodes.push({
                          ...valueNode,
                          directives: valueNode.directives?.filter(
                            directiveNode => directiveNode.name.value !== 'join__enumValue',
                          ),
                        });
                      }
                    });
                  });
                } else {
                  enumValueNodes.push(valueNode);
                }
              });
              const enumTypedDefNodeForSubgraph: EnumTypeDefinitionNode = {
                ...node,
                directives: filterDirectivesByGraph(graphName, node.directives, ['join__type']),
                values: enumValueNodes,
              };
              let subgraphTypes = subgraphTypesMap.get(graphName);
              if (!subgraphTypes) {
                subgraphTypes = [];
                subgraphTypesMap.set(graphName, subgraphTypes);
              }
              subgraphTypes.push(enumTypedDefNodeForSubgraph);
            }
          });
        }
      });
      if (isOrphan) {
        orphanTypeMap.set(node.name.value, node);
      }
    },
    ObjectTypeDefinition: TypeWithFieldsVisitor,
  });
  // Get schema-level subgraph specific directives (definitions and extensions).
  for (const definition of supergraphAst.definitions) {
    if (definition.kind !== Kind.SCHEMA_DEFINITION && definition.kind !== Kind.SCHEMA_EXTENSION) {
      continue;
    }
    if (definition.directives) {
      for (const directiveNode of definition.directives) {
        const parsed = parseJoinDirective(directiveNode);
        if (parsed) {
          for (const graphName of parsed.graphNames) {
            let subgraphSchemaLevelDefs = subgraphSchemaDefinitionDirectives.get(graphName);
            if (!subgraphSchemaLevelDefs) {
              subgraphSchemaLevelDefs = [];
              subgraphSchemaDefinitionDirectives.set(graphName, subgraphSchemaLevelDefs);
            }
            subgraphSchemaLevelDefs.push(parsed.directive);
          }
        }
      }
    }
  }
  const subschemas: SubschemaConfig[] = [];
  // Shared across destination/source subgraphs so percent decisions stay complementary.
  const complementaryPercentHandlersByKey = new Map<
    string,
    ReturnType<typeof createComplementaryPercentOverrideHandlers>
  >();
  for (const [subgraphName, endpoint] of subgraphEndpointMap) {
    const mergeConfig: SubschemaConfig['merge'] = {};
    const typeNameKeyMap = typeNameKeysBySubgraphMap.get(subgraphName);
    const unionTypeNodes: NamedTypeNode[] = [];
    // Tracks additional merge configs needed when computed fields have conflicting @requires
    // (same external field required with different argument values by different computed fields).
    // Each entry results in a separate SubschemaConfig so each gets its own entity representation.
    const pendingConflictSubschemaConfigs: Array<{
      typeName: string;
      mergeTypeConfig: MergedTypeConfig;
      groupExtraKeys: Set<string>;
    }> = [];
    if (typeNameKeyMap) {
      const typeNameFieldsKeyMap = typeNameFieldsKeyBySubgraphMap.get(subgraphName);
      for (const [typeName, keys] of typeNameKeyMap) {
        const mergedTypeConfig: MergedTypeConfig = (mergeConfig[typeName] = {});
        const fieldsKeyMap = typeNameFieldsKeyMap?.get(typeName);
        // Main group's extraKeys (used by the primary merge config for this type)
        const extraKeys = new Set<string>();
        if (fieldsKeyMap) {
          const mainFieldsConfig: Record<string, MergedFieldConfig> = (mergedTypeConfig.fields =
            {});

          // Group computed fields to avoid conflicts. Two computed fields conflict
          // when they @require the same external field with different argument values
          // (e.g. price(currency:"USD") vs price(currency:"EUR")). Fields in
          // conflicting groups need separate entity representations sent to the
          // subgraph, so they are put into separate SubschemaConfigs.
          type ConflictGroup = {
            extraKeys: Set<string>;
            fieldsConfig: Record<string, MergedFieldConfig>;
            // Maps original field name -> alias for top-level aliased fields
            aliasedFields: Map<string, string>;
          };
          const groups: ConflictGroup[] = [
            {
              extraKeys,
              fieldsConfig: mainFieldsConfig,
              aliasedFields: new Map(),
            },
          ];

          // Build a stable djb2 hash of a string, returned as a base-36
          // alphanumeric string safe for use inside a GraphQL Name.
          function hashStringToAlphanumeric(str: string): string {
            let hash = 5381;
            for (let index = 0; index < str.length; index++) {
              hash = (Math.imul(hash, 33) ^ str.charCodeAt(index)) | 0;
            }
            return (hash >>> 0).toString(36);
          }

          // Distinct normalizedArgs signatures always get distinct aliases (do not
          // rely on the 32-bit hash alone); reuse the same alias for the same signature.
          const aliasBySignature = new Map<string, string>();
          let aliasCollisionCounter = 0;

          function aliasForSignature(fieldName: string, normalizedArgs: string): string {
            const existing = aliasBySignature.get(normalizedArgs);
            if (existing) {
              return existing;
            }
            let alias = '_' + fieldName + '_' + hashStringToAlphanumeric(normalizedArgs);
            while ([...aliasBySignature.values()].includes(alias)) {
              aliasCollisionCounter++;
              alias =
                '_' +
                fieldName +
                '_' +
                hashStringToAlphanumeric(normalizedArgs + '#' + aliasCollisionCounter);
            }
            aliasBySignature.set(normalizedArgs, alias);
            return alias;
          }

          function aliasFieldsWithArgs(selectionSetNode: SelectionSetNode): void {
            for (const selection of selectionSetNode.selections) {
              if (selection.kind === Kind.FIELD && selection.arguments?.length) {
                // Build a stable, unambiguous signature by sorting args by
                // name (order-independence) and hashing the full printed
                // representation (preserves punctuation/quoting differences).
                const normalizedArgs = [...selection.arguments]
                  .sort((a, b) => a.name.value.localeCompare(b.name.value))
                  .map(arg => `${arg.name.value}:${memoizedASTPrint(arg.value)}`)
                  .join(',');
                // @ts-expect-error it's ok we're mutating consciously
                selection.alias = {
                  kind: Kind.NAME,
                  value: aliasForSignature(selection.name.value, normalizedArgs),
                };
              }
              if ('selectionSet' in selection && selection.selectionSet) {
                aliasFieldsWithArgs(selection.selectionSet);
              }
            }
          }

          /** Compact selection printing without collapsing whitespace inside string literals. */
          function printSelectionSetPreservingStrings(selectionSetNode: SelectionSetNode): string {
            const printed = print(selectionSetNode);
            let out = '';
            let i = 0;
            while (i < printed.length) {
              if (printed.startsWith('"""', i)) {
                const end = printed.indexOf('"""', i + 3);
                if (end === -1) {
                  out += printed.slice(i);
                  break;
                }
                out += printed.slice(i, end + 3);
                i = end + 3;
                continue;
              }
              if (printed[i] === '"') {
                out += '"';
                i++;
                while (i < printed.length) {
                  if (printed[i] === '\\') {
                    out += printed[i]! + (printed[i + 1] ?? '');
                    i += 2;
                    continue;
                  }
                  out += printed[i];
                  if (printed[i] === '"') {
                    i++;
                    break;
                  }
                  i++;
                }
                continue;
              }
              if (printed[i] === '\n' || printed[i] === '\r' || printed[i] === '\t') {
                out += ' ';
                i++;
                continue;
              }
              if (printed[i] === ' ') {
                if (out.endsWith(' ')) {
                  i++;
                  continue;
                }
                out += ' ';
                i++;
                continue;
              }
              out += printed[i];
              i++;
            }
            return out.trim();
          }

          function collectAliasedFieldPaths(
            selectionSetNode: SelectionSetNode,
            parentPath: string,
            into: Map<string, string>,
          ): void {
            for (const sel of selectionSetNode.selections) {
              if (sel.kind === Kind.FIELD) {
                const path = parentPath ? `${parentPath}.${sel.name.value}` : sel.name.value;
                if (sel.alias) {
                  into.set(path, sel.alias.value);
                }
                if (sel.selectionSet) {
                  collectAliasedFieldPaths(sel.selectionSet, path, into);
                }
              } else if (sel.kind === Kind.INLINE_FRAGMENT && sel.selectionSet) {
                collectAliasedFieldPaths(sel.selectionSet, parentPath, into);
              }
            }
          }

          for (const [fieldName, fieldNameKey] of fieldsKeyMap) {
            const selectionSetNode = parseSelectionSet(`{${fieldNameKey}}`);
            aliasFieldsWithArgs(selectionSetNode);
            const selectionSet = printSelectionSetPreservingStrings(selectionSetNode);
            const extraKey =
              // remove first and last characters (curly braces)
              selectionSet.slice(1, -1).trim();

            // Track aliased fields by full nested path so conflicting nested values stay separate.
            const fieldAliasedNames = new Map<string, string>();
            collectAliasedFieldPaths(selectionSetNode, '', fieldAliasedNames);

            // Find the first existing group that has no conflict with this field
            let targetGroup: ConflictGroup | undefined;
            for (const group of groups) {
              let hasConflict = false;
              for (const [origName, aliasName] of fieldAliasedNames) {
                const existingAlias = group.aliasedFields.get(origName);
                if (existingAlias !== undefined && existingAlias !== aliasName) {
                  hasConflict = true;
                  break;
                }
              }
              if (!hasConflict) {
                targetGroup = group;
                break;
              }
            }

            if (!targetGroup) {
              // No compatible group — create a new conflict group
              const newExtraKeys = new Set<string>();
              const newFieldsConfig: Record<string, MergedFieldConfig> = {};
              targetGroup = {
                extraKeys: newExtraKeys,
                fieldsConfig: newFieldsConfig,
                aliasedFields: new Map(),
              };
              groups.push(targetGroup);
            }

            targetGroup.extraKeys.add(extraKey);
            targetGroup.fieldsConfig[fieldName] = {
              selectionSet,
              computed: true,
            };
            for (const [origName, aliasName] of fieldAliasedNames) {
              targetGroup.aliasedFields.set(origName, aliasName);
            }
          }

          // Register additional conflict groups as pending separate SubschemaConfigs.
          // They share the same schema/executor but have a different entity key that
          // maps only their own required aliased fields to avoid overwriting each other.
          for (const group of groups.slice(1)) {
            const additionalMergeTypeConfig: MergedTypeConfig = {
              fields: group.fieldsConfig,
            };
            if (typeNameCanonicalMap.get(typeName) === subgraphName) {
              additionalMergeTypeConfig.canonical = true;
            }
            pendingConflictSubschemaConfigs.push({
              typeName,
              // Store closure-captured values for later SubschemaConfig creation
              // by borrowing getMergedTypeConfigFromKey with the group's extraKeys.
              mergeTypeConfig: additionalMergeTypeConfig,
              groupExtraKeys: group.extraKeys,
            });
          }
        }
        if (typeNameCanonicalMap.get(typeName) === subgraphName) {
          mergedTypeConfig.canonical = true;
        }

        function getMergedTypeConfigFromKey(key: string, keysExtraKeys: Set<string> = extraKeys) {
          return {
            selectionSet: `{ ${key} }`,
            argsFromKeys: getArgsFromKeysForFederation,
            key: getKeyFnForFederation(typeName, [key, ...keysExtraKeys]),
            fieldName: `_entities`,
            dataLoaderOptions: {
              cacheKeyFn: getCacheKeyFnFromKey(key),
              ...(opts.batchDelegateOptions || {}),
            },
          };
        }

        const keysArr = Array.from(keys);
        if (keysArr.length === 1 && keysArr[0]) {
          Object.assign(mergedTypeConfig, getMergedTypeConfigFromKey(keysArr[0]));
        }
        if (keysArr.length > 1) {
          const entryPoints = keysArr.map(key => getMergedTypeConfigFromKey(key));
          mergedTypeConfig.entryPoints = entryPoints;
        }

        // Finalize the additional merge type configs now that getMergedTypeConfigFromKey
        // is available in scope. We attach the entity-key configuration using each
        // conflict group's own extraKeys so their entity representations don't clash.
        for (const pending of pendingConflictSubschemaConfigs) {
          if (
            pending.typeName === typeName &&
            !('selectionSet' in pending.mergeTypeConfig) &&
            !('entryPoints' in pending.mergeTypeConfig)
          ) {
            const groupExtraKeys = pending.groupExtraKeys;
            if (keysArr.length === 1 && keysArr[0]) {
              Object.assign(
                pending.mergeTypeConfig,
                getMergedTypeConfigFromKey(keysArr[0], groupExtraKeys),
              );
            } else if (keysArr.length > 1) {
              pending.mergeTypeConfig.entryPoints = keysArr.map(key =>
                getMergedTypeConfigFromKey(key, groupExtraKeys),
              );
            }
            // Apply the same customization hook callers use for the main config
            // so per-group merge type configs receive the same transformations.
            opts.onMergedTypeConfig?.(pending.typeName, pending.mergeTypeConfig);
          }
        }

        unionTypeNodes.push({
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: typeName,
          },
        });

        opts.onMergedTypeConfig?.(typeName, mergedTypeConfig);
      }
    }

    const typeNameProvidedSelectionMap =
      subgraphTypeNameFieldProvidedSelectionMap.get(subgraphName);
    if (typeNameProvidedSelectionMap) {
      for (const [typeName, fieldSelectionMap] of typeNameProvidedSelectionMap) {
        const mergedTypeConfig: MergedTypeConfig = (mergeConfig[typeName] ||= {});
        const fieldsConfig: Record<string, MergedFieldConfig> = (mergedTypeConfig.fields ||= {});
        for (const [fieldName, selectionSet] of fieldSelectionMap) {
          // Preserve existing computed / selectionSet (@requires) when adding provides.
          const existing = fieldsConfig[fieldName] ?? {};
          fieldsConfig[fieldName] = {
            ...existing,
            provides: selectionSet,
          };
        }
      }
    }
    const entitiesUnionTypeDefinitionNode: UnionTypeDefinitionNode = {
      name: {
        kind: Kind.NAME,
        value: '_Entity',
      },
      kind: Kind.UNION_TYPE_DEFINITION,
      types: unionTypeNodes,
    };

    const extraOrphanTypesForSubgraph = new Map<string, TypeDefinitionNode>();
    function visitTypeDefinitionsForOrphanTypes(node: TypeDefinitionNode) {
      function visitNamedTypeNode(namedTypeNode: NamedTypeNode) {
        const typeName = namedTypeNode.name.value;
        if (specifiedTypeNames.includes(typeName)) {
          return node;
        }
        const orphanType = orphanTypeMap.get(typeName);
        if (orphanType) {
          if (!extraOrphanTypesForSubgraph.has(typeName)) {
            extraOrphanTypesForSubgraph.set(typeName, {} as any);
            const extraOrphanType = visitTypeDefinitionsForOrphanTypes(orphanType);
            extraOrphanTypesForSubgraph.set(typeName, extraOrphanType);
          }
        } else if (!subgraphTypes.some(typeNode => typeNode.name.value === typeName)) {
          return null;
        }
        return node;
      }
      function visitFieldDefs<TFieldDef extends InputValueDefinitionNode | FieldDefinitionNode>(
        nodeFields?: readonly TFieldDef[] | undefined,
      ): TFieldDef[] {
        const fields: TFieldDef[] = [];
        for (const field of nodeFields || []) {
          const isTypeNodeOk = visitNamedTypeNode(getNamedTypeNode(field.type) as NamedTypeNode);
          if (!isTypeNodeOk) {
            continue;
          }
          if (field.kind === Kind.FIELD_DEFINITION) {
            const args: InputValueDefinitionNode[] = visitFieldDefs(field.arguments);
            fields.push({
              ...field,
              arguments: args,
            });
          } else {
            fields.push(field);
          }
        }
        return fields;
      }
      function visitObjectAndInterfaceDefs(
        node:
          | ObjectTypeDefinitionNode
          | InterfaceTypeDefinitionNode
          | ObjectTypeExtensionNode
          | InterfaceTypeExtensionNode,
      ) {
        const fields: FieldDefinitionNode[] = visitFieldDefs(node.fields);
        const interfaces: NamedTypeNode[] = [];
        for (const iface of node.interfaces || []) {
          const isTypeNodeOk = visitNamedTypeNode(iface);
          if (!isTypeNodeOk) {
            continue;
          }
          interfaces.push(iface);
        }
        return {
          ...node,
          fields,
          interfaces,
        };
      }
      return visit(node, {
        [Kind.OBJECT_TYPE_DEFINITION]: visitObjectAndInterfaceDefs,
        [Kind.OBJECT_TYPE_EXTENSION]: visitObjectAndInterfaceDefs,
        [Kind.INTERFACE_TYPE_DEFINITION]: visitObjectAndInterfaceDefs,
        [Kind.INTERFACE_TYPE_EXTENSION]: visitObjectAndInterfaceDefs,
        [Kind.UNION_TYPE_DEFINITION](node) {
          const types: NamedTypeNode[] = [];
          for (const type of node.types || []) {
            const isTypeNodeOk = visitNamedTypeNode(type);
            if (!isTypeNodeOk) {
              continue;
            }
            types.push(type);
          }
          return {
            ...node,
            types,
          };
        },
        [Kind.UNION_TYPE_EXTENSION](node) {
          const types: NamedTypeNode[] = [];
          for (const type of node.types || []) {
            const isTypeNodeOk = visitNamedTypeNode(type);
            if (!isTypeNodeOk) {
              continue;
            }
            types.push(type);
          }
          return {
            ...node,
            types,
          };
        },
        [Kind.INPUT_OBJECT_TYPE_DEFINITION](node) {
          const fields = visitFieldDefs(node.fields);
          return {
            ...node,
            fields,
          };
        },
        [Kind.INPUT_OBJECT_TYPE_EXTENSION](node) {
          const fields = visitFieldDefs(node.fields);
          return {
            ...node,
            fields,
          };
        },
      });
    }
    const subgraphTypes = subgraphTypesMap.get(subgraphName) || [];
    subgraphTypes.forEach(typeNode => {
      visitTypeDefinitionsForOrphanTypes(typeNode);
    });
    const extendedSubgraphTypes = [...subgraphTypes, ...extraOrphanTypesForSubgraph.values()];
    // We should add implemented objects from other subgraphs implemented by this interface
    for (const interfaceInSubgraph of extendedSubgraphTypes) {
      if (interfaceInSubgraph.kind === Kind.INTERFACE_TYPE_DEFINITION) {
        let isOrphan = true;
        for (const definitionNode of supergraphAst.definitions) {
          if (
            definitionNode.kind === Kind.OBJECT_TYPE_DEFINITION &&
            definitionNode.interfaces?.some(
              interfaceNode => interfaceNode.name.value === interfaceInSubgraph.name.value,
            )
          ) {
            isOrphan = false;
          }
        }
        if (isOrphan) {
          // @ts-expect-error `kind` property is a readonly field in TS definitions but it is not actually
          interfaceInSubgraph.kind = Kind.OBJECT_TYPE_DEFINITION;
        }
      }
    }
    let schema: GraphQLSchema;
    let schemaAst: DocumentNode = {
      kind: Kind.DOCUMENT,
      definitions: [
        ...extendedSubgraphTypes,
        entitiesUnionTypeDefinitionNode,
        anyTypeDefinitionNode,
      ],
    };

    interface LinkImport {
      name: string;
      as: string;
    }

    function collectTransitiveDeps(typeNames: Set<string>, into: Set<DefinitionNode>): void {
      const queue = [...typeNames];
      while (queue.length > 0) {
        const typeName = queue.shift()!;
        const def = inputDefinitions.get(typeName);
        if (!def || into.has(def)) continue;
        into.add(def);
        if (def.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION && def.fields) {
          for (const field of def.fields) {
            const fieldTypeName = getNamedTypeNode(field.type).name.value;
            if (!specifiedTypeNames.includes(fieldTypeName)) {
              queue.push(fieldTypeName);
            }
          }
        }
      }
    }

    const linkImports = new Map<string, LinkImport[]>();
    const extraDefinitions = new Set<DefinitionNode>();

    visit(schemaAst, {
      Directive(node) {
        const directiveName = node.name.value;
        const directiveDefinition = directiveDefinitions.get(directiveName);
        if (directiveDefinition && !extraDefinitions.has(directiveDefinition)) {
          extraDefinitions.add(directiveDefinition);
          const extraDefinitionsForDirective = directiveExtraDefinitions.get(directiveName);
          if (extraDefinitionsForDirective) {
            collectTransitiveDeps(extraDefinitionsForDirective, extraDefinitions);
          }
          const directiveNameInImport = `@${directiveName}`;
          const directiveImport = directiveImports.get(directiveNameInImport);
          if (directiveImport) {
            let urlImports = linkImports.get(directiveImport.url);
            if (!urlImports) {
              urlImports = [];
              linkImports.set(directiveImport.url, urlImports);
            }
            urlImports.push({
              name: directiveImport.originalName || directiveNameInImport,
              as: directiveNameInImport,
            });
          }
        }
      },
    });

    const linkDirectiveNodes: DirectiveNode[] = [];
    for (const [url, linkImportsForUrl] of linkImports) {
      const urlArg: ConstArgumentNode = {
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: 'url',
        },
        value: {
          kind: Kind.STRING,
          value: url,
        },
      };
      const importArg: ConstArgumentNode = {
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: 'import',
        },
        value: {
          kind: Kind.LIST,
          values: linkImportsForUrl.map(linkImport => {
            if (linkImport.name === linkImport.as) {
              return {
                kind: Kind.STRING,
                value: linkImport.name,
              };
            } else {
              return {
                kind: Kind.OBJECT,
                fields: [
                  {
                    kind: Kind.OBJECT_FIELD,
                    name: {
                      kind: Kind.NAME,
                      value: 'name',
                    },
                    value: {
                      kind: Kind.STRING,
                      value: linkImport.name,
                    },
                  },
                  {
                    kind: Kind.OBJECT_FIELD,
                    name: {
                      kind: Kind.NAME,
                      value: 'as',
                    },
                    value: {
                      kind: Kind.STRING,
                      value: linkImport.as,
                    },
                  },
                ],
              };
            }
          }),
        },
      };
      linkDirectiveNodes.push({
        kind: Kind.DIRECTIVE,
        name: {
          kind: Kind.NAME,
          value: 'link',
        },
        arguments: [urlArg, importArg],
      });
    }

    if (linkDirectiveNodes.length > 0) {
      const linkDirectiveDef = directiveDefinitions.get('link');
      if (linkDirectiveDef) {
        extraDefinitions.add(linkDirectiveDef);
      }
      const linkDirectiveExtraDefs = directiveExtraDefinitions.get('link');
      if (linkDirectiveExtraDefs) {
        collectTransitiveDeps(linkDirectiveExtraDefs, extraDefinitions);
      }
      extraDefinitions.add({
        kind: Kind.SCHEMA_EXTENSION,
        directives: [...linkDirectiveNodes] as ConstDirectiveNode[],
      });
    }
    const schemaDefDirectives = subgraphSchemaDefinitionDirectives.get(subgraphName);
    if (schemaDefDirectives) {
      extraDefinitions.add({
        kind: Kind.SCHEMA_EXTENSION,
        directives: schemaDefDirectives,
      });
    }

    schemaAst = {
      ...schemaAst,
      definitions: [...extraDefinitions, ...schemaAst.definitions],
    };

    if (opts.onSubgraphAST) {
      schemaAst = opts.onSubgraphAST(subgraphName, schemaAst);
    }
    try {
      schema = buildASTSchema(schemaAst, {
        assumeValidSDL: true,
        assumeValid: true,
      });
    } catch (e: any) {
      throw new Error(
        `Error building schema for subgraph ${subgraphName}: ${e?.stack || e?.message || e.toString()}`,
      );
    }
    let httpExecutorOpts: Partial<HTTPExecutorOptions>;
    if (typeof opts.httpExecutorOpts === 'function') {
      httpExecutorOpts = opts.httpExecutorOpts({
        name: subgraphName,
        endpoint,
      });
    } else {
      httpExecutorOpts = opts.httpExecutorOpts || {};
    }
    let executor: Executor = buildHTTPExecutor({
      endpoint,
      ...httpExecutorOpts,
    });
    if (globalThis.process?.env?.DEBUG) {
      const origExecutor = executor;
      const logPayloads = globalThis.process?.env?.DEBUG_SUBGRAPH_PAYLOADS === '1';
      executor = function debugExecutor(execReq) {
        const prefix = `[${new Date().toISOString()}] ${subgraphName}`;
        // Metadata only by default — never log raw GraphQL documents/variables/responses
        // unless DEBUG_SUBGRAPH_PAYLOADS=1 is set explicitly.
        console.debug(`${prefix} - subgraph-execute-start`, {
          operationName: execReq.operationName ?? null,
          operationType: execReq.operationType ?? null,
          variableNames: execReq.variables ? Object.keys(execReq.variables) : [],
          ...(logPayloads
            ? {
                document: memoizedASTPrint(execReq.document),
                variables: '[redacted — set values omitted]',
              }
            : {}),
        });
        return handleMaybePromise(
          () => origExecutor(execReq),
          res => {
            console.debug(`${prefix} - subgraph-execute-done`, {
              hasData: !!(res as any)?.data,
              errorCount: Array.isArray((res as any)?.errors) ? (res as any).errors.length : 0,
              ...(logPayloads ? { result: '[redacted]' } : {}),
            });
            return res;
          },
          err => {
            console.error(`${prefix} - subgraph-execute-error`, {
              message: err instanceof Error ? err.message : String(err),
            });
            return err;
          },
        );
      };
    }
    const typeNameProvidedMap = subgraphTypeNameProvidedMap.get(subgraphName);
    const externalFieldMap = subgraphExternalFieldMap.get(subgraphName);
    const transforms: Transform<any>[] = [];
    if (
      externalFieldMap?.size &&
      extendedSubgraphTypes.some(t => t.kind === Kind.INTERFACE_TYPE_DEFINITION)
    ) {
      const typeInfo = getTypeInfo(schema);
      const visitorKeys: ASTVisitorKeyMap = {
        Document: ['definitions'],
        OperationDefinition: ['selectionSet'],
        SelectionSet: ['selections'],
        Field: ['selectionSet'],
        InlineFragment: ['selectionSet'],
        FragmentDefinition: ['selectionSet'],
      };
      function createUnresolvableError(fieldName: string, fieldNode: FieldNode) {
        return new GraphQLError(
          `Was not able to find any options for ${fieldName}: This shouldn't have happened.`,
          {
            extensions: {
              [CRITICAL_ERROR]: true,
            },
            nodes: [fieldNode],
          },
        );
      }
      const unresolvableIfaceFieldCheckerMap = new Map<string, (fieldName: string) => boolean>();
      function createIfaceFieldChecker(parentType: GraphQLInterfaceType) {
        const providedInterfaceFields = typeNameProvidedMap?.get(parentType.name);
        const implementations = schema.getPossibleTypes(parentType);
        const ifaceFieldCheckResult = new Map<string, boolean>();
        return function ifaceFieldChecker(fieldName: string) {
          let result = ifaceFieldCheckResult.get(fieldName);
          if (result == null) {
            result = true;
            for (const implementation of implementations) {
              const externalFields = externalFieldMap?.get(implementation.name);
              const providedFields = typeNameProvidedMap?.get(implementation.name);
              if (
                !providedInterfaceFields?.has(fieldName) &&
                !providedFields?.has(fieldName) &&
                externalFields?.has(fieldName)
              ) {
                result = false;
                break;
              }
            }
            ifaceFieldCheckResult.set(fieldName, result);
          }
          return result;
        };
      }
      transforms.push({
        transformRequest(request) {
          return {
            ...request,
            document: visit(
              request.document,
              visitWithTypeInfo(typeInfo, {
                // To avoid resolving unresolvable interface fields
                [Kind.FIELD](fieldNode) {
                  const fieldName = fieldNode.name.value;
                  if (fieldName !== '__typename') {
                    const parentType = typeInfo.getParentType();
                    if (isInterfaceType(parentType)) {
                      let unresolvableIfaceFieldChecker = unresolvableIfaceFieldCheckerMap.get(
                        parentType.name,
                      );
                      if (unresolvableIfaceFieldChecker == null) {
                        unresolvableIfaceFieldChecker = createIfaceFieldChecker(parentType);
                        unresolvableIfaceFieldCheckerMap.set(
                          parentType.name,
                          unresolvableIfaceFieldChecker,
                        );
                      }
                      if (!unresolvableIfaceFieldChecker(fieldName)) {
                        throw createUnresolvableError(fieldName, fieldNode);
                      }
                    }
                  }
                },
              }),
              visitorKeys as any,
            ),
          };
        },
      });
    }
    // Complementary percent decisions are shared across destination (override TO)
    // and source (override FROM) for the same field/label so exactly one accepts.
    function getComplementaryHandlers(key: string, possibility: number) {
      let handlers = complementaryPercentHandlersByKey.get(key);
      if (!handlers) {
        handlers = createComplementaryPercentOverrideHandlers(possibility, opts.getRng);
        complementaryPercentHandlersByKey.set(key, handlers);
      }
      return handlers;
    }

    const progressiveOverrideInfosForSubgraph = progressiveOverrideInfos.get(subgraphName);
    if (progressiveOverrideInfosForSubgraph != null) {
      for (const [typeName, fieldInfos] of progressiveOverrideInfosForSubgraph) {
        let mergedConfig = mergeConfig[typeName];
        if (!mergedConfig) {
          mergedConfig = mergeConfig[typeName] = {};
        }
        for (const fieldInfo of fieldInfos) {
          let fieldsConfig = mergedConfig.fields;
          if (!fieldsConfig) {
            fieldsConfig = mergedConfig.fields = {};
          }
          let fieldConfig = fieldsConfig[fieldInfo.field];
          if (!fieldConfig) {
            fieldConfig = fieldsConfig[fieldInfo.field] = {};
          }

          const label = fieldInfo.label;
          const percent = extractPercentageFromLabel(label);
          if (percent != null) {
            const possibility = percent / 100;
            const handlers = getComplementaryHandlers(
              `${typeName}.${fieldInfo.field}:${label}`,
              possibility,
            );
            fieldConfig.override = handlers.destination;
          } else if (opts.handleProgressiveOverride) {
            const progressiveOverrideHandler = opts.handleProgressiveOverride;
            fieldConfig.override = (context, info) =>
              progressiveOverrideHandler(label, context, info);
          }
        }
      }
    }
    const progressiveOverrideOppositeInfosForSubgraph =
      progressiveOverrideInfosOpposite.get(subgraphName);
    if (progressiveOverrideOppositeInfosForSubgraph != null) {
      for (const [typeName, fieldInfos] of progressiveOverrideOppositeInfosForSubgraph) {
        let mergedConfig = mergeConfig[typeName];
        if (!mergedConfig) {
          mergedConfig = mergeConfig[typeName] = {};
        }
        for (const fieldInfo of fieldInfos) {
          let fieldsConfig = mergedConfig.fields;
          if (!fieldsConfig) {
            fieldsConfig = mergedConfig.fields = {};
          }
          let fieldConfig = fieldsConfig[fieldInfo.field];
          if (!fieldConfig) {
            fieldConfig = fieldsConfig[fieldInfo.field] = {};
          }

          const label = fieldInfo.label;
          const percent = extractPercentageFromLabel(label);
          if (percent != null) {
            const possibility = percent / 100;
            const handlers = getComplementaryHandlers(
              `${typeName}.${fieldInfo.field}:${label}`,
              possibility,
            );
            fieldConfig.override = handlers.source;
          } else if (opts.handleProgressiveOverride) {
            const progressiveOverrideHandler = opts.handleProgressiveOverride;
            fieldConfig.override = (context, info) =>
              !progressiveOverrideHandler(label, context, info);
          }
        }
      }
    }
    // When there are conflict groups, each SubschemaConfig must only expose its
    // own computed fields in its schema. If a conflict group's field (e.g.
    // shippingEstimateEUR) is still present in the MAIN SubschemaConfig's schema,
    // the stitching engine may use the main SubschemaConfig (with the wrong entity
    // representation) to resolve it. Using mapSchema to filter out conflicting
    // computed fields prevents incorrect routing.
    let mainSchema = schema;
    const additionalGroupFieldsByType = new Map<string, Set<string>>();
    for (const { typeName, mergeTypeConfig } of pendingConflictSubschemaConfigs) {
      for (const [fieldName, fieldConfig] of Object.entries(mergeTypeConfig.fields ?? {})) {
        if (!fieldConfig?.computed) continue;
        let set = additionalGroupFieldsByType.get(typeName);
        if (!set) {
          set = new Set<string>();
          additionalGroupFieldsByType.set(typeName, set);
        }
        set.add(fieldName);
      }
    }
    if (additionalGroupFieldsByType.size > 0) {
      mainSchema = mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
          if (additionalGroupFieldsByType.get(typeName)?.has(fieldName)) {
            return null;
          }
          return fieldConfig;
        },
      });
    }

    // Build the full set of all computed fields across ALL conflict groups per
    // type (main + additional). Used to compute "fields to remove" per group.
    const allComputedFieldsByType = new Map<string, Set<string>>(
      Array.from(additionalGroupFieldsByType, ([t, s]) => [t, new Set(s)]),
    );
    for (const [typeName, typeConfig] of Object.entries(mergeConfig)) {
      if (!typeConfig?.fields) continue;
      for (const [fieldName, fieldConfig] of Object.entries(typeConfig.fields)) {
        if (!fieldConfig?.computed) continue;
        let set = allComputedFieldsByType.get(typeName);
        if (!set) {
          set = new Set<string>();
          allComputedFieldsByType.set(typeName, set);
        }
        set.add(fieldName);
      }
    }

    const subschemaConfig: FederationSubschemaConfig = {
      name: subgraphName,
      endpoint,
      schema: mainSchema,
      executor,
      merge: mergeConfig,
      transforms,
      batch: opts.batch,
      batchingOptions: opts.batchingOptions,
      defer: opts.defer,
    };
    subschemas.push(subschemaConfig);

    // Create a separate SubschemaConfig for each conflict group so that their
    // entity representations don't overwrite each other's aliased required fields.
    // Each group's schema is filtered to only expose its own computed fields so
    // the stitching engine never routes other groups' fields here.
    for (const { typeName, mergeTypeConfig } of pendingConflictSubschemaConfigs) {
      const groupOwnFields = new Set<string>(
        Object.entries(mergeTypeConfig.fields ?? {})
          .filter(([, fc]) => fc?.computed)
          .map(([fn]) => fn),
      );
      const allComputedForType = allComputedFieldsByType.get(typeName) ?? new Set<string>();
      const fieldsToRemove = new Set<string>(
        [...allComputedForType].filter(f => !groupOwnFields.has(f)),
      );
      const groupSchema =
        fieldsToRemove.size > 0 || allComputedFieldsByType.size > 0
          ? mapSchema(schema, {
              [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, type) => {
                if (type === typeName && fieldsToRemove.has(fieldName)) {
                  return null;
                }
                // Also remove computed fields owned by OTHER types' conflict
                // groups so those fields are not exposed on this subschema.
                if (type !== typeName && allComputedFieldsByType.get(type)?.has(fieldName)) {
                  return null;
                }
                return fieldConfig;
              },
            })
          : schema;
      subschemas.push({
        name: subgraphName,
        endpoint,
        schema: groupSchema,
        executor,
        merge: { [typeName]: mergeTypeConfig },
        transforms,
        batch: opts.batch,
        batchingOptions: opts.batchingOptions,
        defer: opts.defer,
      } as FederationSubschemaConfig);
    }
  }

  const defaultMerger = getDefaultFieldConfigMerger(true);
  const fieldConfigMerger: TypeMergingOptions['fieldConfigMerger'] = function (
    candidates: MergeFieldConfigCandidate[],
  ) {
    if (
      candidates.length === 1 ||
      candidates.some(candidate => candidate.fieldName === '_entities')
    ) {
      if (candidates[0]) {
        return candidates[0].fieldConfig;
      }
    }
    let operationType: OperationTypeNode | undefined;
    for (const candidate of candidates) {
      const candidateOperationType = rootTypeMap.get(candidate.type.name);
      if (candidateOperationType) {
        operationType = candidateOperationType;
      }
    }
    if (operationType) {
      const defaultMergedField = defaultMerger(candidates);
      const mergedResolver: GraphQLFieldResolver<{}, {}> = function mergedResolver(
        _root,
        args,
        context,
        info,
      ) {
        const filteredCandidates = candidates.filter(candidate => {
          const subschemaConfig = candidate.subschema as SubschemaConfig | undefined;
          const overrideHandler =
            subschemaConfig?.merge?.[candidate.type.name]?.fields?.[candidate.fieldName]?.override;
          if (overrideHandler) {
            return handleOverrideByDelegation(info, context, overrideHandler);
          }
          return true;
        });
        const originalSelectionSet: SelectionSetNode = {
          kind: Kind.SELECTION_SET,
          selections: info.fieldNodes,
        };
        const candidatesReversed = filteredCandidates.toReversed
          ? filteredCandidates.toReversed()
          : [...filteredCandidates].reverse();
        let currentSubschema: SubschemaConfig | undefined;
        let currentScore = Infinity;
        let currentUnavailableSelectionSet: SelectionSetNode | undefined;
        let currentFriendSubschemas: Map<SubschemaConfig, SelectionSetNode> | undefined;
        let currentAvailableSelectionSet: SelectionSetNode | undefined;
        // Find the best subschema to delegate this selection
        for (const candidate of candidatesReversed) {
          if (candidate.transformedSubschema) {
            const unavailableFields = extractUnavailableFieldsFromSelectionSet(
              candidate.transformedSubschema.transformedSchema,
              candidate.type,
              originalSelectionSet,
              () => true,
              info.fragments,
            );
            const score = calculateSelectionScore(unavailableFields, info.fragments);
            if (score < currentScore) {
              currentScore = score;
              currentSubschema = candidate.transformedSubschema;
              currentFriendSubschemas = new Map();
              currentUnavailableSelectionSet = {
                kind: Kind.SELECTION_SET,
                selections: unavailableFields,
              };
              currentAvailableSelectionSet = subtractSelectionSets(
                originalSelectionSet,
                currentUnavailableSelectionSet,
              );
              // Make parallel requests if there are other subschemas
              // that can resolve the remaining fields for this selection directly from the root field
              // instead of applying a type merging in advance
              for (const friendCandidate of filteredCandidates) {
                if (
                  friendCandidate === candidate ||
                  !friendCandidate.transformedSubschema ||
                  !currentUnavailableSelectionSet.selections.length
                ) {
                  continue;
                }
                const unavailableFieldsInFriend = extractUnavailableFieldsFromSelectionSet(
                  friendCandidate.transformedSubschema.transformedSchema,
                  friendCandidate.type,
                  currentUnavailableSelectionSet,
                  () => true,
                  info.fragments,
                );
                const friendScore = calculateSelectionScore(
                  unavailableFieldsInFriend,
                  info.fragments,
                );
                if (friendScore < score) {
                  const unavailableInFriendSelectionSet: SelectionSetNode = {
                    kind: Kind.SELECTION_SET,
                    selections: unavailableFieldsInFriend,
                  };
                  const subschemaSelectionSet = subtractSelectionSets(
                    currentUnavailableSelectionSet,
                    unavailableInFriendSelectionSet,
                  );
                  if (subschemaSelectionSet.selections.length) {
                    currentFriendSubschemas.set(
                      friendCandidate.transformedSubschema,
                      subschemaSelectionSet,
                    );
                    currentUnavailableSelectionSet = unavailableInFriendSelectionSet;
                  }
                }
              }
            }
          }
        }
        if (!currentSubschema) {
          throw new Error('Could not determine subschema');
        }
        const jobs: Promise<void>[] = [];
        let hasPromise = false;
        // Non-query operations execute exactly once on the primary subgraph with the
        // full selection. Friend root parallelization is query-only; friend-provided
        // fields are left for type merging after the mutation/subscription returns.
        const mainJob = delegateToSchema({
          schema: currentSubschema,
          operation: rootTypeMap.get(info.parentType.name) || ('query' as OperationTypeNode),
          context,
          args,
          info:
            operationType !== 'query'
              ? info
              : currentFriendSubschemas?.size
                ? {
                    ...info,
                    fieldNodes: [
                      ...(currentAvailableSelectionSet?.selections || []),
                      ...(currentUnavailableSelectionSet?.selections || []),
                    ] as FieldNode[],
                  }
                : info,
        });
        if (operationType !== 'query') {
          return mainJob;
        }
        if (isPromise(mainJob)) {
          hasPromise = true;
        }
        jobs.push(mainJob);
        if (currentFriendSubschemas?.size) {
          for (const [friendSubschema, friendSelectionSet] of currentFriendSubschemas) {
            const friendJob = delegateToSchema({
              schema: friendSubschema,
              operation: rootTypeMap.get(info.parentType.name) || ('query' as OperationTypeNode),
              context,
              args,
              info: {
                ...info,
                fieldNodes: friendSelectionSet.selections as FieldNode[],
              },
              skipTypeMerging: true,
            });
            if (isPromise(friendJob)) {
              hasPromise = true;
            }
            jobs.push(friendJob);
          }
        }
        if (jobs.length === 1) {
          return jobs[0];
        }
        function getFieldNames() {
          const fieldNames = new Set<string>();
          originalSelectionSet?.selections.forEach(selection => {
            if (selection.kind === Kind.FIELD && selection.name.value === info.fieldName) {
              selection.selectionSet?.selections.forEach(selection => {
                if (selection.kind === Kind.FIELD) {
                  fieldNames.add(selection.name.value);
                }
              });
            }
          });
          return fieldNames;
        }
        if (hasPromise) {
          return Promise.all(jobs).then(results => mergeResults(results, getFieldNames));
        }
        return mergeResults(jobs, getFieldNames);
      };
      if (operationType === 'subscription') {
        return {
          ...defaultMergedField,
          subscribe: mergedResolver,
          resolve: function identityFn(payload) {
            return payload;
          },
        };
      }
      return {
        ...defaultMergedField,
        resolve: mergedResolver,
      };
    }
    const filteredCandidates = candidates.filter(candidate => {
      const fieldASTMap = typeFieldASTMap.get(candidate.type.name);
      if (fieldASTMap) {
        const fieldAST = fieldASTMap.get(candidate.fieldName);
        if (fieldAST) {
          const typeNodeInAST = memoizedASTPrint(fieldAST.type);
          const typeNodeInCandidate = memoizedTypePrint(candidate.fieldConfig.type);
          return typeNodeInAST === typeNodeInCandidate;
        }
      }
      return false;
    });
    return defaultMerger(filteredCandidates.length ? filteredCandidates : candidates);
  };

  function doesFieldExistInSupergraph(typeName: string, fieldName: string) {
    for (const subschemaConfig of subschemas) {
      const type = subschemaConfig.schema.getType(typeName);
      if (type && 'getFields' in type) {
        if (type.getFields()[fieldName]) {
          return true;
        }
      }
    }
    return false;
  }

  function getTypeInSupergraph(typeName: string) {
    for (const subschemaConfig of subschemas) {
      const type = subschemaConfig.schema.getType(typeName);
      if (type) {
        return type;
      }
    }
    return undefined;
  }

  const extraDefinitions: DefinitionNode[] = [];
  for (const definition of supergraphAst.definitions) {
    if ('name' in definition && definition.name && definition.kind !== Kind.DIRECTIVE_DEFINITION) {
      const typeName = definition.name.value;
      const typeInSchema = getTypeInSupergraph(typeName);
      if (!typeInSchema) {
        extraDefinitions.push(definition);
      } else if ('fields' in definition && definition.fields) {
        const extraFields: (FieldDefinitionNode | InputValueDefinitionNode)[] = [];
        for (const field of definition.fields) {
          if (!doesFieldExistInSupergraph(typeName, field.name.value)) {
            extraFields.push(field);
          }
        }
        if (extraFields.length) {
          let definitionKind: DefinitionNode['kind'] | undefined;
          if (isObjectType(typeInSchema)) {
            definitionKind = Kind.OBJECT_TYPE_DEFINITION;
          } else if (isInterfaceType(typeInSchema)) {
            definitionKind = Kind.INTERFACE_TYPE_DEFINITION;
          } else if (isInputObjectType(typeInSchema)) {
            definitionKind = Kind.INPUT_OBJECT_TYPE_DEFINITION;
          }
          if (definitionKind) {
            extraDefinitions.push({
              kind: definitionKind,
              name: definition.name,
              fields: extraFields,
              // `fields` are different in input object types and regular types
            } as DefinitionNode);
          }
        }
      }
    } else if (
      definition.kind === Kind.DIRECTIVE_DEFINITION &&
      !definition.name.value.startsWith('join__') &&
      !definition.name.value.startsWith('core')
    ) {
      extraDefinitions.push(definition);
    }
  }
  const additionalTypeDefs: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: extraDefinitions,
  };
  if (opts.onSubschemaConfig) {
    for (const subschema of subschemas) {
      opts.onSubschemaConfig(subschema as FederationSubschemaConfig);
    }
  }
  let schemaExtensions: SchemaExtensions | undefined;
  if (overrideLabels.size) {
    schemaExtensions = {
      schemaExtensions: {
        overrideLabels,
      },
      types: {},
    };
  }

  return {
    subschemas,
    typeDefs: additionalTypeDefs,
    assumeValid: true,
    assumeValidSDL: true,
    typeMergingOptions: {
      useNonNullableFieldOnConflict: true,
      validationSettings: {
        validationLevel: ValidationLevel.Off,
      },
      fieldConfigMerger,
    },
    schemaExtensions,
    ...(overrideLabels.size ? { overrideLabels } : {}),
    ...(opts.handleProgressiveOverride
      ? {
          handleProgressiveOverride: (label: string, context: any) =>
            opts.handleProgressiveOverride!(label, context, undefined as any),
        }
      : {}),
  };
}

export interface GetStitchedSchemaFromSupergraphSdlOpts extends GetStitchingOptionsFromSupergraphSdlOpts {
  supergraphSdl: string | DocumentNode;
  onStitchingOptions?(opts: ReturnType<typeof getStitchingOptionsFromSupergraphSdl>): void;
  onStitchedSchema?(schema: GraphQLSchema): GraphQLSchema | void;
}

export function getStitchedSchemaFromSupergraphSdl(opts: GetStitchedSchemaFromSupergraphSdlOpts) {
  const stitchSchemasOpts = getStitchingOptionsFromSupergraphSdl(opts);
  opts.onStitchingOptions?.(stitchSchemasOpts);
  let supergraphSchema = stitchSchemas(stitchSchemasOpts);
  // filterInternalFieldsAndTypes mapSchema -> new schema. Retarget the same
  // backbone executor (labels stay closed over) so getBackboneExecutor and
  // Islands use this schema — no new executor / no stitchingInfo options bag.
  supergraphSchema = filterInternalFieldsAndTypes(supergraphSchema);
  supergraphSchema = retargetBackboneToSchema(supergraphSchema);
  if (opts.onStitchedSchema) {
    const rootResolvesBefore = snapshotRootFieldResolves(supergraphSchema);
    supergraphSchema = opts.onStitchedSchema(supergraphSchema) || supergraphSchema;
    // Late root resolver overrides (Query.me -> local) must plan as Islands.
    markChangedRootResolvesAsLocal(supergraphSchema, rootResolvesBefore);
    // Pick up overrides into the live runtime + reinstall proxies so Islands
    // call getOriginalRootResolve (= override), not the pre-stitch resolver.
    supergraphSchema = retargetBackboneToSchema(supergraphSchema);
  }
  return supergraphSchema;
}

const anyTypeDefinitionNode: ScalarTypeDefinitionNode = {
  name: {
    kind: Kind.NAME,
    value: '_Any',
  },
  kind: Kind.SCALAR_TYPE_DEFINITION,
};

const entitiesFieldDefinitionNode: FieldDefinitionNode = {
  kind: Kind.FIELD_DEFINITION,
  name: {
    kind: Kind.NAME,
    value: '_entities',
  },
  type: {
    kind: Kind.NON_NULL_TYPE,
    type: {
      kind: Kind.LIST_TYPE,
      type: {
        kind: Kind.NAMED_TYPE,
        name: {
          kind: Kind.NAME,
          value: '_Entity',
        },
      },
    },
  },
  arguments: [
    {
      kind: Kind.INPUT_VALUE_DEFINITION,
      name: {
        kind: Kind.NAME,
        value: 'representations',
      },
      type: {
        kind: Kind.NON_NULL_TYPE,
        type: {
          kind: Kind.LIST_TYPE,
          type: {
            kind: Kind.NON_NULL_TYPE,
            type: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: '_Any',
              },
            },
          },
        },
      },
    },
  ],
};

const specifiedTypeNames = ['ID', 'String', 'Float', 'Int', 'Boolean', '_Any', '_Entity'];

function makeExternalObject(data: any, errors: Error[], getFieldNames: () => Set<string>) {
  if (!isExternalObject(data) && typeof data === 'object' && data != null) {
    data[UNPATHED_ERRORS_SYMBOL] = errors;
  }
  if (errors.length) {
    const errorsToPop = [...errors];
    const fieldNamesToPop: string[] = [];
    for (const fieldName of getFieldNames()) {
      if (data?.[fieldName] == null) {
        fieldNamesToPop.push(fieldName);
      }
    }
    while (fieldNamesToPop.length && errorsToPop.length) {
      const fieldName = fieldNamesToPop.pop();
      if (!fieldName) {
        break;
      }
      const error = errorsToPop.pop();
      if (!error) {
        break;
      }
      const errorToSet =
        fieldNamesToPop.length || !errorsToPop.length
          ? error
          : new AggregateError(
              [error, ...errorsToPop],
              [error, ...errorsToPop].map(e => e.message).join(', \n'),
            );
      data ||= {};
      data[fieldName] = errorToSet;
    }
  }
  return data;
}

function mergeResults(results: unknown[], getFieldNames: () => Set<string>) {
  const errors: Error[] = [];
  const datas: unknown[] = [];
  for (const result of results) {
    if (result instanceof AggregateError) {
      errors.push(...result.errors);
    } else if (result instanceof Error) {
      errors.push(result);
    } else if (result != null) {
      datas.push(result);
    }
  }
  if (datas.length) {
    if (datas.length === 1) {
      return makeExternalObject(datas[0], errors, getFieldNames);
    }
    const mergedData = mergeDeep(datas, undefined, true, true);
    // Put original symbols on the merged object
    const symbols = [OBJECT_SUBSCHEMA_SYMBOL, FIELD_SUBSCHEMA_MAP_SYMBOL, UNPATHED_ERRORS_SYMBOL];
    for (const symbol of symbols) {
      if (mergedData?.[symbol] == null) {
        for (const data of datas) {
          const symbolValue = (data as any)?.[symbol];
          if (symbolValue != null) {
            mergedData[symbol] = symbolValue;
            break;
          }
        }
      }
    }
    return makeExternalObject(mergedData, errors, getFieldNames);
  }
  if (errors.length) {
    if (errors.length === 1) {
      throw errors[0];
    }
    return new AggregateError(errors, errors.map(error => error.message).join(', \n'));
  }
  return null;
}
