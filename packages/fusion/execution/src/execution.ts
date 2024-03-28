/* eslint-disable no-inner-declarations */
import { DocumentNode, GraphQLError, Kind, visit } from 'graphql';
import _ from 'lodash';
import {
  createGraphQLError,
  Executor,
  isAsyncIterable,
  isPromise,
  mapAsyncIterator,
  relocatedError,
} from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import { ResolverOperationNode } from './query-planning.js';
import { visitResolutionPath } from './visitResolutionPath.js';

export type OnExecuteFn = (
  subgraphName: string,
  document: DocumentNode,
  variables: Record<string, any>,
  context: any,
) => ReturnType<Executor>;

export interface ExecutableResolverOperationNode extends ResolverOperationNode {
  id: number;
  providedVariablePathMap: Map<string, string[]>;
  requiredVariableNames: Set<string>;
  exportPath: string[];
  resolverDependencyFieldMap: Map<string, ExecutableResolverOperationNode[]>;
  batchedResolverDependencyFieldMap: Map<string, ExecutableResolverOperationNode[]>;
  resolverDependencies: ExecutableResolverOperationNode[];
  batchedResolverDependencies: ExecutableResolverOperationNode[];
  resolverPreDependencies: ExecutableResolverOperationNode[];
  batchedPreResolverDependencies: ExecutableResolverOperationNode[];
}

function deserializeGraphQLError(error: any) {
  if (error.name === 'GraphQLError') {
    return error;
  }
  return createGraphQLError(error.message, {
    nodes: error.nodes,
    source: error.source,
    positions: error.positions,
    path: error.path,
    originalError: error.originalError,
    extensions: error.extensions,
  });
}

export function createExecutableResolverOperationNode(
  resolverOperationNode: ResolverOperationNode,
  currentId: number,
): ExecutableResolverOperationNode {
  const id = currentId++;
  const providedVariablePathMap = new Map<string, string[]>();
  const exportPath: string[] = [];

  visitResolutionPath(resolverOperationNode.resolverOperationDocument, ({ path }) => {
    const lastElem = path[path.length - 1];
    if (lastElem === '__export') {
      exportPath.splice(0, exportPath.length, ...path);
    } else if (lastElem.startsWith('__variable')) {
      providedVariablePathMap.set(lastElem, path);
    }
  });

  // Remove __export from variable paths
  for (const [, providedVariablePath] of providedVariablePathMap) {
    const index = providedVariablePath.indexOf('__export');
    if (index !== -1) {
      providedVariablePath.splice(index, 1);
    }
  }

  const newDependencyMap: Map<string, ExecutableResolverOperationNode[]> = new Map();
  const newBatchedDependencyMap: Map<string, ExecutableResolverOperationNode[]> = new Map();

  for (const [key, nodes] of resolverOperationNode.resolverDependencyFieldMap) {
    const batchedNodes: ExecutableResolverOperationNode[] = [];
    const nonBatchedNodes: ExecutableResolverOperationNode[] = [];
    for (const node of nodes) {
      const executableNode = createExecutableResolverOperationNode(node, currentId++);
      if (node.batch) {
        batchedNodes.push(executableNode);
      } else {
        nonBatchedNodes.push(executableNode);
      }
    }
    newBatchedDependencyMap.set(key, batchedNodes);
    newDependencyMap.set(key, nonBatchedNodes);
  }

  const requiredVariableNames = new Set<string>();

  visit(resolverOperationNode.resolverOperationDocument, {
    [Kind.VARIABLE_DEFINITION]: node => {
      requiredVariableNames.add(node.variable.name.value);
    },
  });

  const batchedResolverDependencies = [];
  const resolverDependencies = [];

  for (const node of resolverOperationNode.resolverDependencies) {
    const executableNode = createExecutableResolverOperationNode(node, currentId++);
    if (node.batch) {
      batchedResolverDependencies.push(executableNode);
    } else {
      resolverDependencies.push(executableNode);
    }
  }

  const batchedPreResolverDependencies = [];
  const resolverPreDependencies = [];

  for (const node of resolverOperationNode.resolverPreDependencies) {
    const executableNode = createExecutableResolverOperationNode(node, currentId++);
    if (node.batch) {
      batchedPreResolverDependencies.push(executableNode);
    } else {
      resolverPreDependencies.push(executableNode);
    }
  }

  return {
    id,
    ...resolverOperationNode,
    resolverDependencies,
    batchedResolverDependencies,
    resolverPreDependencies,
    batchedPreResolverDependencies,
    resolverDependencyFieldMap: newDependencyMap,
    batchedResolverDependencyFieldMap: newBatchedDependencyMap,
    providedVariablePathMap,
    requiredVariableNames,
    exportPath,
  };
}

export function createExecutableResolverOperationNodesWithDependencyMap(
  resolverOperationNodes: ResolverOperationNode[],
  resolverDependencyFieldMap: Map<string, ResolverOperationNode[]>,
  currentId: number,
) {
  const newResolverOperationNodes = resolverOperationNodes.map(node =>
    createExecutableResolverOperationNode(node, currentId++),
  );
  const newResolverDependencyMap = new Map<string, ExecutableResolverOperationNode[]>();
  for (const [key, nodes] of resolverDependencyFieldMap) {
    newResolverDependencyMap.set(
      key,
      nodes.map(node => createExecutableResolverOperationNode(node, currentId++)),
    );
  }
  return {
    resolverOperationNodes: newResolverOperationNodes,
    resolverDependencyFieldMap: newResolverDependencyMap,
  };
}

export function createResolverOperationNodeFromExecutable(
  executableNode: ExecutableResolverOperationNode,
  currentId: number,
) {
  const resolverOpNode: ResolverOperationNode = {
    subgraph: executableNode.subgraph,
    resolverOperationDocument: executableNode.resolverOperationDocument,
    resolverDependencies: [],
    resolverDependencyFieldMap: executableNode.resolverDependencyFieldMap,
    resolverPreDependencies: [],
  };

  resolverOpNode.resolverDependencies = executableNode.resolverDependencies.map(node =>
    createResolverOperationNodeFromExecutable(node, currentId++),
  );

  resolverOpNode.resolverDependencyFieldMap = new Map(
    [...executableNode.resolverDependencyFieldMap.entries()].map(([key, value]) => [
      key,
      value.map(createResolverOperationNodeFromExecutable),
    ]),
  );

  if (executableNode.batchedResolverDependencies.length) {
    resolverOpNode.batch = true;
    for (const batchedResolverDependency of executableNode.batchedResolverDependencies) {
      resolverOpNode.resolverDependencies.push(
        createResolverOperationNodeFromExecutable(batchedResolverDependency, currentId++),
      );
    }
  }

  resolverOpNode.resolverPreDependencies = executableNode.resolverPreDependencies.map(node =>
    createResolverOperationNodeFromExecutable(node, currentId++),
  );

  if (executableNode.batchedPreResolverDependencies.length) {
    resolverOpNode.batch = true;
    for (const batchedPreResolverDependency of executableNode.batchedPreResolverDependencies) {
      resolverOpNode.resolverPreDependencies.push(
        createResolverOperationNodeFromExecutable(batchedPreResolverDependency, currentId++),
      );
    }
  }

  if (executableNode.batchedResolverDependencyFieldMap.size) {
    resolverOpNode.batch = true;
    for (const [key, value] of executableNode.batchedResolverDependencyFieldMap) {
      resolverOpNode.resolverDependencyFieldMap.set(
        key,
        value.map(createResolverOperationNodeFromExecutable),
      );
    }
  }

  return resolverOpNode;
}

export function executeResolverOperationNodesWithDependenciesInParallel({
  resolverOperationNodes,
  fieldDependencyMap,
  inputVariableMap,
  onExecute,
  obj = {},
  context,
  path,
  errors,
}: {
  context: any;
  resolverOperationNodes: ExecutableResolverOperationNode[];
  fieldDependencyMap: Map<string, ExecutableResolverOperationNode[]>;
  inputVariableMap: Map<string, any>;
  onExecute: OnExecuteFn;
  path: string[];
  errors: GraphQLError[];
  obj?: any;
}) {
  const dependencyPromises: PromiseLike<any>[] = [];
  const asyncIterables: AsyncIterable<any>[] = [];

  const outputVariableMap = new Map();

  for (const depOp of resolverOperationNodes) {
    const depOpResult$ = executeResolverOperationNode({
      resolverOperationNode: depOp,
      inputVariableMap,
      onExecute,
      context,
      path,
      errors,
    });
    function handleDepOpResult(depOpResult: {
      exported: any;
      outputVariableMap: Map<string, any>;
    }) {
      if (depOpResult?.exported != null) {
        if (Array.isArray(depOpResult.exported)) {
          if (Array.isArray(obj)) {
            for (const index in depOpResult.exported) {
              Object.assign(obj[index], depOpResult.exported[index]);
            }
          } else {
            Object.assign(obj, ...depOpResult.exported);
          }
        } else {
          Object.assign(obj, depOpResult.exported);
        }
        for (const [key, value] of depOpResult.outputVariableMap) {
          outputVariableMap.set(key, value);
        }
      }
    }
    if (isAsyncIterable(depOpResult$)) {
      asyncIterables.push(
        mapAsyncIterator(depOpResult$ as AsyncIterableIterator<any>, handleDepOpResult),
      );
    } else if (isPromise(depOpResult$)) {
      dependencyPromises.push(
        depOpResult$.then(res => {
          if (isAsyncIterable(res)) {
            return mapAsyncIterator(res as AsyncIterableIterator<any>, handleDepOpResult);
          } else {
            return handleDepOpResult(res);
          }
        }),
      );
    } else {
      handleDepOpResult(depOpResult$);
    }
  }

  for (const [fieldName, fieldOperationNodes] of fieldDependencyMap) {
    const fieldOpPromises: PromiseLike<any>[] = [];
    const fieldOpAsyncIterables: AsyncIterable<any>[] = [];
    const fieldOpResults: any[] = [];
    let listed = false;
    for (const fieldOperationNode of fieldOperationNodes) {
      const fieldOpResult$ = executeResolverOperationNode({
        resolverOperationNode: fieldOperationNode,
        inputVariableMap,
        onExecute,
        context,
        path: [...path, fieldName],
        errors,
      });
      function handleFieldOpResult(fieldOpResult: { exported: any; listed?: boolean }) {
        if (fieldOpResult != null) {
          if (fieldOpResult.listed) {
            listed = true;
          }
          fieldOpResults.push(fieldOpResult.exported);
        }
      }
      if (isAsyncIterable(fieldOpResult$)) {
        fieldOpAsyncIterables.push(mapAsyncIterator(fieldOpResult$, handleFieldOpResult));
      } else if (isPromise(fieldOpResult$)) {
        fieldOpPromises.push(
          fieldOpResult$.then(fieldOpResult => {
            if (isAsyncIterable(fieldOpResult)) {
              return mapAsyncIterator(
                fieldOpResult as AsyncIterableIterator<any>,
                handleFieldOpResult,
              );
            }
            return handleFieldOpResult(fieldOpResult as any);
          }),
        );
      } else {
        handleFieldOpResult(fieldOpResult$);
      }
    }
    function handleFieldOpResults() {
      if (listed) {
        const existingVals = arrayGet(
          obj,
          fieldName.split('.'),
          Array.isArray(fieldOpResults[0]?.[0]) ? 'array' : 'object',
        );
        for (const resultItemIndex in existingVals) {
          const fieldOpItemResults = fieldOpResults.map(resultItem => resultItem[resultItemIndex]);
          let existingVal = existingVals[resultItemIndex];
          if (!existingVal) {
            existingVal = Array.isArray(fieldOpItemResults[0]) ? [] : {};
            existingVals[resultItemIndex] = existingVal;
          }
          if (Array.isArray(existingVal)) {
            for (const existingValItemIndex in existingVal) {
              const existingValItem = existingVal[existingValItemIndex];
              if (Array.isArray(existingValItem)) {
                for (const existingValItemItemIndex in existingValItem) {
                  const existingValItemItem = existingValItem[existingValItemItemIndex];
                  Object.assign(
                    existingValItemItem,
                    ...fieldOpItemResults
                      .map(
                        fieldOpItemResult =>
                          fieldOpItemResult[existingValItemIndex][existingValItemItemIndex],
                      )
                      .flat(Infinity),
                  );
                }
              } else {
                Object.assign(
                  existingValItem,
                  ...fieldOpItemResults
                    .map(fieldOpItemResult => fieldOpItemResult[existingValItemIndex])
                    .flat(Infinity),
                );
              }
            }
          } else {
            Object.assign(existingVal, ...fieldOpItemResults.flat(Infinity));
          }
        }
      } else {
        const existingVal = _.get(obj, fieldName);
        if (existingVal != null) {
          Object.assign(existingVal, ...fieldOpResults.flat(Infinity));
        } else if (fieldOpResults.length) {
          _.set(
            obj,
            fieldName,
            fieldOpResults.length > 1
              ? (Object.assign as any)(...fieldOpResults.flat(Infinity))
              : fieldOpResults[0],
          );
        }
      }
    }
    if (fieldOpAsyncIterables.length) {
      const mergedIterable = Repeater.merge([...fieldOpPromises, ...fieldOpAsyncIterables]);
      asyncIterables.push(mapAsyncIterator(mergedIterable, handleFieldOpResults));
    } else if (fieldOpPromises.length) {
      dependencyPromises.push(
        Promise.all(fieldOpPromises).then(fieldOpPromiseResults => {
          const asyncIterablesInResults = fieldOpPromiseResults.filter(isAsyncIterable);
          if (asyncIterablesInResults.length) {
            const mergedIterable = Repeater.merge(asyncIterablesInResults);
            return mapAsyncIterator(mergedIterable, handleFieldOpResults);
          }
          return handleFieldOpResults();
        }),
      );
    } else {
      handleFieldOpResults();
    }
  }
  function handleDependencyPromises() {
    return {
      exported: obj,
      outputVariableMap,
    };
  }

  if (asyncIterables.length) {
    const mergedIterable = Repeater.merge([...dependencyPromises, ...asyncIterables]);
    return mapAsyncIterator(mergedIterable, handleDependencyPromises);
  }
  if (dependencyPromises.length) {
    return Promise.all(dependencyPromises).then(dependencyPromiseResults => {
      const asyncIterablesInResults = dependencyPromiseResults.filter(isAsyncIterable);
      if (asyncIterablesInResults.length) {
        const mergedIterable = Repeater.merge(asyncIterablesInResults);
        return mapAsyncIterator(mergedIterable, handleDependencyPromises);
      }
      return handleDependencyPromises();
    });
  }
  return handleDependencyPromises();
}

export function executeResolverOperationNode({
  resolverOperationNode,
  inputVariableMap,
  onExecute,
  context,
  path,
  errors,
}: {
  resolverOperationNode: ExecutableResolverOperationNode;
  inputVariableMap: Map<string, any>;
  onExecute: OnExecuteFn;
  context: any;
  path: string[];
  errors: GraphQLError[];
}) {
  const variablesForOperation: Record<string, any> = {};
  const inputVarMapWithPreDeps = new Map<string, any>(inputVariableMap);

  function handlePreDepResults() {
    for (const requiredVarName of resolverOperationNode.requiredVariableNames) {
      const varValue = inputVarMapWithPreDeps.get(requiredVarName);
      if (Array.isArray(varValue) && !resolverOperationNode.batch) {
        const promises: PromiseLike<any>[] = [];
        const asyncIterables: AsyncIterable<any>[] = [];
        const results: any[] = [];
        const outputVariableMaps: Map<string, any>[] = [];
        for (const varIndex in varValue) {
          const itemInputVariableMap = new Map();
          for (const [key, value] of inputVarMapWithPreDeps) {
            itemInputVariableMap.set(key, Array.isArray(value) ? value[varIndex] : value);
          }
          const itemResult$ = executeResolverOperationNode({
            resolverOperationNode,
            inputVariableMap: itemInputVariableMap,
            onExecute,
            context,
            path: [...path, varIndex],
            errors,
          });
          function handleItemResult(itemResult: any) {
            if (itemResult != null) {
              results[varIndex] = itemResult.exported;
              outputVariableMaps[varIndex] = itemResult.outputVariableMap;
            }
          }
          if (isAsyncIterable(itemResult$)) {
            asyncIterables.push(
              mapAsyncIterator(itemResult$ as AsyncIterableIterator<any>, handleItemResult),
            );
          } else if (isPromise(itemResult$)) {
            promises.push(itemResult$.then(handleItemResult));
          } else {
            handleItemResult(itemResult$);
          }
        }
        function handleResults() {
          const outputVariableMap = new Map();
          for (const outputVariableMapItem of outputVariableMaps) {
            for (const [key, value] of outputVariableMapItem) {
              let existing = outputVariableMap.get(key);
              if (!existing) {
                existing = [];
                outputVariableMap.set(key, existing);
              }
              existing.push(value);
            }
          }
          return {
            exported: results,
            listed: true,
            outputVariableMap,
          };
        }
        if (asyncIterables.length) {
          const mergedIterable = Repeater.merge([...promises, ...asyncIterables]);
          return mapAsyncIterator(mergedIterable, handleResults);
        }
        if (promises.length) {
          return Promise.all(promises).then(handleResults);
        }
        return handleResults();
      }
      if (varValue != null) {
        variablesForOperation[requiredVarName] = varValue;
      }
    }

    const result$ = onExecute(
      resolverOperationNode.subgraph,
      resolverOperationNode.resolverOperationDocument,
      variablesForOperation,
      context,
    );

    function handleResult(result: any) {
      result?.errors?.forEach((error: any) => {
        error = deserializeGraphQLError(error);
        const errorPath = [
          ...path,
          ...(error.path?.filter((p: number | string) => p.toString() !== '__export') || []),
        ];
        error = relocatedError(error, errorPath);
        error.extensions ||= {};
        error.extensions.planNodeId = resolverOperationNode.id;
        errors.push(error);
      });
      if (result?.data == null) {
        return null;
      }
      const outputVariableMap = new Map();
      const exported = _.get(result.data, resolverOperationNode.exportPath);
      function handleExportedListForBatching(exportedList: any) {
        for (const [
          providedVariableName,
          providedVariablePath,
        ] of resolverOperationNode.providedVariablePathMap) {
          const value = arrayGet(exportedList, providedVariablePath);
          outputVariableMap.set(providedVariableName, value);
        }
        return executeResolverOperationNodesWithDependenciesInParallel({
          resolverOperationNodes: resolverOperationNode.batchedResolverDependencies,
          fieldDependencyMap: resolverOperationNode.batchedResolverDependencyFieldMap,
          inputVariableMap: outputVariableMap,
          onExecute,
          obj: exportedList,
          context,
          path,
          errors,
        });
      }
      function handleExportedItem(exportedItem: any) {
        for (const [
          providedVariableName,
          providedVariablePath,
        ] of resolverOperationNode.providedVariablePathMap) {
          const value = arrayGet(exportedItem, providedVariablePath);
          outputVariableMap.set(providedVariableName, value);
        }
        return executeResolverOperationNodesWithDependenciesInParallel({
          resolverOperationNodes: resolverOperationNode.resolverDependencies,
          fieldDependencyMap: resolverOperationNode.resolverDependencyFieldMap,
          inputVariableMap: outputVariableMap,
          onExecute,
          obj: exportedItem,
          context,
          path,
          errors,
        });
      }
      let depsResult$: PromiseLike<any> | any;
      if (Array.isArray(exported)) {
        const depsAsyncIterables: AsyncIterable<any>[] = [];
        const depsResultPromises: PromiseLike<any>[] = [];
        const exportedListForBatching$ = handleExportedListForBatching(exported);
        if (isAsyncIterable(exportedListForBatching$)) {
          depsAsyncIterables.push(exportedListForBatching$);
        } else if (isPromise(exportedListForBatching$)) {
          depsResultPromises.push(exportedListForBatching$);
        }
        for (const exportedItem of exported) {
          const depsResultItem$ = handleExportedItem(exportedItem);
          if (isAsyncIterable(depsResultItem$)) {
            depsAsyncIterables.push(depsResultItem$);
          } else if (isPromise(depsResultItem$)) {
            depsResultPromises.push(depsResultItem$);
          }
        }
        if (depsAsyncIterables.length) {
          depsResult$ = Repeater.merge([...depsResultPromises, ...depsAsyncIterables]);
        } else if (depsResultPromises.length) {
          depsResult$ = Promise.all(depsResultPromises);
        }
      } else {
        depsResult$ = handleExportedItem(exported);
      }
      if (isAsyncIterable(depsResult$)) {
        return mapAsyncIterator(depsResult$ as AsyncIterableIterator<any>, () => ({
          exported,
          outputVariableMap,
        }));
      } else if (isPromise(depsResult$)) {
        return depsResult$.then(() => ({
          exported,
          outputVariableMap,
        }));
      }
      return {
        exported,
        outputVariableMap,
      };
    }

    if (resolverOperationNode.defer) {
      return new Repeater(async (push, stop) => {
        await push({
          exported: null,
          outputVariableMap: new Map(),
        });
        try {
          const result = await result$;
          if (isAsyncIterable(result)) {
            for await (const item of result) {
              const handledResult = await handleResult(item);
              if (isAsyncIterable(handledResult)) {
                for await (const item of handledResult) {
                  await push(item);
                }
              } else {
                await push(handledResult);
              }
            }
          }
          const handledResult = await handleResult(result);
          if (isAsyncIterable(handledResult)) {
            for await (const item of handledResult) {
              await push(item);
            }
          } else {
            await push(handledResult);
          }
          return stop();
        } catch (e) {
          return stop(e);
        }
      }) as AsyncIterableIterator<any>;
    }

    if (isAsyncIterable(result$)) {
      return mapAsyncIterator(result$ as AsyncIterableIterator<any>, handleResult);
    }

    if (isPromise(result$)) {
      return result$.then(result => {
        if (isAsyncIterable(result)) {
          return mapAsyncIterator(result as AsyncIterableIterator<any>, handleResult);
        }
        return handleResult(result);
      });
    }

    return handleResult(result$);
  }

  const preDepPromises: PromiseLike<any>[] = [];

  function handlePreDepResultItem(preDepResult: {
    exported: any;
    outputVariableMap: Map<any, any>;
  }) {
    preDepResult.outputVariableMap.forEach((value, key) => {
      inputVarMapWithPreDeps.set(key, value);
    });
  }

  for (const preDependencyNode of resolverOperationNode.resolverPreDependencies) {
    const preDepResult$ = executeResolverOperationNode({
      resolverOperationNode: preDependencyNode,
      inputVariableMap,
      onExecute,
      context,
      path,
      errors,
    });
    if (isPromise(preDepResult$)) {
      preDepPromises.push(
        preDepResult$.then(res => {
          if (isAsyncIterable(res)) {
            throw new Error('AsyncIterable not supported for preDepResult');
          }
          return handlePreDepResultItem(res);
        }),
      );
    } else if (isAsyncIterable(preDepResult$)) {
      throw new Error('AsyncIterable not supported for preDepResult');
    } else {
      handlePreDepResultItem(preDepResult$);
    }
  }

  if (preDepPromises.length) {
    return Promise.all(preDepPromises).then(handlePreDepResults);
  }

  return handlePreDepResults();
}

// TODO: Maybe can be implemented in a better way
function arrayGet(obj: any, path: string[], setIfEmpty: 'object' | 'array' | false = false): any {
  if (Array.isArray(obj)) {
    return obj.map(item => arrayGet(item, path, setIfEmpty));
  }
  if (path.length === 1) {
    const existingVal = _.get(obj, path);
    if (existingVal == null && setIfEmpty) {
      const newVal = setIfEmpty === 'array' ? [] : {};
      _.set(obj, path, newVal);
      return newVal;
    }
    return existingVal;
  }
  return arrayGet(_.get(obj, path[0]), path.slice(1), setIfEmpty);
}
