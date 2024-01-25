import {
  ASTNode,
  DocumentNode,
  FieldNode,
  getNamedType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  isAbstractType,
  isListType,
  isNonNullType,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  parse,
  valueFromASTUntyped,
  VariableDefinitionNode,
  visit,
} from 'graphql';
import _ from 'lodash';
import { DirectiveAnnotation } from '@graphql-tools/utils';
import { FlattenedFieldNode, FlattenedSelectionSet } from './flattenSelections.js';
import {
  GlobalResolverConfig,
  RegularResolverConfig,
  ResolverKind,
  ResolverRefConfig,
  ResolverVariableConfig,
} from './types.js';

// Resolution direction is from parentSubgraph to resolverDirective.subgraph
export function createResolveNode({
  parentSubgraph,
  fieldNode,
  resolverOperationString,
  resolverKind = 'FETCH',
  variableDirectives,
  resolverSelections,
  resolverArguments,
  ctx,
}: {
  // Subgraph of which that the field node belongs to
  parentSubgraph: string;
  // Field Node that returns this type
  fieldNode: FlattenedFieldNode;
  // Resolver operation string
  resolverOperationString: string;
  // Resolver kind
  resolverKind?: ResolverKind;
  // Variable directives that are used to resolve this type
  variableDirectives: ResolverVariableConfig[];
  // Selections that are used to resolve this type
  resolverSelections: FlattenedFieldNode[];
  resolverArguments: FlattenedFieldNode['arguments'];
  // Visitor context
  ctx: VisitorContext;
}) {
  let resolverOperationDocument = parse(resolverOperationString, { noLocation: true });

  if (!fieldNode.selectionSet) {
    throw new Error('Object type should have a selectionSet');
  }

  const deepestFieldNodePath: (string | number)[] = [];

  const requiredVariableNames = new Set<string>();

  const newVariableNameMap = new Map<string, string>();

  const resolverOperationPath: (string | number)[] = [];

  resolverOperationDocument = visit(resolverOperationDocument, {
    OperationDefinition(_, __, ___, path) {
      resolverOperationPath.push(...path);
    },
    VariableDefinition(node) {
      const newVariableName = `__variable_${ctx.currentVariableIndex++}`;
      newVariableNameMap.set(node.variable.name.value, newVariableName);
      if (node.type.kind === Kind.NON_NULL_TYPE) {
        requiredVariableNames.add(node.variable.name.value);
      }
    },
    Variable(node) {
      const newVariableName = newVariableNameMap.get(node.name.value);
      if (!newVariableName) {
        throw new Error(`No variable name found for ${node.name.value}`);
      }
      return {
        ...node,
        name: {
          kind: Kind.NAME,
          value: newVariableName,
        },
      };
    },
    Field(_node, _key, _parent, path) {
      if (path.length > deepestFieldNodePath.length) {
        deepestFieldNodePath.splice(0, deepestFieldNodePath.length, ...path);
      }
    },
  });

  // START: Handle variables and modify the parent field node if needed

  // This is the parent selection set
  const newFieldSelectionSet: FlattenedSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: [...fieldNode.selectionSet.selections],
  };
  const newFieldNode: FlattenedFieldNode = {
    ...fieldNode,
    selectionSet: newFieldSelectionSet,
  };

  const variableDirectivesForField = variableDirectives.filter(
    d =>
      (d.subgraph != null ? d.subgraph === parentSubgraph : true) && newVariableNameMap.has(d.name),
  );

  for (const [oldVarName, newVarName] of newVariableNameMap) {
    const varDirective = variableDirectivesForField.find(d => d.name === oldVarName);
    if (varDirective?.select) {
      const varOp = parse(`{${varDirective.select}}`, { noLocation: true });
      const deepestFieldNodePathInVarOp: (string | number)[] = [];
      visit(varOp, {
        Field(_node, _key, _parent, path) {
          if (path.length > deepestFieldNodePathInVarOp.length) {
            deepestFieldNodePathInVarOp.splice(0, deepestFieldNodePathInVarOp.length, ...path);
          }
        },
      });
      const deepestFieldNodeInVarOp = _.get(varOp, deepestFieldNodePathInVarOp) as
        | FieldNode
        | undefined;
      _.set(varOp, deepestFieldNodePathInVarOp, {
        ...deepestFieldNodeInVarOp,
        alias: {
          kind: Kind.NAME,
          value: newVarName,
        },
      });
      const varOpSelectionSet = _.get(varOp, 'definitions.0.selectionSet') as
        | FlattenedSelectionSet
        | undefined;
      newFieldSelectionSet.selections.push(...(varOpSelectionSet?.selections ?? []));
    }
    // If it is a computed variable
    else if (varDirective?.value) {
    }
    // If select is not given, use the variable as the default value for the variable
    else {
      const fieldArgumentNode = resolverArguments?.find(
        argument => argument.name.value === oldVarName,
      );
      if (fieldArgumentNode) {
        // If the resolver variable matches the name of the argument, use the variable of the actual operation in the resolver document
        if (fieldArgumentNode.value.kind === Kind.VARIABLE) {
          const fieldArgValueNode = fieldArgumentNode.value;
          resolverOperationDocument = visit(resolverOperationDocument, {
            [Kind.VARIABLE](node) {
              if (node.name.value === newVarName) {
                return fieldArgValueNode;
              }
              return node;
            },
            [Kind.VARIABLE_DEFINITION](node) {
              if (newVarName === node.variable.name.value) {
                return {
                  ...node,
                  name: fieldArgValueNode.name,
                };
              }
              return node;
            },
          });
          // If it is not a variable in the actual operation, use the value as the default value for the variable
        } else {
          const resolverOperation: OperationDefinitionNode = _.get(
            resolverOperationDocument,
            resolverOperationPath,
          );
          const variableDefinitions: VariableDefinitionNode[] = ((
            resolverOperation as any
          ).variableDefinitions ||= []);
          const variableInResolveOp = variableDefinitions.find(
            variableDefinition => variableDefinition.variable.name.value === newVarName,
          );
          if (variableInResolveOp) {
            // Replace variable with the actual value
            visit(fieldArgumentNode.value, {
              [Kind.VARIABLE](node) {
                const varTypeInCtx = ctx.rootVariableMap.get(node.name.value);
                if (varTypeInCtx != null) {
                  if (!variableDefinitions.some(v => v.variable.name.value === node.name.value)) {
                    variableDefinitions.push(varTypeInCtx);
                  }
                }
              },
            });
            resolverOperationDocument = visit(resolverOperationDocument, {
              [Kind.VARIABLE_DEFINITION](node) {
                if (node.variable.name.value === newVarName) {
                  return null;
                }
                return node;
              },
              [Kind.VARIABLE](node) {
                if (node.name.value === newVarName) {
                  return fieldArgumentNode.value;
                }
                return node;
              },
            });
          }
        }
      }
      if (!fieldArgumentNode && requiredVariableNames.has(oldVarName)) {
        throw new Error(
          `Required variable ${oldVarName} does not select anything for either from field argument or type`,
        );
      }
    }
  }

  // END: Handle variables and modify the parent field node if needed

  // Modify the exported selection from the resolver operation

  const existingDeepestFieldNode = _.get(
    resolverOperationDocument,
    deepestFieldNodePath,
  ) as FlattenedFieldNode;
  _.set(resolverOperationDocument, deepestFieldNodePath, {
    ...existingDeepestFieldNode,
    alias: {
      kind: Kind.NAME,
      value: '__export',
    },
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: resolverSelections,
    },
  });

  return {
    newFieldNode,
    resolverOperationDocument,
    resolvedFieldPath: deepestFieldNodePath,
    batch: resolverKind === 'BATCH',
    defer: fieldNode.defer,
  };
}

function getDefDirectives({ astNode, extensions }: { astNode?: ASTNode | null; extensions?: any }) {
  const directiveAnnotations: DirectiveAnnotation[] = [];
  if (astNode != null && 'directives' in astNode) {
    astNode.directives?.forEach(directiveNode => {
      directiveAnnotations.push({
        name: directiveNode.name.value,
        args:
          directiveNode.arguments?.reduce(
            (acc, arg) => {
              acc[arg.name.value] = valueFromASTUntyped(arg.value);
              return acc;
            },
            {} as Record<string, any>,
          ) ?? {},
      });
    });
  }
  if (extensions?.directives != null) {
    for (const directiveName in extensions.directives) {
      const directiveExt = extensions.directives[directiveName];
      if (directiveExt != null) {
        if (Array.isArray(directiveExt)) {
          directiveExt.forEach(directive => {
            directiveAnnotations.push({
              name: directiveName,
              args: directive,
            });
          });
        } else {
          directiveAnnotations.push({
            name: directiveName,
            args: directiveExt,
          });
        }
      }
    }
  }
  return directiveAnnotations;
}

export function isList(type: GraphQLOutputType) {
  if (isNonNullType(type)) {
    return isList(type.ofType);
  } else if (isListType(type)) {
    return true;
  } else {
    return false;
  }
}

export function getGlobalResolvers(supergraph: GraphQLSchema) {
  const globalResolvers = new Map<string, GlobalResolverConfig>();
  supergraph.astNode.directives?.forEach(directiveNode => {
    if (directiveNode.name.value === 'resolver') {
      let name: string;
      let operation: string;
      let kind: ResolverKind | undefined;
      directiveNode.arguments?.forEach(arg => {
        if (arg.value.kind !== Kind.STRING) {
          throw new Error('Argument value should be a string');
        }
        switch (arg.name.value) {
          case 'name':
            name = arg.value.value;
            break;
          case 'operation':
            operation = arg.value.value;
            break;
          case 'kind':
            kind = arg.value.value as ResolverKind;
            break;
        }
      });
      globalResolvers.set(name, {
        name,
        operation,
        kind,
      });
    }
  });
  return globalResolvers;
}

export function resolveResolverOperationStringAndKind(
  supergraph: GraphQLSchema,
  resolverDirective: ResolverRefConfig | RegularResolverConfig,
) {
  let resolverOperationString: string;
  let resolverKind: ResolverKind;
  if ('name' in resolverDirective) {
    const globalResolver = getGlobalResolvers(supergraph).get(resolverDirective.name);
    if (!globalResolver) {
      throw new Error(`No global resolver found for ${resolverDirective.name}`);
    }
    resolverOperationString = globalResolver.operation;
    resolverKind = globalResolver.kind ?? 'FETCH';
  } else {
    resolverOperationString = resolverDirective.operation;
    resolverKind = resolverDirective.kind ?? 'FETCH';
  }
  return {
    resolverOperationString,
    resolverKind,
  };
}

export function visitFieldNodeForTypeResolvers(
  // Subgraph of which that the field node belongs to
  parentSubgraph: string,
  // Field Node that returns this type
  fieldNode: FlattenedFieldNode,
  // Type that is returned by the field node
  type: GraphQLObjectType,
  // Supergraph Schema
  supergraph: GraphQLSchema,
  // Visitor context
  ctx: VisitorContext,
): {
  newFieldNode: FlattenedFieldNode;
  resolverOperationNodes: ResolverOperationNode[];
  resolverDependencyFieldMap: Map<string, ResolverOperationNode[]>;
} {
  if (!fieldNode.selectionSet) {
    throw new Error('Object type should have a selectionSet');
  }

  const typeFieldMap = type.getFields();

  const typeDirectives = getDefDirectives(type);

  // Visit for type resolvers

  const newFieldSelectionSet: FlattenedSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: [],
  };

  let newFieldNode: FlattenedFieldNode = {
    ...fieldNode,
    selectionSet: newFieldSelectionSet,
  };

  const resolverSelectionsBySubgraph: Record<string, FlattenedFieldNode[]> = {};
  const variablesByResolverSelection = new WeakMap<FlattenedFieldNode, ResolverVariableConfig[]>();

  const resolverOperationNodes: ResolverOperationNode[] = [];
  const resolverDependencyFieldMap = new Map<string, ResolverOperationNode[]>();
  for (const subFieldNodeIndex in fieldNode.selectionSet.selections) {
    let subFieldNode = fieldNode.selectionSet.selections[subFieldNodeIndex] as FlattenedFieldNode;
    const fieldNameInNode = subFieldNode.name.value;
    if (fieldNameInNode === '__typename') {
      newFieldSelectionSet.selections.push(subFieldNode);
      continue;
    }
    const fieldDefInType = typeFieldMap[fieldNameInNode];
    if (!fieldDefInType) {
      throw new Error(
        `No field definition found for ${fieldNameInNode} in ${type.constructor.name} ${type.name}`,
      );
    }
    const fieldDirectives = getDefDirectives(fieldDefInType);
    const sourceDirectives = fieldDirectives.filter(d => d.name === 'source');
    const sourceDirectiveForThisSubgraph = sourceDirectives.find(
      d => d.args?.subgraph === parentSubgraph,
    );
    // Resolve the selections of the field even if it is the same subgraph
    const namedFieldType = getNamedType(fieldDefInType.type);
    if (sourceDirectiveForThisSubgraph) {
      const fieldNameInParent = fieldDefInType.name;
      const fieldAliasInParent = subFieldNode.alias?.value ?? fieldNameInParent;
      const nameInSubgraph = sourceDirectiveForThisSubgraph.args?.name ?? fieldNameInParent;
      if (nameInSubgraph !== fieldNameInParent || fieldNameInParent !== fieldAliasInParent) {
        subFieldNode = {
          ...subFieldNode,
          name: {
            kind: Kind.NAME,
            value: nameInSubgraph,
          },
          alias: {
            kind: Kind.NAME,
            value: fieldAliasInParent,
          },
        };
      }
      if (isObjectType(namedFieldType)) {
        const {
          newFieldNode: newSubFieldNode,
          resolverOperationNodes: subFieldResolverOperationNodes,
          resolverDependencyFieldMap: subFieldResolverDependencyMap,
        } = visitFieldNodeForTypeResolvers(
          parentSubgraph,
          subFieldNode,
          namedFieldType,
          supergraph,
          ctx,
        );
        subFieldNode = newSubFieldNode;
        resolverDependencyFieldMap.set(subFieldNode.name.value, subFieldResolverOperationNodes);
        for (const [subSubFieldName, dependencies] of subFieldResolverDependencyMap.entries()) {
          if (dependencies.length) {
            resolverDependencyFieldMap.set(
              `${subFieldNode.name.value}.${subSubFieldName}`,
              dependencies,
            );
          }
        }
      } else if (isAbstractType(namedFieldType)) {
        const subFieldResolverOperationNodes: ResolverOperationNode[] = [];
        for (const possibleType of supergraph.getPossibleTypes(namedFieldType)) {
          const {
            newFieldNode: newSubFieldNode,
            resolverOperationNodes: subFieldResolverOperationNodesForPossibleType,
          } = visitFieldNodeForTypeResolvers(
            parentSubgraph,
            subFieldNode,
            possibleType,
            supergraph,
            ctx,
          );
          subFieldNode = newSubFieldNode;
          subFieldResolverOperationNodes.push(...subFieldResolverOperationNodesForPossibleType);
        }
      }
      newFieldSelectionSet.selections.push(subFieldNode);
      continue;
    }
    const sourceDirective = sourceDirectives[0] as DirectiveAnnotation | undefined;

    const subgraph = sourceDirective?.args?.subgraph;

    const fieldNameInParent = fieldDefInType.name;
    const fieldAliasInParent = subFieldNode.alias?.value ?? fieldNameInParent;
    const nameInSubgraph = sourceDirective?.args?.name ?? fieldNameInParent;
    if (nameInSubgraph !== fieldNameInParent || fieldNameInParent !== fieldAliasInParent) {
      subFieldNode = {
        ...subFieldNode,
        name: {
          kind: Kind.NAME,
          value: nameInSubgraph,
        },
        alias: {
          kind: Kind.NAME,
          value: fieldAliasInParent,
        },
      };
    }

    // Handle field resolvers
    const resolverDirective = fieldDirectives.find(d => d.name === 'resolver')?.args as
      | ResolverRefConfig
      | RegularResolverConfig;
    if (resolverDirective) {
      const variableDirectives = fieldDirectives
        .filter(d => d.name === 'variable')
        .map(d => d.args) as ResolverVariableConfig[];
      const resolverSelections = subFieldNode.selectionSet?.selections ?? [];
      const { resolverOperationString, resolverKind } = resolveResolverOperationStringAndKind(
        supergraph,
        resolverDirective,
      );
      const {
        newFieldNode: newFieldNodeForSubgraph,
        resolverOperationDocument,
        resolvedFieldPath,
        batch,
        defer,
      } = createResolveNode({
        parentSubgraph,
        fieldNode: newFieldNode,
        resolverOperationString,
        resolverKind,
        variableDirectives,
        resolverSelections,
        resolverArguments: subFieldNode.arguments,
        ctx,
      });
      newFieldNode = newFieldNodeForSubgraph;
      const fieldResolveFieldDependencyMap = new Map<string, ResolverOperationNode[]>();
      const fieldSubgraph = resolverDirective.subgraph;
      const fieldResolverDependencies: ResolverOperationNode[] = [];
      const fieldResolverOperationNodes: ResolverOperationNode[] = [
        {
          subgraph: fieldSubgraph,
          resolverOperationDocument,
          resolverDependencies: fieldResolverDependencies,
          resolverDependencyFieldMap: fieldResolveFieldDependencyMap,
          batch,
          defer: defer || subFieldNode.defer || newFieldNode.defer,
        },
      ];
      if (isObjectType(namedFieldType)) {
        let resolverOperationResolvedFieldNode = _.get(
          resolverOperationDocument,
          resolvedFieldPath,
        ) as FlattenedFieldNode;
        resolverOperationResolvedFieldNode.defer =
          defer || subFieldNode.defer || newFieldNode.defer;
        const {
          newFieldNode: newResolvedFieldNode,
          resolverOperationNodes: subFieldResolverOperationNodes,
          resolverDependencyFieldMap: newFieldResolverDependencyMap,
        } = visitFieldNodeForTypeResolvers(
          fieldSubgraph,
          resolverOperationResolvedFieldNode,
          namedFieldType,
          supergraph,
          ctx,
        );
        resolverOperationResolvedFieldNode = newResolvedFieldNode;
        for (const [fieldName, dependencies] of newFieldResolverDependencyMap.entries()) {
          let existingDependencies = fieldResolveFieldDependencyMap.get(fieldName);
          if (!existingDependencies) {
            existingDependencies = [];
            fieldResolveFieldDependencyMap.set(fieldName, existingDependencies);
          }
          existingDependencies.push(...dependencies);
        }
        fieldResolverDependencies.push(...subFieldResolverOperationNodes);
        _.set(resolverOperationDocument, resolvedFieldPath, resolverOperationResolvedFieldNode);
      } else if (isAbstractType(namedFieldType)) {
        let resolverOperationResolvedFieldNode = _.get(
          resolverOperationDocument,
          resolvedFieldPath,
        ) as FlattenedFieldNode;
        resolverOperationResolvedFieldNode.defer =
          defer || subFieldNode.defer || newFieldNode.defer;
        for (const possibleType of supergraph.getPossibleTypes(namedFieldType)) {
          const {
            newFieldNode: newResolvedFieldNode,
            resolverOperationNodes: subFieldResolverOperationNodes,
            resolverDependencyFieldMap: newFieldResolverDependencyMap,
          } = visitFieldNodeForTypeResolvers(
            fieldSubgraph,
            resolverOperationResolvedFieldNode,
            possibleType,
            supergraph,
            ctx,
          );
          resolverOperationResolvedFieldNode = newResolvedFieldNode;
          fieldResolverDependencies.push(...subFieldResolverOperationNodes);
          for (const [fieldName, dependencies] of newFieldResolverDependencyMap.entries()) {
            let existingDependencies = fieldResolveFieldDependencyMap.get(fieldName);
            if (!existingDependencies) {
              existingDependencies = [];
              fieldResolveFieldDependencyMap.set(fieldName, existingDependencies);
            }
            existingDependencies.push(...dependencies);
          }
        }
        _.set(resolverOperationDocument, resolvedFieldPath, resolverOperationResolvedFieldNode);
      }
      resolverDependencyFieldMap.set(fieldAliasInParent, fieldResolverOperationNodes);
    } else {
      if (!subgraph) {
        throw new Error(`No subgraph found for ${subFieldNode.name.value}`);
      }
      resolverSelectionsBySubgraph[subgraph] ||= [];
      resolverSelectionsBySubgraph[subgraph].push(subFieldNode);
      const variableDirectives = fieldDirectives
        .filter(d => d.name === 'variable')
        .map(d => d.args) as ResolverVariableConfig[];
      variablesByResolverSelection.set(subFieldNode, variableDirectives);
    }
  }

  for (const fieldSubgraph in resolverSelectionsBySubgraph) {
    const resolverDirective = typeDirectives.find(
      d => d.name === 'resolver' && d.args?.subgraph === fieldSubgraph,
    )?.args as ResolverRefConfig | RegularResolverConfig;
    if (!resolverDirective) {
      throw new Error(`No resolver directive found for ${fieldSubgraph}`);
    }
    const resolverSelections = resolverSelectionsBySubgraph[fieldSubgraph];
    const variableDirectives = typeDirectives
      .filter(d => d.name === 'variable')
      .map(d => d.args) as ResolverVariableConfig[];
    for (const resolverSelection of resolverSelections) {
      const selectionVariables = variablesByResolverSelection.get(resolverSelection);
      if (selectionVariables) {
        variableDirectives.push(...selectionVariables);
      }
    }
    const { resolverOperationString, resolverKind } = resolveResolverOperationStringAndKind(
      supergraph,
      resolverDirective,
    );
    const {
      newFieldNode: newFieldNodeForSubgraph,
      resolverOperationDocument,
      batch,
      defer,
    } = createResolveNode({
      parentSubgraph,
      fieldNode: newFieldNode,
      resolverOperationString,
      resolverKind,
      variableDirectives,
      resolverSelections,
      resolverArguments: newFieldNode.arguments,
      ctx,
    });
    newFieldNode = newFieldNodeForSubgraph;
    const resolverDependencyFieldMap = new Map<string, ResolverOperationNode[]>();
    resolverOperationNodes.push({
      subgraph: fieldSubgraph,
      resolverOperationDocument,
      resolverDependencies: [],
      resolverDependencyFieldMap,
      batch,
      defer: defer || newFieldNode.defer,
    });

    for (const resolverSelectionIndex in resolverSelections) {
      const resolverSubFieldNode = resolverSelections[resolverSelectionIndex];
      const resolverSubFieldName = resolverSubFieldNode.name.value;
      const resolverSubAliasName = resolverSubFieldNode.alias?.value ?? resolverSubFieldName;
      const fieldType = typeFieldMap[resolverSubFieldName]?.type;
      if (!fieldType) {
        // Might be aliased by @source directive
        continue;
      }
      const namedSelectionType = getNamedType(fieldType);
      if (isObjectType(namedSelectionType)) {
        const {
          newFieldNode: newSubFieldNode,
          resolverOperationNodes: subFieldResolverOperationNodes,
          resolverDependencyFieldMap: subFieldResolverDependencyMap,
        } = visitFieldNodeForTypeResolvers(
          fieldSubgraph,
          resolverSubFieldNode,
          namedSelectionType,
          supergraph,
          ctx,
        );
        resolverSelections[resolverSelectionIndex] = newSubFieldNode;
        if (subFieldResolverOperationNodes.length) {
          resolverDependencyFieldMap.set(resolverSubAliasName, subFieldResolverOperationNodes);
        }
        for (const [subSubFieldName, dependencies] of subFieldResolverDependencyMap.entries()) {
          if (dependencies.length) {
            resolverDependencyFieldMap.set(
              `${resolverSubAliasName}.${subSubFieldName}`,
              dependencies,
            );
          }
        }
      } else if (isAbstractType(namedSelectionType)) {
        const subFieldResolverOperationNodes: ResolverOperationNode[] = [];
        for (const possibleType of supergraph.getPossibleTypes(namedSelectionType)) {
          const {
            newFieldNode: newSubFieldNode,
            resolverOperationNodes: subFieldResolverOperationNodes,
          } = visitFieldNodeForTypeResolvers(
            fieldSubgraph,
            resolverSelections[resolverSelectionIndex],
            possibleType,
            supergraph,
            ctx,
          );
          resolverSelections[resolverSelectionIndex] = newSubFieldNode;
          subFieldResolverOperationNodes.push(...subFieldResolverOperationNodes);
        }
        resolverDependencyFieldMap.set(resolverSubAliasName, subFieldResolverOperationNodes);
      }
    }
  }

  return {
    newFieldNode,
    resolverOperationNodes,
    resolverDependencyFieldMap,
  };
}

export interface ResolverOperationNode {
  subgraph: string;
  resolverOperationDocument: DocumentNode;
  resolverDependencies: ResolverOperationNode[];
  resolverDependencyFieldMap: Map<string, ResolverOperationNode[]>;
  batch?: boolean;
  defer?: boolean;
}

export interface VisitorContext {
  currentVariableIndex: number;
  rootVariableMap: Map<string, VariableDefinitionNode>;
}
